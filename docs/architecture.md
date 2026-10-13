# Architektur von Milestone 1

Das Backend repräsentiert den ePA Authorization Server gegenüber einem zukünftigen FdV.
Gegenüber Keycloak ist dasselbe Backend ein **confidential OAuth/OIDC Client** und Relying
Party. Keycloak ist der **OAuth Authorization Server und OpenID Provider**. Diese Rollen
sind kontextabhängig; NestJS authentisiert keinen Versicherten.

## Ablauf und Vertrauensgrenzen

```mermaid
sequenceDiagram
    participant FdV as FdV (zukünftiger Android-Client)
    participant Controller as AuthorizationController
    participant Service as AuthorizationService
    participant Discovery as OidcDiscoveryService
    participant PAR as ParService / OidcClientService
    participant IDP as Keycloak (simulierter sektoraler IDP)
    participant Authenticator as FdV / Authenticator (später)

    FdV->>Controller: GET send_authorization_request_fdv mit Headern
    Controller->>Controller: Schema und Request-ID validieren
    Controller->>Service: Login-Anfrage mit Issuer und optionaler Redirect URI
    Service->>Service: Konfigurierten Issuer und Redirect-Allowlist prüfen
    Service->>Discovery: Metadata für den konfigurierten IDP auflösen
    opt Metadata nicht im gültigen Cache
        Discovery->>IDP: Backchannel GET /.well-known/openid-configuration
        IDP-->>Discovery: Issuer, Authorization Endpoint, PAR Endpoint
        Discovery->>Discovery: Issuer, Origin und Fähigkeiten validieren
    end
    Discovery-->>Service: Validierte Metadata
    Service->>Service: Zufällige state, nonce, PKCE erzeugen
    Service->>PAR: Authorization Transaction und Redirect URI
    PAR->>IDP: Backchannel POST PAR, form-urlencoded, client_secret_basic
    IDP->>IDP: Confidential OAuth Client authentisieren
    IDP->>IDP: Authorization Request prüfen und Referenz ausstellen
    IDP-->>PAR: HTTP 201 JSON mit request_uri und expires_in
    PAR->>PAR: Status, Content Type und Felder prüfen
    PAR-->>Service: Provider-generierte PAR-Referenz
    Service-->>Controller: Entdeckter Authorization Endpoint + client_id + request_uri
    Controller-->>FdV: HTTP 302, Location, kein authentisierter Nutzer
    Note over FdV,Authenticator: Zukünftiger Frontchannel; Integrationstest öffnet nur das Loginformular
    FdV->>Authenticator: Authorization URL übergeben (später)
    Authenticator->>IDP: Frontchannel GET Authorization URL (später)
    IDP-->>Authenticator: Nutzerauthentisierung beim IDP (später)
```

Der **Backchannel** verbindet Backend und IDP direkt. Dort bleiben OAuth Client Secret und
Authorization Request Parameters. Der **Frontchannel** transportiert die Authorization URL
über Client beziehungsweise Browser/Authenticator. Die Client Authentication im PAR weist
die Backend-Anwendung aus; sie ist keine Authentication des Versicherten. Eine spätere
Nutzerauthentisierung findet ausschließlich beim IDP statt.

## Verantwortlichkeiten

| Komponente                                     | Verantwortung                                                                                                                  |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `AuthorizationController` und Header-Validator | HTTP-Schema prüfen, `AuthorizationService` aufrufen, leere 302-Antwort senden                                                  |
| `AuthorizationService`                         | Konfigurierten Issuer auswählen, Redirect Allowlist prüfen, Transaktion erstellen, PAR orchestrieren, Location konstruieren    |
| `OidcDiscoveryService`                         | Issuer und Metadata prüfen, Endpoints entdecken, Cache und parallele Discovery-Anfragen koordinieren                           |
| `ParService`                                   | OAuth-Parameter und Client Authentication erstellen, PAR-Antwort validieren, bekannte Protokollablehnungen abbilden            |
| `OidcClientService`                            | Native Node.js Fetch API, vollständige Request-Deadline, begrenzte JSON-Antworten, Redirect-Verbot, sanitierte Transportfehler |
| `@nestjs/config` und Zod                       | Startup-Validierung und typisierte Dependency Injection                                                                        |
| Error Filter und Request Logging               | Gematik-Error-Objekte, UUID-Korrelation, Cache-Verbot, JSON-Logs ohne Geheimnisse                                              |
| Health Module                                  | Liveness und Discovery-basierte Readiness                                                                                      |

Die Module verwenden NestJS Dependency Injection und direkte Application Services.
Es gibt keine generische OAuth-Bibliothek, eigene Benutzerverwaltung, ORM oder gemeinsame
Plattformpakete. Diese zusätzliche Struktur wäre für den vorhandenen Umfang nicht erforderlich.

## PAR ist mehr als ein POST

[RFC 9126](https://www.rfc-editor.org/rfc/rfc9126.html) beschreibt die direkte Übergabe und
Prüfung eines Authorization Request beim Authorization Server. Das Ergebnis ist eine
kurzlebige, an den Client gebundene Referenz. Der Frontchannel verwendet anschließend
diese Referenz; die eigentlichen Parameter wurden bereits im Backchannel akzeptiert.
Das erschwert Parameter-Manipulation und reduziert ihre Verbreitung in Browser-URLs.
Eine beliebige POST-Anfrage ohne diese Referenz-, Bindungs- und Validierungssemantik ist
kein PAR. In einem echten Betrieb benötigt der Backchannel TLS.

Der Demo-Client verwendet `response_type=code`, `scope=openid`, `state`, `nonce` sowie PKCE
`S256`. `state`, `nonce` und `code_verifier` entstehen unabhängig aus jeweils 32 Zufallsbytes.
Der Verifier wird nicht gesendet; nur der SHA-256-Code-Challenge geht in den PAR.
Nach erfolgreichem PAR sind weder Benutzeridentität noch ePA-Zugriff bestätigt.

## Lebensdauer und Fehler

Metadaten werden standardmäßig fünf Minuten pro NestJS-Prozess gehalten. Gleichzeitige
Cache-Misses teilen eine Discovery-Anfrage; Fehler werden nicht gecacht. Exakte Issuer-Prüfung
und gleiche Endpoint-Origin sind zusätzliche Demo-Einschränkungen, keine allgemeine
OIDC-Regel für alle Provider. HTTP-Redirects bei Discovery und PAR werden niemals verfolgt.

Transaktionsgeheimnisse leben ausschließlich im lokalen Aufruf von `AuthorizationService`.
Es gibt keinen In-Memory Transaction Store, Cookie oder authentisierte Session. Nach dem
Aufruf werden die Werte verworfen und später durch den JavaScript Garbage Collector
freigegeben; das ist keine garantierte Speicherlöschung. Ohne Store und Callback kann
kein Code Exchange erfolgen. Ein späterer Milestone muss Zustand, Ablauf, Bindung und
einmalige Verwendung neu modellieren.

Jeder HTTP-Aufruf erhält eine UUID. Eine vom Client bereitgestellte gültige UUID wird exakt
zurückgegeben und bei PAR-Start, -Abschluss und Fehlern verwendet. Logs enthalten Operation,
konfigurierten Issuer, Status, Dauer und kontrollierte Fehlerkategorien. Sie enthalten keine
vollständige Location, PAR-Referenz, Client Credentials, Tokens oder Transaction Secrets.

Provider-Transportfehler und ungültige Antworten ergeben `500 internalError`. Erkannte
Authorization-Rejections ergeben `403 invalAuth`; Client-Credential-Probleme bleiben
Infrastrukturfehler. Die genaue Zuordnung und Contract-Abweichungen sind in
[specifications.md](specifications.md) beschrieben.

## Lokale Infrastruktur

Keycloak läuft mit `start-dev`, `dev-file`, einem persistierenden Docker-Volume und dem
automatischen [Realm-Import](https://www.keycloak.org/server/importExport).
Der Client erhält die Marker-Rolle `require-par`. Eine Client Policy mit `client-roles`
aktiviert das Profil `epa-par-required` und den vorhandenen Executor `secure-par-content`.
Das setzt kein vollständiges FAPI-Profil voraus und verwendet keine erfundenen Client-Felder.

Die Mechanismen sind in der [Client-Policy-Dokumentation des Tags 26.8.0](https://github.com/keycloak/keycloak/blob/26.8.0/docs/documentation/server_admin/topics/clients/client-policies.adoc)
beschrieben; die PAR-Erzwingung ist im
[SecureParContentsExecutor](https://github.com/keycloak/keycloak/blob/26.8.0/services/src/main/java/org/keycloak/services/clientpolicy/executor/SecureParContentsExecutor.java)
nachvollziehbar und durch einen echten Non-PAR-Test überprüft. Die Discovery-Metadata
`require_pushed_authorization_requests=false` gilt auf Realm-Ebene und widerlegt diese
Client-spezifische Policy nicht.

Ein Neustart erhält lokale Daten; Änderungen am Import greifen erst nach einem Reset.
HTTP ohne TLS und die Entwicklungsdatenbank bleiben auf das isolierte lokale Lab begrenzt.

Die Bind-Adressen und der veröffentlichte Keycloak-Port sind konfigurierbar. Loopback bleibt
der Standard; für ein isoliertes Entwicklungs-LAN erlauben `HOST`, `KEYCLOAK_BIND_ADDRESS`,
`KEYCLOAK_PORT` und `KEYCLOAK_HOSTNAME` den Remote-Zugriff. Der Container lauscht weiter auf
8080, auch wenn der Host-Port 5555 ist. Eine LAN-Adresse muss zugleich im Keycloak-Hostname,
konfigurierten Issuer und FdV-Header stehen. HTTP auf privaten IPv4-Adressen benötigt die
explizite Option `OIDC_ALLOW_PRIVATE_NETWORK_HTTP=true`; Issuer-Allowlisting und gleiche
Endpoint-Origin gelten weiterhin. Diese Netzwerkänderung setzt keinen Realm-Reset voraus.

Optional startet das Compose-Profil `backend` auch NestJS im Container. Ein mehrstufiger
Build erzeugt ein Node.js-24-Runtime-Image mit Produktionsabhängigkeiten und kompiliertem
Backend; der Prozess läuft als Benutzer `node`. Mit Host Networking auf Linux verwendet
der Backend-Container dasselbe Netzwerk wie der Host. `HOST` und `PORT` steuern den Listener
direkt, und die bestehenden lokalen beziehungsweise LAN-Issuer-URLs bleiben erreichbar. Der Start wartet
auf Keycloaks Healthcheck; die Backend-Readiness prüft die OIDC-Discovery. Secrets gelangen
ausschließlich über die Runtime-Konfiguration in den Backend-Container, nicht in das Image.
Browser und Backend verwenden weiterhin dieselbe erreichbare Issuer-Adresse, für Remote-Zugriff
die LAN-Adresse des Servers. Eine Container-interne Issuer-URL würde den
Frontchannel für externe Browser unbrauchbar machen.
