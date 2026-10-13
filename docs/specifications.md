# Spezifikationen, Traceability und Abweichungen

Die HTTP-Baseline ist unveränderlich auf
[ePA-Basic, Tag ePA-3.1.3, I_Authorization_Service.yaml](https://github.com/gematik/ePA-Basic/blob/ePA-3.1.3/src/openapi/I_Authorization_Service.yaml)
festgelegt. Die Datei nennt Interface-Version **1.9.1**. Der Controller wurde nach Prüfung
dieser Quelle implementiert. Andere Operationen und die produktive `servers`-Adresse aus
dem Vertrag sind keine aktive Demo-Konfiguration.

Ergänzend wurden die zum Recherchezeitpunkt 10.10.2026 erreichbaren `latest`-Dokumente
zu [gemSpec_ePA_FdV](https://gemspec.gematik.de/docs/gemSpec/gemSpec_ePA_FdV/latest/index.html)
und [gemSpec_Aktensystem_ePAfueralle](https://gemspec.gematik.de/docs/gemSpec/gemSpec_Aktensystem_ePAfueralle/latest/)
geprüft. Diese URLs sind beweglich; sie ersetzen die gepinnte HTTP-Baseline nicht.
Neuere Anforderungen werden ergänzend erfasst, ohne zukünftige Milestones vorwegzunehmen.

In der Matrix bezeichnet `Implemented in demo` ausschließlich den angegebenen Demo-Teil.
`Partially implemented` und `Not implemented` kennzeichnen fehlende normative Anteile.
Dies ist keine vollständige Konformitätsbewertung und keine Zertifizierung.

## Requirement Traceability

Alle Implementation- und Testpfade sind vom Repository-Verzeichnis aus erreichbar.

| Requirement                                                                                                                                          | Description                                                                                                                                                            | Implementation                                                                                                                                                                                                                                                                          | Test                                                                                                                                                                                                                                             | Status                |
| ---------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------- |
| [A_24830](https://gemspec.gematik.de/docs/gemSpec/gemSpec_ePA_FdV/latest/index.html)                                                                 | FdV startet Nutzerauthentisierung über `sendAuthorizationRequestFdV`. Der Endpoint ist vorhanden; ein FdV selbst fehlt.                                                | [Controller](../services/epa-authorization/src/authorization/authorization.controller.ts)                                                                                                                                                                                               | [HTTP Contract](../services/epa-authorization/test/authorization.http.spec.ts), [echte Integration](../services/epa-authorization/test/keycloak.integration.ts)                                                                                  | Partially implemented |
| [A_25717-03](https://gemspec.gematik.de/docs/gemSpec/gemSpec_Aktensystem_ePAfueralle/latest/)                                                        | PAR an ausgewählten sektoralen IDP; vorgeschriebene TI-Scopes, LoA und registrierte Redirect URI. Demo realisiert Standard-PAR und Redirect-Auswahl, ohne TI-Semantik. | [AuthorizationService](../services/epa-authorization/src/authorization/authorization.service.ts), [ParService](../services/epa-authorization/src/oidc/par.service.ts)                                                                                                                   | [PAR Unit](../services/epa-authorization/src/oidc/par.service.spec.ts), [Keycloak Integration](../services/epa-authorization/test/keycloak.integration.ts)                                                                                       | Partially implemented |
| [I_Authorization_Service: sendAuthorizationRequestFdV](https://github.com/gematik/ePA-Basic/blob/ePA-3.1.3/src/openapi/I_Authorization_Service.yaml) | GET, Header-Schema, Redirect und Errors. Gastmodi, VAU und autorisierte Session-Zustände fehlen.                                                                       | [Header Validation](../services/epa-authorization/src/authorization/authorization-request.ts), [Controller](../services/epa-authorization/src/authorization/authorization.controller.ts), [Error Filter](../services/epa-authorization/src/common/errors/authorization-error.filter.ts) | [HTTP Contract](../services/epa-authorization/test/authorization.http.spec.ts)                                                                                                                                                                   | Partially implemented |
| [RFC 9126 §2, §4](https://www.rfc-editor.org/rfc/rfc9126.html)                                                                                       | Authentisierter form-urlencoded PAR, 201 JSON, gültige Referenz und positive Expiry; Frontchannel mit Referenz. TLS fehlt bewusst lokal.                               | [ParService](../services/epa-authorization/src/oidc/par.service.ts), [OIDC Transport](../services/epa-authorization/src/oidc/oidc-client.service.ts), [AuthorizationService](../services/epa-authorization/src/authorization/authorization.service.ts)                                  | [PAR Unit](../services/epa-authorization/src/oidc/par.service.spec.ts), [Transport Unit](../services/epa-authorization/src/oidc/oidc-client.service.spec.ts), [Keycloak Integration](../services/epa-authorization/test/keycloak.integration.ts) | Partially implemented |
| [RFC 9126 §5: Discovery](https://www.rfc-editor.org/rfc/rfc9126.html)                                                                                | PAR Endpoint durch Provider-Metadata ermitteln; keine festen Keycloak-Pfade in der Runtime.                                                                            | [Discovery](../services/epa-authorization/src/oidc/oidc-discovery.service.ts)                                                                                                                                                                                                           | [Discovery Unit](../services/epa-authorization/src/oidc/oidc-discovery.service.spec.ts), [Integration](../services/epa-authorization/test/keycloak.integration.ts)                                                                               | Implemented in demo   |
| [RFC 7636: S256](https://www.rfc-editor.org/rfc/rfc7636.html)                                                                                        | Sicheren Verifier erzeugen und SHA-256/Base64URL-Challenge senden; Code Exchange ist noch ausgeschlossen.                                                              | [Authorization Transaction](../services/epa-authorization/src/oidc/authorization-transaction.ts)                                                                                                                                                                                        | [RFC-Testvektor und Zufallswerte](../services/epa-authorization/src/oidc/authorization-transaction.spec.ts)                                                                                                                                      | Partially implemented |
| Pinned OpenAPI: UserAgentType / RequestIdType                                                                                                        | Pflicht-User-Agent im festgelegten Format; optionale UUID exakt in Antworten und Logs erhalten.                                                                        | [Header Validation](../services/epa-authorization/src/authorization/authorization-request.ts), [Request Logging](../services/epa-authorization/src/common/logging/request-logging.ts)                                                                                                   | [HTTP Contract](../services/epa-authorization/test/authorization.http.spec.ts)                                                                                                                                                                   | Implemented in demo   |
| Pinned OpenAPI: Redirect-Auswahl und `invalRedir`                                                                                                    | Default bei fehlendem Header, exakte Allowlist bei vorhandenem Header. Keine TI Entity Statements.                                                                     | [AuthorizationService](../services/epa-authorization/src/authorization/authorization.service.ts), [Realm](../infrastructure/keycloak/epa-demo-realm.json)                                                                                                                               | [HTTP Contract](../services/epa-authorization/test/authorization.http.spec.ts), [Integration](../services/epa-authorization/test/keycloak.integration.ts)                                                                                        | Partially implemented |
| [A_24878-01 / A_26189-01](https://gemspec.gematik.de/docs/gemSpec/gemSpec_Aktensystem_ePAfueralle/latest/)                                           | Representative-/eGK-Gastauthentisierung einschließlich sektoraler `amr`-Semantik. Explizite Ablehnung im Demo.                                                         | [Header Validation](../services/epa-authorization/src/authorization/authorization-request.ts)                                                                                                                                                                                           | [HTTP Guest-Rejections](../services/epa-authorization/test/authorization.http.spec.ts)                                                                                                                                                           | Not implemented       |
| TI-spezifische Scopes, `acr_values`, Entity Statements                                                                                               | Versichertenattribute, LoA-high und Föderationsvertrauen nachweisen.                                                                                                   | Keine Umsetzung; `ParService` verwendet ausschließlich `openid`.                                                                                                                                                                                                                        | Keine Konformitätstests; [PAR Unit](../services/epa-authorization/src/oidc/par.service.spec.ts) prüft bewusst den Demo-Payload.                                                                                                                  | Not implemented       |
| PAR-Pflicht des Demo-Clients                                                                                                                         | Vorhandene Keycloak Client Policy erzwingt echte PAR-Referenz; S256 im Client vorgeschrieben.                                                                          | [Realm / Client Policy](../infrastructure/keycloak/epa-demo-realm.json)                                                                                                                                                                                                                 | [echte Non-PAR-Ablehnung](../services/epa-authorization/test/keycloak.integration.ts)                                                                                                                                                            | Implemented in demo   |
| VAU, TI-Föderation, Device Attestation und User Session                                                                                              | Weitere normative Teile einer echten ePA-Implementierung.                                                                                                              | Keine Umsetzung in M1.                                                                                                                                                                                                                                                                  | Keine Konformitätstests.                                                                                                                                                                                                                         | Not implemented       |
| Android-Implementierung in M1                                                                                                                        | Projektbesitzer implementiert das FdV unabhängig; nur leeres Verzeichnis erforderlich.                                                                                 | [Android-Verzeichnis](../apps/fdv-android/) enthält nur `.gitkeep`.                                                                                                                                                                                                                     | Abschließende Dateisystemprüfung.                                                                                                                                                                                                                | Not applicable        |

## Gepinnter HTTP-Vertrag

Der implementierte Pfad ist `GET /epa/authz/v1/send_authorization_request_fdv`.
Pflichtheader sind `x-idp-iss` und `x-useragent`. Das User-Agent-Schema erlaubt 1–20
alphanumerische Zeichen/Bindestriche für die Client-ID sowie 1–15 alphanumerische Zeichen,
Bindestriche oder Punkte für die Version, getrennt durch `/`.
`X-Request-ID` ist optional und hat UUID-Format. Die Antwort verwendet `errorCode` und
optionales `errorDetail` statt des NestJS-Standardfehlers.

| Fall                                                                                            | HTTP | errorCode          | Demo-Verhalten                                                                                                       |
| ----------------------------------------------------------------------------------------------- | ---- | ------------------ | -------------------------------------------------------------------------------------------------------------------- |
| Gültiger initialer Request und akzeptierter PAR                                                 | 302  | —                  | Leerer Body, `Location` und Request-ID                                                                               |
| Fehlende / fehlerhafte Header, ungültige UUID                                                   | 400  | `malformedRequest` | Vor Discovery ablehnen                                                                                               |
| Nicht konfigurierte / ungültige Issuer-ID                                                       | 404  | `noResource`       | Kein Request an die eingereichte URL                                                                                 |
| Nicht allowlistete Redirect URI                                                                 | 403  | `invalRedir`       | Exakter Vergleich vor Discovery                                                                                      |
| Bekannte OAuth Authorization-Rejection                                                          | 403  | `invalAuth`        | Nur kontrollierte Codes `invalid_request`, `invalid_scope`, `invalid_redirect_uri`, `access_denied` aus 400/403 JSON |
| Ein unterstützungsbedürftiger Gastmodus auf `true`                                              | 403  | `invalAuth`        | Explizite M1-Einschränkung; kein normaler Login als Ersatz                                                           |
| Beide Gastmodi auf `true`; `false` / andere Werte                                               | 400  | `malformedRequest` | Contract-Konflikt beziehungsweise Verletzung von `enum: [true]`                                                      |
| Netzwerkfehler, Timeout, ungültige Metadata / PAR-Antwort, Client-Credential- oder Serverfehler | 500  | `internalError`    | Sanitierte Beschreibung; keine Weitergabe von Provider-Body oder Secrets                                             |
| Bereits autorisierte User Session                                                               | 409  | `statusMismatch`   | Nicht umgesetzt: M1 erzeugt keine autorisierten Sessions                                                             |

Ungültige `x-idp-iss`-Werte ergeben gemäß Operationstabelle 404, während fehlende Pflichtheader
400 ergeben. Die Demo erlaubt zusätzliche nicht relevante HTTP-Header, lehnt aber
Query-Parameter ab; diese zusätzliche Einschränkung ist kein normativer Gematik-Mechanismus.

## Location-Abweichung

`AuthorizationResponseFdV302` der Baseline beschreibt `clientid`, `request_uri` und `state`.
Die Demo verwendet gemäß [RFC 9126 §4](https://www.rfc-editor.org/rfc/rfc9126.html)
und Keycloak **`client_id` und `request_uri`**. `state` liegt ausschließlich im gepushten
Request. Es wird weder die Schreibweise `clientid` übernommen noch ein redundantes äußeres
`state` angehängt. Das ist eine ausdrücklich dokumentierte Contract-Abweichung. Die echte
Integration belegt die Interoperabilität mit Keycloak, nicht mit einem TI-IDP.

Der Keycloak-PAR liefert 201 JSON; die äußere FdV-Operation liefert 302 Location.
Der Server folgt dieser äußeren Weiterleitung nie. Im Integrationstest übernimmt nur der
Testclient den Frontchannel und Keycloaks interne Login-Redirects, mit neuen Cookies pro
Test und einer begrenzten Zahl von Redirects.

## Ergänzende neuere Spezifikation

`A_24830` adressiert das FdV selbst, weshalb der Backend-Endpoint allein die Anforderung
nicht vollständig erfüllen kann. Die aktuelle `A_25717-03` ergänzt beziehungsweise
konkretisiert für den PAR die Scopes `openid`, `urn:telematik:display_name`,
`urn:telematik:versicherter`, `urn:telematik:family_name`, `urn:telematik:given_name`,
`acr_values=gematik-ehealth-loa-high` sowie die Registrierung von Redirect URIs im Entity
Statement. Der gepinnte OpenAPI-Vertrag verweist allgemein auf die Spezifikation und
enthält diese vollständige Parameterliste nicht als eigenes PAR-HTTP-Schema.

Diese sektoralen Werte werden bewusst nicht als bloße Strings in einen gewöhnlichen
Keycloak-Realm eingebaut. Der Demo-Payload beschränkt sich auf `openid`; es gibt keine
Bestätigung einer Versichertenidentität oder eines TI LoA-high. Die aktuelle Spezifikation
beschreibt daneben unter anderem Redirect-URI-Synchronisierung und spätere LoA-Prüfung
in ID Tokens. Diese Ergänzungen liegen ebenfalls außerhalb der HTTP-Baseline und M1.
Der `latest`-Inhalt muss vor zukünftigen Milestones erneut geprüft und versioniert werden.

## Keycloak statt eines echten sektoralen IDP

Keycloak stellt OIDC Discovery, confidential Client Authentication, PKCE und PAR bereit.
Es implementiert in diesem Realm weder TI-Föderation noch sektorale Trust Chains,
Entity Statement Validation, eGK/PIN-Semantik, echte KVNR-Prüfung oder VAU.
Eine lokale Passwortidentität ist kein sektoraler Versichertennachweis.

Der Import nutzt dokumentierte Client Policies. Die Namen und Erzwingung wurden gegen
den Keycloak-Tag **26.8.0** geprüft:
[Client Roles Condition](https://github.com/keycloak/keycloak/blob/26.8.0/services/src/main/java/org/keycloak/services/clientpolicy/condition/ClientRolesConditionFactory.java),
[Secure PAR Content Executor](https://github.com/keycloak/keycloak/blob/26.8.0/services/src/main/java/org/keycloak/services/clientpolicy/executor/SecureParContentsExecutor.java).
Das Realm-Discovery-Flag `require_pushed_authorization_requests` ist im getesteten Setup
`false`; die Client-spezifische Policy wird deshalb durch tatsächliche Non-PAR-Ablehnung
und nicht durch dieses Flag nachgewiesen.

Die Demo verlangt außerdem Endpoints auf derselben Origin, JSON-Antworten bis 64 KiB,
finite Deadlines und exakte Redirect-Allowlisting. Diese lokalen Sicherheitsentscheidungen
ersetzen keine TI-Vertrauensprüfung. Die lokale HTTP-Ausnahme erfüllt nicht das TLS-Gebot
für einen produktiven OAuth/PAR-Betrieb.

Für das isolierte Entwicklungs-LAN erweitert `OIDC_ALLOW_PRIVATE_NETWORK_HTTP=true` die
HTTP-Ausnahme auf RFC-1918-IPv4-Adressen. Ohne expliziten Opt-in bleiben nur Loopback-HTTP
und HTTPS erlaubt. Die Tests in `configuration.validation.spec.ts` und
`oidc-discovery.service.spec.ts` prüfen die Grenze; öffentliche HTTP-Adressen und Link-Local
bleiben ausgeschlossen. Die Netzwerkoption begründet keine zusätzliche Gematik-Konformität.
