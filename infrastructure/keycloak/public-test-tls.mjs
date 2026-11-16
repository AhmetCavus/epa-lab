import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

// Fixed-authority test PKI. The CA is trusted only by temporary clients/profiles;
// the separate leaf is explicitly a server certificate, never a CA endpoint.
export async function publicTestTls(directory) {
  const caFile = join(directory, 'test-ca.pem');
  const caKey = join(directory, 'test-ca-key.pem');
  const certFile = join(directory, 'test-cert.pem');
  const keyFile = join(directory, 'test-key.pem');
  const csr = join(directory, 'test-leaf.csr');
  const extensions = join(directory, 'test-leaf.ext');
  const openssl = (...args) => execFileSync('openssl', args, { stdio: 'ignore' });
  openssl(
    'req',
    '-x509',
    '-newkey',
    'rsa:2048',
    '-nodes',
    '-days',
    '1',
    '-subj',
    '/CN=Isolated Playground Test CA',
    '-addext',
    'basicConstraints=critical,CA:TRUE',
    '-addext',
    'keyUsage=critical,keyCertSign,cRLSign',
    '-keyout',
    caKey,
    '-out',
    caFile,
  );
  openssl(
    'req',
    '-new',
    '-newkey',
    'rsa:2048',
    '-nodes',
    '-subj',
    '/CN=auth-playground.yappai.de',
    '-keyout',
    keyFile,
    '-out',
    csr,
  );
  await writeFile(
    extensions,
    'basicConstraints=critical,CA:FALSE\nkeyUsage=critical,digitalSignature,keyEncipherment\nextendedKeyUsage=serverAuth\nsubjectAltName=DNS:auth-playground.yappai.de\n',
    { mode: 0o600 },
  );
  openssl(
    'x509',
    '-req',
    '-in',
    csr,
    '-CA',
    caFile,
    '-CAkey',
    caKey,
    '-CAcreateserial',
    '-days',
    '1',
    '-extfile',
    extensions,
    '-out',
    certFile,
  );
  return { cert: await readFile(caFile), leaf: await readFile(certFile), keyFile };
}
