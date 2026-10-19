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
Zod, Jest und Supertest. Im Standard-Workflow läuft der Backend-Prozess auf dem Host und
Keycloak mit der lokalen Entwicklungsdatenbank `dev-file` in Docker. Optional läuft auch
das Backend im Docker-Container mit dem Compose-Profil `backend`.

Die headerbasierte FdV-Operation und die direkten IDP-Requests bleiben PAR-Smoke-Tests.
Die ergänzende Browser-Demo unter `/login` unterstützt Callback, Code Exchange, ID-Token-
Validierung und eine kurzlebige lokale Browser-Session. Diese Session ist keine normative
ePA User Session. VAU, TI-Föderation, reale sektorale IDPs, Authenticator, Gerätebindung
und medizinische Daten sind außerhalb der Demo.

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

Mit den Standardwerten aus `.env.example` ist NestJS unter `http://localhost:3000`,
Keycloak unter `http://localhost:8080` erreichbar. Beide Host-Ports sind standardmäßig
an `127.0.0.1` gebunden. Der feste Keycloak-Hostname hält Browser,
Discovery und Backend auf demselben Issuer.

## Environment-Konfiguration

NestJS liest `.env` aus dem Repository-Verzeichnis unabhängig vom Arbeitsverzeichnis des
Service. Vorhandene Prozessvariablen haben Vorrang. Ungültige Konfiguration stoppt den Start;
Validierungsfehler nennen ausschließlich die betroffenen Feldnamen.

| Variable                          | Bedeutung / Standard                                                                                                      |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `KEYCLOAK_ADMIN_USERNAME`         | Lokaler Bootstrap-Administrator, Beispiel `epa-lab-admin`                                                                 |
| `KEYCLOAK_ADMIN_PASSWORD`         | Zufälliges lokales Admin-Passwort                                                                                         |
| `KEYCLOAK_BIND_ADDRESS`           | Docker Host-Bind-Adresse, standardmäßig `127.0.0.1`                                                                       |
| `KEYCLOAK_PORT`                   | Veröffentlichter Host-Port, standardmäßig `8080`; Container-Port bleibt `8080`                                            |
| `KEYCLOAK_HOSTNAME`               | Vom Browser und Backend erreichbare Keycloak-Basis-URL, standardmäßig `http://localhost:8080`                             |
| `OIDC_CLIENT_SECRET`              | Server-seitiges Secret, mindestens 16 Zeichen                                                                             |
| `TEST_USER_PASSWORD`              | Passwort der fiktiven Identität `demo-versicherte`                                                                        |
| `PORT`                            | NestJS-Port auf dem Host oder im Backend-Container, `3000`                                                                |
| `HOST`                            | NestJS-Bind-Adresse auf dem Host oder im Backend-Container, standardmäßig `127.0.0.1`; `0.0.0.0` für alle IPv4-Interfaces |
| `OIDC_ALLOW_PRIVATE_NETWORK_HTTP` | Explizite HTTP-Ausnahme für private IPv4-Adressen im isolierten Entwicklungs-LAN, standardmäßig `false`                   |
| `OIDC_ISSUER`                     | Exakter Issuer; standardmäßig `http://localhost:8080/realms/epa-demo`, für LAN-Zugriff die erreichbare Server-Adresse     |
| `OIDC_CLIENT_ID`                  | `epa-auth-server`; wird auch in den Realm-Import eingesetzt                                                               |
| `OIDC_DEFAULT_REDIRECT_URI`       | `http://localhost:3000/callback`; für die LAN-Demo `http://192.168.178.131:3000/callback`                                 |
| `OIDC_ALLOWED_REDIRECT_URIS`      | JSON-Array exakter URIs, initial `["http://localhost:3000/callback"]`                                                     |
| `OIDC_HTTP_TIMEOUT_MS`            | Discovery-/PAR-Deadline einschließlich Response Body, `5000`                                                              |
| `OIDC_DISCOVERY_CACHE_TTL_MS`     | Metadaten-Cache, `300000`                                                                                                 |

HTTP-Konfiguration ist standardmäßig nur für Loopback erlaubt; sonst ist HTTPS erforderlich.
Die explizite LAN-Ausnahme erlaubt ausschließlich private IPv4-Adressen aus `10.0.0.0/8`,
`172.16.0.0/12` und `192.168.0.0/16`, keine öffentlichen HTTP-Hosts oder Link-Local-Adressen. Credentials
in URLs, Fragmente, Wildcards und ein Default Redirect außerhalb der Allowlist werden
abgelehnt. Discovery darf nur Endpoints derselben Origin ohne Query-Parameter liefern.

Zusätzliche Redirect URIs müssen **sowohl** in `OIDC_ALLOWED_REDIRECT_URIS` **als auch** in
`clients[].redirectUris` der Realm-Datei explizit eingetragen werden. Der Import registriert
initial nur `OIDC_DEFAULT_REDIRECT_URI`. Bei einem bestehenden Realm die registrierten
Redirect URIs zusätzlich über die Keycloak Admin Console oder Admin API aktualisieren.
Ein Backend-Allowlist-Eintrag allein ist keine Registrierung beim IDP. Das entspricht im Demo
keiner Registrierung in einem TI Entity Statement.

### Zugriff von einem anderen Rechner im Entwicklungs-LAN

Für einen Server mit LAN-Adresse `192.168.178.131` und Keycloak-Host-Port `5555`
die folgenden Werte in `.env` setzen:

```dotenv
HOST=0.0.0.0
KEYCLOAK_BIND_ADDRESS=0.0.0.0
KEYCLOAK_PORT=5555
KEYCLOAK_HOSTNAME=http://192.168.178.131:5555
OIDC_ISSUER=http://192.168.178.131:5555/realms/epa-demo
OIDC_ALLOW_PRIVATE_NETWORK_HTTP=true
OIDC_DEFAULT_REDIRECT_URI=http://192.168.178.131:3000/callback
OIDC_ALLOWED_REDIRECT_URIS=["http://192.168.178.131:3000/callback"]
```

Bei einem bestehenden Realm unter **Clients → epa-auth-server → Settings → Valid Redirect URIs**
den bisherigen Callback durch `http://192.168.178.131:3000/callback` ersetzen. Ein Neustart
überschreibt den vorhandenen Realm nicht; die `.env`-Änderung allein aktualisiert deshalb
keine bereits registrierte Redirect URI.

Danach `pnpm infra:up` ausführen und den Backend-Prozess beziehungsweise die VS-Code-Debug-Session
neu starten. Der laufende Watch Mode übernimmt Änderungen beim nächsten Source-Rebuild.
Für diese Netzwerkänderungen ist kein Datenvolume-Reset erforderlich.

Docker veröffentlicht **Host-Port 5555 auf Container-Port 8080**. `KC_HOSTNAME` steuert die
advertisierten URLs und ändert den internen Listener nicht; siehe die
[Keycloak-Hostname-Dokumentation](https://www.keycloak.org/server/hostname).
Im Browser des anderen Rechners funktionieren dann:

- Keycloak: `http://192.168.178.131:5555/`
- Backend-Liveness: `http://192.168.178.131:3000/health/live`
- Backend-Readiness: `http://192.168.178.131:3000/health/ready`

Der Backend-Pfad `/` hat keinen Handler und liefert 404. Das bedeutet nicht, dass Port 3000
unerreichbar ist. `localhost` bezeichnet im Browser immer dessen eigenen Rechner;
Keycloak-Hostname, `OIDC_ISSUER` und `x-idp-iss` müssen daher dieselbe LAN-Adresse verwenden.
Für den manuellen PAR-Test die URLs und den Issuer-Header des unten stehenden curl-Beispiels
entsprechend ersetzen. Für den vollständigen Browser-Login `/login` am Backend öffnen.

Falls ein Zugriff aus dem LAN trotz passender Listener scheitert, die bestehenden
Firewall-Regeln für TCP 5555 und 3000 sowie die Route zum Server prüfen. Die Anwendung
ändert keine Firewall-Regeln. Dieser HTTP-Modus ist auf ein isoliertes Entwicklungs-LAN begrenzt.

Bei aktivem UFW benötigt der Backend-Listener auf dem Host beziehungsweise mit Host Networking
eine passende eingehende Freigabe. Für das LAN `192.168.178.0/24` und Backend-Port `3000`:

```bash
sudo ufw allow in proto tcp from 192.168.178.0/24 to any port 3000 comment 'ePA lab LAN access'
sudo ufw status verbose
```

Subnetz und Port an das eigene Lab anpassen. Den Zugriff anschließend vom anderen Rechner
mit `curl --fail http://192.168.178.131:3000/health/ready` prüfen; ein erfolgreicher Aufruf
auf dem Server selbst bestätigt keine eingehende Firewall-Freigabe.

Keycloaks veröffentlichtes Docker-Port-Mapping nimmt einen anderen Netzwerkpfad: Docker
erstellt NAT- und Forwarding-Regeln, die UFWs normale Host-INPUT-Regeln umgehen. Deshalb kann
Port 5555 bereits funktionieren, während der Backend-Listener auf Port 3000 blockiert wird.
Siehe [Docker und UFW](https://docs.docker.com/engine/network/packet-filtering-firewalls/#docker-and-ufw).

### NestJS und Keycloak gemeinsam mit Docker starten

Das [Dockerfile](services/epa-authorization/Dockerfile) baut das Backend mit Node.js 24 und
dem versionierten pnpm-Lockfile. Das Runtime-Image enthält die kompilierten Dateien und
Produktionsabhängigkeiten; der Server läuft als Benutzer `node`. `.env`, lokale Dependencies
und Build-Artefakte sind durch [`.dockerignore`](.dockerignore) vom Build-Kontext ausgeschlossen.
Compose übergibt die benötigten Backend-Variablen zur Laufzeit.

Der Backend-Service verwendet [Docker Host Networking](https://docs.docker.com/engine/network/drivers/host/)
auf Linux. Er teilt das Host-Netzwerk und erreicht Keycloak über dessen veröffentlichten
Host-Port. Damit funktionieren sowohl die lokalen Standardwerte als auch die LAN-Konfiguration
aus dem vorherigen Abschnitt mit derselben Issuer-Adresse im Browser und Backend.
Es gibt für NestJS kein zusätzliches Docker-Port-Mapping; `HOST` und `PORT` steuern den
Listener direkt. Unter Docker Desktop muss Host Networking ausdrücklich aktiviert sein.

Einen laufenden `pnpm dev`-Prozess oder die Debug-Session beenden, um Port 3000 freizugeben.
Anschließend im Repository-Verzeichnis ausführen:

```bash
pnpm docker:up
curl --fail http://localhost:3000/health/ready
pnpm docker:logs
```

`docker:up` baut das Backend-Image, startet beide Services und wartet auf deren Readiness.
Das Backend startet erst nach Keycloaks erfolgreichem Healthcheck. Mit `HOST=0.0.0.0` und
`PORT=3000` lauscht es auch im Container auf allen IPv4-Interfaces des Servers und ist im LAN
unter `http://192.168.178.131:3000/health/ready` erreichbar. Die LAN-Adresse durch die eigene
Server-Adresse ersetzen. `KEYCLOAK_HOSTNAME`, `OIDC_ISSUER` und `x-idp-iss` verwenden dabei
weiterhin dieselbe LAN-Adresse; ein interner Service-Name wie `keycloak` ist kein vom
externen Browser erreichbarer Issuer.

Nach Source-Änderungen erneut `pnpm docker:up` ausführen. Der Container verwendet den
gebauten Server ohne Watch Mode. `pnpm docker:down` stoppt beide Services und erhält das
Keycloak-Datenvolume. Für das Debugging danach wieder `pnpm infra:up` und `pnpm dev` nutzen.

## Befehle

| Befehl                           | Zweck                                                                  |
| -------------------------------- | ---------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile` | Dependencies aus dem versionierten Lockfile installieren               |
| `pnpm env:init`                  | Lokale Konfiguration ohne Überschreiben erzeugen                       |
| `pnpm infra:up`                  | Keycloak starten und Readiness abwarten                                |
| `pnpm infra:down`                | Keycloak stoppen; Entwicklungsdaten bleiben erhalten                   |
| `pnpm infra:reset`               | Container und **lokales Keycloak-Datenvolume löschen**                 |
| `pnpm docker:up`                 | Backend bauen, mit Keycloak starten und Readiness abwarten             |
| `pnpm docker:down`               | Backend und Keycloak stoppen; Entwicklungsdaten bleiben erhalten       |
| `pnpm docker:logs`               | Laufende Backend-Container-Logs anzeigen                               |
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

## Postman- und Bruno-Collections

Zwei importierbare Dateien enthalten jeweils die Ordner `idp` und `epa-authorization`:

- [Postman Collection v2.1](docs/api-clients/epa-auth-lab.postman_collection.json)
- [Bruno Collection JSON](docs/api-clients/epa-auth-lab.bruno_collection.json)

Beide enthalten OIDC Discovery, JWKS, einen direkten PAR mit `client_secret_basic` und
frischem PKCE sowie das Keycloak-Loginformular. Für NestJS sind Liveness, Readiness, der
FdV Authorization Request und Beispiele für die Fehlerantworten 400, 403 und 404 enthalten.
Requests dokumentieren ihre Header und Form-Parameter und prüfen die Antworten automatisch.
Bei NestJS bleibt die Authorization-Antwort bei **302** stehen; Weiterleitungen sind für
diesen Request deaktiviert. Nur der IDP-Loginformular-Request folgt internen Weiterleitungen.

### Import und Modi

Separate Environment-Dateien liegen unter `docs/api-clients/environments/`:

| Modus  | Postman                                                                                      | Bruno                                              |
| ------ | -------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `dev`  | [dev.postman_environment.json](docs/api-clients/environments/dev.postman_environment.json)   | [dev.bru](docs/api-clients/environments/dev.bru)   |
| `stag` | [stag.postman_environment.json](docs/api-clients/environments/stag.postman_environment.json) | [stag.bru](docs/api-clients/environments/stag.bru) |
| `prod` | [prod.postman_environment.json](docs/api-clients/environments/prod.postman_environment.json) | [prod.bru](docs/api-clients/environments/prod.bru) |

**Postman:** Die Collection und die drei `*.postman_environment.json`-Dateien über **Import**
öffnen. Anschließend das gewünschte Environment `ePA Authentication Lab — dev`, `stag` oder
`prod` auswählen und dort die Werte bearbeiten. Jede Datei enthält `MODE`, alle Server-/Client-
Parameter und ein leeres, als sensibel markiertes `OIDC_CLIENT_SECRET`. Das aktive Environment
überschreibt die Collection-Defaults. Ohne aktives Environment kann weiterhin die Collection-
Variable `MODE` die Defaults aus `DEV_*`, `STAG_*` und `PROD_*` auswählen. Siehe
[Postman-Export](https://learning.postman.com/v11/docs/getting-started/importing-and-exporting/exporting-data)
und [Variablen](https://learning.postman.com/docs/use/send-requests/variables/variables/).
Die Scripts verwenden Web Crypto aus dem aktuellen
[Postman Sandbox](https://learning.postman.com/docs/tests-and-scripts/write-scripts/postman-sandbox-reference/pm-require).

**Bruno:** Über **Import Collection → Bruno Collection** die JSON-Datei wählen und ein
lokales Zielverzeichnis angeben. Anschließend eines der enthaltenen Environments `dev`,
`stag` oder `prod` auswählen und dessen Werte bearbeiten. Die Scripts funktionieren im
Safe Mode. Das einzelne JSON-Exportformat enthält die Environments; siehe
[Bruno-Export](https://docs.usebruno.com/get-started/import-export-data/export-collections).
Die separaten nativen Dateien `dev.bru`, `stag.bru` und `prod.bru` können zusätzlich in den
Ordner `environments/` der importierten Collection kopiert werden, um die Profile wiederherzustellen.
Anschließend das gewünschte Environment auswählen. Bei bereits vorhandenen Dateien ersetzen
sie die entsprechenden Profile; lokale Einstellungen deshalb vorher sichern. Für die Bruno CLI
kann eine Datei direkt mit `--env-file /absoluter/pfad/dev.bru` ausgewählt werden.

`dev` verwendet den aktuellen LAN-Server: NestJS `http://192.168.178.131:3000` und Issuer
`http://192.168.178.131:5555/realms/epa-demo`. Bei einem anderen Lab die Werte anpassen.
`stag` und `prod` enthalten HTTPS-Platzhalter unter `example.invalid`, die vor der Nutzung
ersetzt werden müssen. TLS-Prüfung bleibt aktiviert.

| Parameter                    | Verwendung                                                                     |
| ---------------------------- | ------------------------------------------------------------------------------ |
| `MODE`                       | Profil `dev`, `stag` oder `prod`                                               |
| `EPA_AUTHORIZATION_BASE_URL` | Erreichbare NestJS-Basis-URL ohne abschließenden Slash                         |
| `OIDC_ISSUER`                | Exakter Issuer ohne abschließenden Slash; entspricht Backend und IDP Discovery |
| `OIDC_CLIENT_ID`             | Am IDP registrierter confidential Client, im Lab `epa-auth-server`             |
| `OIDC_DEFAULT_REDIRECT_URI`  | Exakt registrierte und vom Backend erlaubte Redirect URI                       |
| `OIDC_SCOPE`                 | Scopes für direkten PAR, in M1 `openid`                                        |
| `X_USERAGENT`                | FdV-Produkt/Version, standardmäßig `EPA-AUTH-LAB/0.1.0`                        |
| `OIDC_CLIENT_SECRET`         | Nur lokal setzen; ausschließlich für den direkten PAR-Request an den IDP       |

Das Client Secret ist in keinem Export enthalten. In Postman `OIDC_CLIENT_SECRET` im
aktiven Environment lokal setzen und als sensibel markieren. In Bruno das leere Secret-Feld
des ausgewählten Environments lokal füllen; siehe
[Bruno Secret Variables](https://docs.usebruno.com/secrets-management/secret-variables).
Die Bruno CLI kann alternativ `DEV_OIDC_CLIENT_SECRET`, `STAG_OIDC_CLIENT_SECRET` oder
`PROD_OIDC_CLIENT_SECRET` aus ihrer Prozessumgebung lesen. Backend-Requests benötigen kein
Client Secret im API-Client. Die serverseitige `.env` wird von den exportierten Collections
nicht automatisch gelesen.

### Requests ausführen

1. Beide Server starten und den gewünschten Modus konfigurieren.
2. `idp / OIDC discovery` senden. Die weiteren IDP-URLs kommen aus dieser Antwort.
3. Für den direkten IDP-Test `JWKS`, `Pushed authorization request` und unmittelbar danach
   `Open authorization login form` ausführen. Bei einer bestehenden Anmeldung IDP-Cookies
   vorher löschen. Für diesen Pfad ist das lokale Client Secret erforderlich.
4. Für den Backend-Test die Requests in `epa-authorization` ausführen. Der erfolgreiche
   `Send authorization request FdV` speichert die `Location` in `AUTHORIZATION_URL`; sie
   kann unmittelbar im Browser geöffnet werden. `x-redirecturi` ist optional und initial
   deaktiviert. Zum Test einer expliziten Redirect URI den Header aktivieren.

Beim Wechsel des Modus oder der Server-/Client-Konfiguration werden gespeicherte Discovery
Endpoints und Authorization Links verworfen. Die PAR-Referenzen sind kurzlebig und werden
beim Öffnen verbraucht; vor jedem weiteren Loginformular-Test einen neuen PAR erzeugen.
Die Collection-Smoke-Tests enden am Loginformular und speichern keine Browser-Login-Transaktion.
Die Dev-Redirect-URI ist `http://192.168.178.131:3000/callback` und muss in Keycloak registriert
sowie im Backend erlaubt sein. Für den vollständigen Ablauf die Browser-Demo verwenden.

## Vollständiger Browser-Login

Im Browser [http://192.168.178.131:3000/login](http://192.168.178.131:3000/login) öffnen;
bei einer anderen Backend-Adresse entsprechend anpassen. `/login` verwendet den konfigurierten
Issuer und Callback, erzeugt einen echten PAR und setzt ein `HttpOnly`-/`SameSite=Lax`-Cookie
zur Bindung an diesen Browser. Mit `demo-versicherte` und `TEST_USER_PASSWORD` aus `.env` anmelden.

Nach der Anmeldung ruft Keycloak `/callback` mit `code`, `state` und gegebenenfalls `iss` auf.
Der Server prüft die einmalige Login-Transaktion und Browser-Bindung, tauscht den Code mit dem
ursprünglichen PKCE-Verifier aus und validiert den RS256-signierten ID Token gegen die entdeckten
JWKS. Geprüft werden Issuer, Audience, `azp`, Ablauf, Ausstellungszeit und `nonce`; ein vorhandener
`at_hash` muss zum Access Token passen. Danach folgt ein Redirect zu `/session`:

```json
{
  "authenticated": true,
  "user": {
    "subject": "<Keycloak-subject>",
    "issuer": "http://192.168.178.131:5555/realms/epa-demo"
  },
  "expiresAt": "<ISO-8601>"
}
```

Tokens verbleiben im Backend. Die Session wird durch ein zufälliges `HttpOnly`-Cookie identifiziert;
bei HTTPS erhalten die Cookies zusätzlich `Secure`. Login-Transaktionen laufen nach zehn Minuten
ab. Sessions enden spätestens mit dem Access-/ID-Token oder nach 15 Minuten. Beide Stores halten
höchstens jeweils 1000 Einträge, entfernen abgelaufene Einträge bei Zugriffen und gehen bei einem
Backend-Neustart verloren. Ohne gültige Session liefert `/session` `{"authenticated": false}`.

Immer mit `/login` im selben Browser starten. Ein direkter PAR aus Postman oder die headerbasierte
FdV-Smoke-Operation liefert dem Callback keine gespeicherte Browser-Transaktion; außerdem teilt
Postman seine Cookies nicht mit dem Browser. Solche Callbacks werden abgelehnt. Browser-Cookies
sind keine Gerätebindung oder ePA-Session-Autorisierung.

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
einen neuen initialen Request senden. Dieser headerbasierte Smoke-Test endet am Loginformular.
Für die Anmeldung mit Callback und Token Exchange stattdessen `/login` im Browser verwenden.

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
RFC-Testvektor, PAR-Payload und -Antwort, Timeouts, Fehler und geheimnisfreie Logs. Browser-Tests
prüfen PKCE-Code-Exchange, Browser-Bindung, Callback-Replay, Ablauf, signierte ID Tokens,
Audience-/Issuer-/Nonce-Prüfung sowie JWKS-Cache und Key-Rotation. Ein
lokaler TCP-Test prüft die tatsächliche Deadline bei einem unvollständigen Response Body.

Die getrennte Integration erstellt eine echte NestJS-Anwendung mit Supertest und echten
OIDC Services. Sie ruft die laufende Keycloak-Instanz auf, erhält eine reale PAR-Referenz
und prüft das echte Loginformular mit frischen Cookies. Sie prüft außerdem PAR-Pflicht,
ungültige Referenzen und fehlende Client Credentials. Ein zusätzlicher Test meldet
`demo-versicherte` mit `TEST_USER_PASSWORD` aus der lokalen `.env` an und prüft Callback,
echten Code Exchange, ID-Token-Validierung und Browser-Session.
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
Authenticator anbinden. Persistierende Sessions, Token Refresh und Gerätebindung benötigen
eigene Implementierung und Tests. TI-Föderation, Trust Chains und VAU bleiben zusätzliche
eigenständige Aufgaben. Der Browser-Login ist eine lokale OIDC-Demo; der aktuelle Code
behauptet keine gematik-Konformität.

## Angewandte Workspace-Vorgaben

Vor der Implementierung wurden der leere Workspace, Elternverzeichnisse und verfügbare
Skills untersucht. Es gab keine anwendbare `AGENTS.md` und keine bestehenden Yappio
Auth-, API- oder Persistence-Abstraktionen. Verwendet wurden `clean-code`, `code-formatting`,
`file-structure`, `naming`, `typescript-best-practices` und `yappio-architecture`.
Ein spezifischer NestJS-, Security-, Testing- oder Dokumentations-Skill war im verfügbaren
Katalog nicht vorhanden; hierfür wurden die offiziellen Referenzen und übliche
Engineering-Praktiken verwendet. Die angeforderten Repository-Dokumente wurden direkt
als Markdown erstellt.
