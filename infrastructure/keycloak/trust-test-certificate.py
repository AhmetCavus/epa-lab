"""Trust a test CA only in the caller's temporary Firefox profile (no system changes)."""

import ctypes
import sys
import ssl
from pathlib import Path

profile = Path(sys.argv[1]).resolve()
certificate = ssl.PEM_cert_to_DER_cert(Path(sys.argv[2]).read_text())
if not profile.is_relative_to(Path('/tmp')) or not profile.is_dir():
    raise RuntimeError('A pre-created temporary browser profile is required')

nss = ctypes.CDLL('libnss3.so')
nss.NSS_InitReadWrite.argtypes = [ctypes.c_char_p]
nss.NSS_InitReadWrite.restype = ctypes.c_int
nss.CERT_DestroyCertificate.argtypes = [ctypes.c_void_p]


class SecurityItem(ctypes.Structure):
    _fields_ = [('type', ctypes.c_uint), ('data', ctypes.c_void_p), ('length', ctypes.c_uint)]


nss.CERT_GetDefaultCertDB.restype = ctypes.c_void_p
nss.CERT_NewTempCertificate.argtypes = [ctypes.c_void_p, ctypes.POINTER(SecurityItem),
                                       ctypes.c_char_p, ctypes.c_int, ctypes.c_int]
nss.CERT_NewTempCertificate.restype = ctypes.c_void_p


class CertificateTrust(ctypes.Structure):
    # CERTCertTrustStr from the installed /usr/include/nss/certt.h.
    _fields_ = [('sslFlags', ctypes.c_uint), ('emailFlags', ctypes.c_uint),
                ('objectSigningFlags', ctypes.c_uint)]


nss.PK11_ImportCert.argtypes = [ctypes.c_void_p, ctypes.c_void_p, ctypes.c_ulong, ctypes.c_char_p, ctypes.c_int]
nss.CERT_ChangeCertTrust.argtypes = [ctypes.c_void_p, ctypes.c_void_p, ctypes.POINTER(CertificateTrust)]
if nss.NSS_InitReadWrite(('sql:' + str(profile)).encode()) != 0:
    raise RuntimeError('Temporary test certificate database initialization failed')
try:
    nss.PK11_GetInternalKeySlot.restype = ctypes.c_void_p
    nss.PK11_NeedUserInit.argtypes = [ctypes.c_void_p]
    nss.PK11_InitPin.argtypes = [ctypes.c_void_p, ctypes.c_char_p, ctypes.c_char_p]
    nss.PK11_FreeSlot.argtypes = [ctypes.c_void_p]
    slot = nss.PK11_GetInternalKeySlot()
    if nss.PK11_NeedUserInit(slot) and nss.PK11_InitPin(slot, None, b'') != 0:
        raise RuntimeError('Temporary certificate slot initialization failed')
    buffer = ctypes.create_string_buffer(certificate)
    item = SecurityItem(0, ctypes.cast(buffer, ctypes.c_void_p), len(certificate))
    decoded = nss.CERT_NewTempCertificate(nss.CERT_GetDefaultCertDB(), ctypes.byref(item), None, 0, 1)
    if not decoded:
        raise RuntimeError('Test certificate decoding failed')
    try:
        # CERTDB_VALID_CA | CERTDB_TRUSTED_CA; only SSL server issuance is trusted.
        trust = CertificateTrust((1 << 3) | (1 << 4), 0, 0)
        imported = nss.PK11_ImportCert(slot, decoded, 0, b'Isolated playground test CA', 0)
        if imported != 0 or nss.CERT_ChangeCertTrust(nss.CERT_GetDefaultCertDB(), decoded, ctypes.byref(trust)) != 0:
            error = ctypes.CDLL('libnspr4.so').PR_GetError()
            raise RuntimeError(f'Temporary test CA import failed ({error})')
    finally:
        nss.CERT_DestroyCertificate(decoded)
        nss.PK11_FreeSlot(slot)
finally:
    nss.NSS_Shutdown()
