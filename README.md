# ePA Authentication Lab

Unabhängige Lern- und Referenzimplementierung für das Yappai-Ökosystem. Milestone 1 zeigt,
wie ein ePA Authorization Server einen Authorization Request per **Pushed Authorization
Requests (PAR)** an einen OpenID Provider übermittelt und die Referenz an einen zukünftigen
FdV zurückgibt. Grundlage sind öffentliche Spezifikationen; das Projekt ist kein
gematik-zertifiziertes ePA-Produkt.

Der Workspace-Ordner ist das Repository `epa-auth-lab`; ein zusätzliches verschachteltes
Projektverzeichnis wird nicht benötigt.

## Komponenten und Umfang

| Komponente                    | Rolle                                                       | Umsetzung                                                                                    |
| ----------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `services/epa-authorization/` | ePA Authorization Demo; OAuth/OIDC Client gegenüber dem IDP | NestJS 11, Express, TypeScript strict                                                        |
| `infrastructure/keycloak/`    | Lokaler OpenID Provider als vereinfachter sektoraler IDP    | Keycloak **26.8.0**, Realm `epa-demo`, confidential Client `epa-auth-server`                 |
| `apps/fdv-android/`           | Zukünftiges FdV                                             | Nur `.gitkeep`; keine Android-Implementierung                                                |
| `docs/`                       | Architektur und Spezifikationsnachweise                     | [Architektur](docs/architecture.md), [Traceability und Abweichungen](docs/specifications.md) |

Weitere Werkzeuge: Node.js **24 LTS**, pnpm **10.34.6**, Docker Compose, `@nestjs/config`,
Zod, Jest und Supertest. Der Backend-Prozess läuft auf dem Host; Docker betreibt ausschließlich
Keycloak mit der lokalen Entwicklungsdatenbank `dev-file`.

Der Ablauf endet bei einem akzeptierten PAR und dem Keycloak-Loginformular. Es gibt keinen
Authorization-Code-Callback, keinen Code Exchange, keine Tokenvalidierung und keine
authentisierte ePA User Session. VAU, TI-Föderation, reale sektorale IDPs, Authenticator,
Gerätebindung und medizinische Daten sind außerhalb dieses Milestones.

## Voraussetzungen und Installation

Benötigt werden Node.js 24, Corepack beziehungsweise pnpm, Docker Engine mit Compose v2
oder neuer und freie lokale Ports 8080 und 3000. Die Scripts funktionieren unter Linux/macOS.

Im Repository-Verzeichnis ausführen:

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm env:init
pnpm infra:up
pnpm dev
```

`env:init` erzeugt `.env` aus [`.env.example`](.env.example) mit zufälligen lokalen Passwörtern
und Client Secret. Eine vorhandene `.env` wird erhalten. Die Datei wird mit Modus `0600`
angelegt und ist durch `.gitignore` ausgeschlossen. Alternativ `.env.example` nach `.env`
kopieren und die drei leeren Secret-Felder selbst mit unabhängigen Werten füllen.

`infra:up` wartet auf Keycloaks Readiness; Realm, Client, Client Policy und Testidentität werden
automatisch importiert. Die dokumentierten Grundlagen sind [Keycloaks Containerbetrieb](https://www.keycloak.org/server/containers)
und [Realm-Import mit Environment-Variablen](https://www.keycloak.org/server/importExport).

NestJS ist unter `http://localhost:3000`, Keycloak unter `http://localhost:8080` erreichbar.
Beide Host-Ports sind an `127.0.0.1` gebunden. Der feste Keycloak-Hostname hält Browser,
Discovery und Backend auf demselben Issuer.

## Environment-Konfiguration

NestJS liest `.env` aus dem Repository-Verzeichnis unabhängig vom Arbeitsverzeichnis des
Service. Vorhandene Prozessvariablen haben Vorrang. Ungültige Konfiguration stoppt den Start;
Validierungsfehler nennen ausschließlich die betroffenen Feldnamen.

| Variable                      | Bedeutung / Standard                                                             |
| ----------------------------- | -------------------------------------------------------------------------------- |
| `KEYCLOAK_ADMIN_USERNAME`     | Lokaler Bootstrap-Administrator, Beispiel `epa-lab-admin`                        |
| `KEYCLOAK_ADMIN_PASSWORD`     | Zufälliges lokales Admin-Passwort                                                |
| `OIDC_CLIENT_SECRET`          | Server-seitiges Secret, mindestens 16 Zeichen                                    |
| `TEST_USER_PASSWORD`          | Passwort der fiktiven Identität `demo-versicherte`                               |
| `PORT`                        | NestJS-Port, `3000`                                                              |
| `OIDC_ISSUER`                 | Exakt `http://localhost:8080/realms/epa-demo` im mitgelieferten Compose-Setup    |
| `OIDC_CLIENT_ID`              | `epa-auth-server`; wird auch in den Realm-Import eingesetzt                      |
| `OIDC_DEFAULT_REDIRECT_URI`   | `http://localhost:3000/callback`; registriert, aber ohne implementierten Handler |
| `OIDC_ALLOWED_REDIRECT_URIS`  | JSON-Array exakter URIs, initial `["http://localhost:3000/callback"]`            |
| `OIDC_HTTP_TIMEOUT_MS`        | Discovery-/PAR-Deadline einschließlich Response Body, `5000`                     |
| `OIDC_DISCOVERY_CACHE_TTL_MS` | Metadaten-Cache, `300000`                                                        |

HTTP-Konfiguration ist nur für Loopback erlaubt; sonst ist HTTPS erforderlich. Credentials
in URLs, Fragmente, Wildcards und ein Default Redirect außerhalb der Allowlist werden
abgelehnt. Discovery darf nur Endpoints derselben Origin ohne Query-Parameter liefern.

Zusätzliche Redirect URIs müssen **sowohl** in `OIDC_ALLOWED_REDIRECT_URIS` **als auch** in
`clients[].redirectUris` der Realm-Datei explizit eingetragen werden. Der Import registriert
automatisch nur `OIDC_DEFAULT_REDIRECT_URI`. Danach die lokale Infrastruktur zurücksetzen.
Ein Backend-Allowlist-Eintrag allein ist keine Registrierung beim IDP. Das entspricht im Demo
keiner Registrierung in einem TI Entity Statement.

## Befehle

| Befehl                           | Zweck                                                                  |
| -------------------------------- | ---------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile` | Dependencies aus dem versionierten Lockfile installieren               |
| `pnpm env:init`                  | Lokale Konfiguration ohne Überschreiben erzeugen                       |
| `pnpm infra:up`                  | Keycloak starten und Readiness abwarten                                |
| `pnpm infra:down`                | Keycloak stoppen; Entwicklungsdaten bleiben erhalten                   |
| `pnpm infra:reset`               | Container und **lokales Keycloak-Datenvolume löschen**                 |
| `pnpm dev`                       | Backend zunächst bauen, dann Compiler und Server im Watch Mode starten |
| `pnpm build`                     | Ausführbares Backend nach `services/epa-authorization/dist/` bauen     |
| `pnpm start`                     | Bereits gebautes Backend starten                                       |
| `pnpm typecheck`                 | Alle Source- und Testdateien mit TypeScript strict prüfen              |
| `pnpm lint`                      | Type-aware ESLint und Prettier-Prüfung                                 |
| `pnpm format`                    | Formatierung anwenden                                                  |
| `pnpm test`                      | Unit- und HTTP-Contract-Tests ohne Docker                              |
| `pnpm test:integration`          | Echte Keycloak-Integration; Keycloak muss bereit sein                  |

Beim erneuten Start bleibt ein vorhandener Realm erhalten und wird nicht überschrieben.
Änderungen an importierten Secrets, Client-Einstellungen oder Redirect URIs erfordern einen
Reset oder eine gezielte administrative Änderung. Für eine saubere Neuinitialisierung:

```bash
pnpm infra:reset
pnpm infra:up
```

`.env` bleibt beim Reset erhalten. Keine manuellen Admin-Console-Schritte sind erforderlich.

## Manueller Smoke-Test

Mit laufendem Backend die äußere Antwort ohne automatisches Folgen der Weiterleitung prüfen:

```bash
curl --silent --show-error --dump-header - --output /dev/null \
  'http://localhost:3000/epa/authz/v1/send_authorization_request_fdv' \
  --header 'x-idp-iss: http://localhost:8080/realms/epa-demo' \
  --header 'x-useragent: EPA-AUTH-LAB/0.1.0' \
  --header 'X-Request-ID: f4411e89-2eca-405c-88a1-7ee20b9b6e3c'
```

Erwartet werden `HTTP/1.1 302 Found`, dieselbe `X-Request-ID`, `Cache-Control: no-store`
und eine `Location` auf den entdeckten Keycloak Authorization Endpoint. Deren Query enthält
`client_id=epa-auth-server` und die URL-kodierte, tatsächlich von Keycloak ausgestellte
`request_uri`. Der Body ist leer. `curl -L` hier nicht verwenden.

Die Location unmittelbar und einmalig im Browser öffnen: Keycloak kann intern auf
`login-actions/authenticate` weiterleiten und zeigt dann sein echtes Loginformular.
Die Referenz ist kurzlebig und wird beim Aufruf verbraucht; bei Ablauf oder erneutem Aufruf
einen neuen initialen Request senden. Authentisierung nicht abschließen: Der registrierte
Callback ist in M1 bewusst nicht implementiert und würde mit 404 enden. Das Passwort der
Testidentität ist für spätere Milestones in der lokalen `.env` vorhanden.

Optionale Header: `x-redirecturi` erlaubt ausschließlich registrierte Allowlist-Werte.
`x-authorize-representative: true` oder `x-authorize-egk: true` werden ausdrücklich mit
`403 invalAuth` abgelehnt. Beide gleichzeitig sowie `false`/andere Werte ergeben
`400 malformedRequest`, entsprechend dem Schema `enum: [true]`. Query-Parameter werden
in dieser Demo abgelehnt. Details zur Fehlerabbildung stehen in [specifications.md](docs/specifications.md).

## Automatisierte Prüfung

```bash
pnpm build
pnpm typecheck
pnpm lint
pnpm test
pnpm infra:up
pnpm test:integration
```

Unit-Tests prüfen Konfiguration, Header, Allowlisting, Discovery-Cache, PKCE inklusive
RFC-Testvektor, PAR-Payload und -Antwort, Timeouts, Fehler und geheimnisfreie Logs. Ein
lokaler TCP-Test prüft die tatsächliche Deadline bei einem unvollständigen Response Body.

Die getrennte Integration erstellt eine echte NestJS-Anwendung mit Supertest und echten
OIDC Services. Sie ruft die laufende Keycloak-Instanz auf, erhält eine reale PAR-Referenz
und prüft das echte Loginformular mit frischen Cookies. Sie prüft außerdem PAR-Pflicht,
ungültige Referenzen und fehlende Client Credentials. Es findet kein Benutzerlogin statt.
Erfolg wird nur bei erreichbarem Keycloak gemeldet; es gibt keinen Mock-Fallback und kein
stillschweigendes Überspringen.

## Fehlerbehebung

| Symptom                              | Prüfung / Lösung                                                                                                                |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| Konfigurationsfehler beim Start      | Leere Pflichtfelder füllen; Allowlist als JSON-Array und Default als exakten Eintrag setzen                                     |
| Keycloak startet nicht               | Docker-Berechtigungen und Port 8080 prüfen; `docker compose --env-file .env -f infrastructure/docker-compose.yml logs keycloak` |
| `404 noResource` beim Loginstart     | `x-idp-iss` muss exakt dem konfigurierten Issuer entsprechen, ohne zusätzlichen Slash                                           |
| `403 invalRedir`                     | Backend-Allowlist und Keycloak-Registrierung prüfen                                                                             |
| `500 internalError`                  | Keycloak-Readiness, Discovery, Client Secret und gespeicherten Realm prüfen; Secrets nie in Diagnoseausgaben posten             |
| Loginreferenz ungültig               | Neue Transaktion anfordern; Ablauf und einmalige Nutzung beachten                                                               |
| Discovery meldet PAR-Pflicht `false` | Der Wert ist Realm-Metadata; die Client Policy erzwingt PAR für den markierten Demo-Client und wird separat getestet            |

`GET /health/live` bestätigt den Backend-Prozess. `GET /health/ready` bestätigt validierte
Discovery-Metadata; die Antwort kann aus dem Cache stammen und prüft weder Client Secret
noch kontinuierlich die IDP-Erreichbarkeit. Keycloaks eigener Compose-Healthcheck fragt
den nicht auf den Host veröffentlichten Management-Port 9000 ab.

## Sicherheit und weitere Milestones

Nur isolierte lokale Entwicklung: HTTP ohne TLS und Keycloak `start-dev` sind keine
Produktionskonfiguration. Keine Patientendaten, KVNRs, proprietären SDKs oder produktiven
Credentials verwenden. Backend und Realm sind auf ein Lernexperiment begrenzt; der
fiktive Testnutzer ist keine bestätigte Versichertenidentität.

Nachfolgende Milestones können zunächst das separat entwickelte Android-FdV und den
Authenticator anbinden. Callback, begrenzte Transaction Storage, Code Exchange, ID Token
Validation und Gerätebindung benötigen eigene Implementierung und Tests. TI-Föderation,
Trust Chains und VAU bleiben zusätzliche eigenständige Aufgaben. Der aktuelle Code
behauptet keine gematik-Konformität und erzeugt keinen erfolgreichen Login als Platzhalter.

## Angewandte Workspace-Vorgaben

Vor der Implementierung wurden der leere Workspace, Elternverzeichnisse und verfügbare
Skills untersucht. Es gab keine anwendbare `AGENTS.md` und keine bestehenden Yappio
Auth-, API- oder Persistence-Abstraktionen. Verwendet wurden `clean-code`, `code-formatting`,
`file-structure`, `naming`, `typescript-best-practices` und `yappio-architecture`.
Ein spezifischer NestJS-, Security-, Testing- oder Dokumentations-Skill war im verfügbaren
Katalog nicht vorhanden; hierfür wurden die offiziellen Referenzen und übliche
Engineering-Praktiken verwendet. Die angeforderten Repository-Dokumente wurden direkt
als Markdown erstellt.
