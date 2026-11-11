# Capability Spec — OAuth/OIDC Authorization and Resource Access

**Status:** DRAFT — NOT IMPLEMENTATION-AUTHORIZED

## Purpose

Define the standard OAuth/OIDC mission's browser login, application session, and independently authorized synthetic resource access while preserving the existing ePA/PAR demonstration.

The fixture-only UI authorization remains separate. These runtime requirements are planning artifacts and require review and explicit implementation authorization.

## ADDED Requirements

### Requirement: Start a correlated real authorization request

The BFF SHALL start the standard mission through a browser-bound, one-time Authorization Code + PKCE S256 transaction with state and an OIDC nonce. The standard authorization path SHALL operate without a PAR request.

#### Scenario: Starting the standard mission without PAR

- **GIVEN** the standard mission is enabled and the visitor has no application session
- **WHEN** the visitor navigates in the browser to `GET /api/oauth/login`
- **THEN** the BFF creates a fresh pending transaction and sets its browser binding
- **AND** the browser redirects to the configured authorization endpoint with `response_type=code`, the standard client ID, exact registered callback, state, nonce, and S256 challenge
- **AND** no PAR call or `request_uri` is required
- **AND** any authentication UI is provided by Keycloak; an existing provider SSO session can complete without another password prompt.

#### Scenario: Starting again creates another transaction

- **GIVEN** an earlier run failed, expired, or was cancelled
- **WHEN** the visitor starts or retries login
- **THEN** a new run and fresh transaction values are created
- **AND** no authorization code, state, nonce, or PKCE verifier from the earlier attempt is reused.

#### Scenario: Standard discovery does not require PAR metadata

- **GIVEN** valid provider metadata for the standard flow with no PAR endpoint
- **WHEN** the BFF starts the standard mission
- **THEN** it validates the required authorization, token, and signing-key endpoints and starts the standard flow
- **AND** the existing ePA profile continues to require valid PAR metadata.

### Requirement: Preserve the existing ePA and PAR behavior

The existing ePA client, required-PAR policy, header-based smoke-test operation, and PAR-based browser demonstration SHALL retain their documented contracts independently of the standard mission.

#### Scenario: Header-based smoke operation remains stateless

- **GIVEN** valid configured ePA headers
- **WHEN** `GET /epa/authz/v1/send_authorization_request_fdv` is invoked
- **THEN** it performs PAR and returns the existing 302 authorization redirect and request-ID behavior
- **AND** it creates no browser-login transaction or authenticated application session
- **AND** existing header validation, guest-mode rejection, redirect allowlisting, and safe error codes remain unchanged.

#### Scenario: Existing ePA browser demonstration still completes

- **GIVEN** the visitor starts the existing `GET /login` browser demonstration
- **WHEN** its PAR-based authorization and valid `/callback` handling complete
- **THEN** the existing ePA cookie/session behavior is preserved
- **AND** success still redirects to `/session` with its existing response contract.

#### Scenario: Standard configuration does not weaken the PAR policy

- **GIVEN** the separate standard client and existing ePA client
- **WHEN** ordinary authorization is attempted without a PAR reference for each client
- **THEN** the standard client accepts its valid S256 request
- **AND** the ePA client rejects PAR bypass.

### Requirement: Bind callbacks to the originating browser and client profile

The BFF SHALL accept a callback only for an unexpired pending transaction with the correct browser binding and server-selected client context. The callback SHALL NOT select or override its issuer, client credentials, profile, or redirect URI.

#### Scenario: Missing or different browser binding

- **GIVEN** a legitimate pending login
- **WHEN** its callback arrives without the required cookie, with a different binding, or from an API client without the browser context
- **THEN** no token exchange or new authenticated session occurs
- **AND** no other browser's run is disclosed or changed
- **AND** an incorrect binding does not consume the legitimate pending transaction.

#### Scenario: Untracked, expired, or lost transaction

- **GIVEN** a callback whose state is unknown, whose transaction is over ten minutes old, or whose server context was lost after restart
- **WHEN** the BFF processes that callback
- **THEN** no token exchange or new authenticated session occurs
- **AND** recovery requires starting a fresh login.

#### Scenario: Login and callback use different application hosts or instances

- **GIVEN** login was started on one host or auth-client instance
- **WHEN** the callback cannot present its binding or find its pending transaction on the returning host/instance
- **THEN** the callback fails safely
- **AND** provider login success alone does not establish an application session.

#### Scenario: Standard and ePA contexts cannot be substituted

- **GIVEN** a pending transaction belonging to one configured client profile
- **WHEN** its state, binding, callback route, code, or session cookie is substituted into the other profile's flow
- **THEN** the substituted flow creates no authenticated session
- **AND** token validation never falls back to the other client's audience or credentials.

### Requirement: Consume a valid transaction once

The BFF SHALL consume a correctly correlated pending transaction before exchanging its code and SHALL prevent duplicate or concurrent callbacks from performing another exchange.

#### Scenario: Replaying or racing a callback

- **GIVEN** one correctly correlated pending transaction
- **WHEN** two callbacks for it arrive sequentially or concurrently
- **THEN** at most one token exchange occurs
- **AND** the replay cannot create or replace an authenticated session.

#### Scenario: Exchange or validation fails after consumption

- **GIVEN** a correctly correlated callback whose transaction has been consumed
- **WHEN** code exchange or token validation fails
- **THEN** no new authenticated session is created
- **AND** retrying that callback does not attempt another exchange
- **AND** recovery starts a new transaction.

### Requirement: Complete only after valid callback and OIDC validation

The BFF SHALL establish authentication only after exchanging the code with the stored client's credentials and matching PKCE verifier, and validating the token response and ID Token against that transaction.

#### Scenario: Completing a valid standard transaction

- **GIVEN** a valid standard callback and matching browser context
- **WHEN** the BFF exchanges the code directly with the configured token endpoint
- **THEN** it sends the original verifier, exact callback URI, and standard confidential-client authentication
- **AND** it validates the token response, trusted signing key/algorithm, issuer, client audience, lifetime, nonce, authorized party where applicable, and token hash where present
- **AND** only then establishes authentication and rotates the mission cookie.

#### Scenario: Rejecting malformed or unsuccessful provider responses

- **GIVEN** a callback with missing/duplicate/invalid state, missing code and error, both code and error, or a provider denial
- **WHEN** callback processing occurs
- **THEN** malformed input cannot trigger a code exchange
- **AND** a correctly correlated provider denial is recorded as a safe failure/cancellation without exchange
- **AND** no new authenticated session is created.

#### Scenario: Rejecting failed PKCE or an unusable code

- **GIVEN** a correctly correlated callback with a wrong PKCE verifier or expired/reused code
- **WHEN** the token endpoint rejects the exchange
- **THEN** no new application authentication is established
- **AND** the UI receives a stable safe outcome without the upstream response body.

#### Scenario: Rejecting invalid token evidence

- **GIVEN** a correctly correlated callback
- **WHEN** the response has a forged signature, disallowed algorithm, ambiguous/untrusted signing key, wrong issuer/audience/nonce/authorized party, invalid lifetime, wrong token hash, or missing required token fields
- **THEN** token validation fails and no new authenticated session is established
- **AND** each negative case is exercised independently rather than inferred from the successful case.

### Requirement: Return to the fixed Mission Control route

The standard callback SHALL return the browser to `/missions/oauth-oidc/workspace` with a clean 303 redirect and expose only a safe outcome through the browser's own session/run API. Arbitrary return destinations SHALL be rejected.

#### Scenario: Successful or correlated failed callback returns to Workspace

- **GIVEN** the standard callback has completed successfully or produced a correlated safe failure
- **WHEN** the BFF responds
- **THEN** its Location is the fixed Workspace route
- **AND** neither the Location nor the session/run response contains a code, state, verifier, token, cookie, raw callback URL, or provider error text.

#### Scenario: Rejecting caller-selected destinations and client settings

- **GIVEN** login/callback input containing an arbitrary return destination or attempted issuer/client/profile/redirect override
- **WHEN** the BFF processes that input
- **THEN** it does not navigate to that destination or use those settings
- **AND** an uncorrelated request cannot access or alter another browser's run.

### Requirement: Expose a minimal cookie-based application session

The standard session API SHALL expose authentication, expiry, current safe run/outcome information, and a browser-context-bound anti-CSRF value as needed. OAuth credentials and raw identity claims SHALL remain server-side.

#### Scenario: Reading the standard session

- **GIVEN** a browser context with or without completed authentication
- **WHEN** it requests `GET /api/oauth/session`
- **THEN** the result accurately describes its current authentication and eligible run
- **AND** no bearer token, ID Token, refresh token, raw identity claim set, cookie value, or transaction secret appears in the response
- **AND** session responses are not cached or exposed through broad credentialed CORS.

#### Scenario: Authentication expires

- **GIVEN** authentication reaches the earlier token expiry or fifteen-minute maximum
- **WHEN** the session is read or a protected action is requested
- **THEN** authentication is false and expired credentials cannot authorize the action
- **AND** remaining safe viewing access never grants resource access.

#### Scenario: Session cookies are isolated and inaccessible to scripts

- **GIVEN** the standard and ePA demonstrations are available
- **WHEN** standard mission cookies are issued
- **THEN** they use distinct names from ePA, the mission API scope, HttpOnly, SameSite=Lax, and Secure under HTTPS
- **AND** ePA cookie behavior is preserved.

### Requirement: Protected API uses Access Token authorization

The BFF SHALL use only the authenticated standard session's server-held Access Token for the single configured synthetic FHIR read. The browser SHALL NOT supply bearer credentials or arbitrary upstream destinations.

#### Scenario: Reading the synthetic resource through the BFF

- **GIVEN** a valid standard application session
- **WHEN** `GET /api/oauth/resource` is requested
- **THEN** the BFF calls the configured `GET /fhir/Basic/playground-demo` operation with the server-held Access Token
- **AND** it returns a bounded synthetic resource view or stable safe failure
- **AND** it does not reveal the upstream token or dump the response into the learning trace.

#### Scenario: Requesting a resource without application authentication

- **GIVEN** absent, expired, signed-out, or ePA-only application authentication
- **WHEN** the standard protected resource action is requested
- **THEN** the BFF returns 401 without protected data
- **AND** it makes no authenticated FHIR request or implicit new login.

#### Scenario: Preventing an arbitrary resource proxy

- **GIVEN** a caller attempts to supply another destination, operation, resource identifier, or bearer token
- **WHEN** the standard resource endpoint handles the request
- **THEN** those inputs cannot redirect the configured operation or replace its credentials
- **AND** upstream time/size limits and safe error projection remain enforced.

### Requirement: Resource Server independently validates bearer credentials

The Resource Server SHALL independently validate an Access Token's signature/trust, allowed algorithm, issuer, resource audience, lifetime, and token purpose. Application session state or a BFF assertion SHALL NOT replace bearer validation.

#### Scenario: Accepting a valid resource Access Token

- **GIVEN** a trusted, valid Access Token for audience `playground-fhir` with permission `demo.fhir.read`
- **WHEN** the exact synthetic FHIR read is requested directly at the Resource Server
- **THEN** it returns the synthetic Basic resource with HTTP 200
- **AND** no patient or clinical content is present.

#### Scenario: Rejecting invalid bearer credentials directly

- **GIVEN** the protected FHIR read
- **WHEN** each credential case below is exercised directly at the Resource Server
- **THEN** every case returns 401 without protected data, independently of the BFF:

| Credential case                                                          |
| ------------------------------------------------------------------------ |
| No bearer token, including a request carrying only an application cookie |
| Malformed token or forged/untrusted signature                            |
| Disallowed algorithm                                                     |
| Wrong issuer                                                             |
| Correct issuer but missing/wrong resource audience                       |
| Expired token or token not yet valid                                     |
| ID Token substituted for an Access Token                                 |
| ePA Access Token that is not issued for the resource audience            |

### Requirement: Resource Server authorizes only the declared exercise

The Resource Server SHALL require `demo.fhir.read` for the exact synthetic read and default-deny undeclared data operations and alternate data-access endpoints.

#### Scenario: Denying a token without permission

- **GIVEN** a valid Access Token for the resource audience without `demo.fhir.read`
- **WHEN** the synthetic read is requested directly
- **THEN** HTTP 403 is returned without protected data.

#### Scenario: Denying operations outside the exercise

- **GIVEN** a valid Access Token with the demo read permission
- **WHEN** another resource, write, search, history, batch, transaction, or alternate data-bearing endpoint is requested
- **THEN** HTTP 403 is returned without protected data
- **AND** enabled MCP/CDS hooks or test interfaces cannot bypass the exercise's authorization boundary.

#### Scenario: Health checks expose no protected data

- **GIVEN** an explicitly designated health/readiness route
- **WHEN** an unauthenticated health check is performed
- **THEN** health can be assessed without returning resources or granting access to any protected data operation.

### Requirement: Application sign-out prevents subsequent access

Local application sign-out SHALL remove authentication and server-held token references, invalidate the prior mission cookie, and rotate to an unauthenticated viewing context. It SHALL NOT claim provider-wide logout or bearer-token revocation.

#### Scenario: Local logout invalidates application authentication

- **GIVEN** a valid standard session and a valid same-origin anti-CSRF logout request
- **WHEN** `POST /api/oauth/logout` completes
- **THEN** the browser is unauthenticated and the old cookie no longer authorizes resource access
- **AND** an attempted resource action returns 401 without an authenticated FHIR request
- **AND** safe history remains available only under the rotated browser viewing ownership and its original lifetime.

#### Scenario: Provider SSO remains independent

- **GIVEN** local application logout has completed
- **WHEN** a fresh login is started
- **THEN** it creates a new transaction
- **AND** an existing Keycloak SSO session can complete it without contradicting the prior local logout outcome.

### Requirement: Prevent stale callbacks after logout

A successful standard logout SHALL cancel context-bound pending login attempts, including consumed callbacks still completing asynchronous work. A callback SHALL recheck its original context and attempt eligibility after exchange/validation and before session commit. A cancelled or superseded attempt SHALL NOT recreate authentication.

#### Scenario: Rejecting a pending transaction cancelled by logout

- **GIVEN** an active standard application session and a pending login bound to the same context
- **WHEN** a valid same-origin, anti-CSRF-protected logout completes before that login's callback arrives
- **THEN** the active session is invalidated and the pending transaction is cancelled
- **AND** its later callback is rejected before token exchange and creates no authenticated session or cookie
- **AND** other browsers and existing ePA/PAR contexts are unaffected.

#### Scenario: Logout during an in-flight callback

- **GIVEN** a standard callback has been correctly correlated and consumed, and token exchange or asynchronous token validation is waiting to complete
- **AND** the originating context has an active application session
- **WHEN** valid local logout invalidates that session and cancels its login attempts
- **AND** the asynchronous callback work later returns otherwise valid tokens
- **THEN** the final context/attempt eligibility check rejects the stale completion before committing a session
- **AND** returned credential references are discarded without being exposed or retained for authentication
- **AND** no authenticated cookie is issued and the replacement unauthenticated viewing context is not overwritten
- **AND** a session read remains unauthenticated until a fresh explicitly started login succeeds.

### Requirement: Authentication cleanup is independent of event persistence

Session invalidation, login cancellation, and credential cleanup SHALL complete independently of teaching-event persistence. Trace capacity exhaustion or event-recording failure SHALL NOT prevent or roll back authorized logout or expiry cleanup. Only eligible bounded non-sensitive viewing history SHALL be retained.

#### Scenario: Exhausted event storage during logout

- **GIVEN** an authenticated standard context with a pending login and a run at its 100-event limit
- **AND** the event recorder rejects a further append or fails while trying to record logout
- **WHEN** a valid same-origin, anti-CSRF-protected logout request is handled
- **THEN** the active session is invalidated, its pending login is cancelled, and server-held credential references are removed despite the event failure
- **AND** a stale callback cannot commit authentication after cleanup
- **AND** the old authenticated cookie cannot authorize access and a protected action returns 401 without an authenticated FHIR request
- **AND** retained history stays within existing entry/event bounds and its original lifetime
- **AND** an unavailable logout observation is not fabricated or used to claim the trace is complete.

### Requirement: Protect local logout against cross-site requests

The logout operation SHALL require the configured same Origin and a valid anti-CSRF value bound to the current browser context. GET requests SHALL NOT perform logout.

#### Scenario: Rejecting unsafe logout requests

- **GIVEN** an authenticated session
- **WHEN** logout is requested with a foreign/missing Origin, a missing/wrong anti-CSRF value, a value from another context, or a GET method
- **THEN** logout is rejected and session/token state is unchanged
- **AND** a cookie alone does not authorize that state change.

### Requirement: Protocol traces contain no secrets

Teaching traces and routine logs SHALL contain only allowlisted safe observations and SHALL exclude credentials, transaction secrets, raw identity claims, unsafe URLs, and entire HTTP bodies.

#### Scenario: Inspecting successful and failed flows

- **GIVEN** successful login, rejected callback, provider denial, exchange failure, resource denial, or logout
- **WHEN** session/run responses, rendered learning evidence, browser storage, and collected routine backend/proxy/resource logs are inspected
- **THEN** no password, code, verifier, state/nonce, token, client secret, cookie value, raw identity claim set, raw callback URL/query, or complete HTTP body is disclosed
- **AND** no error handler falls back to dumping unrecognized upstream data.
