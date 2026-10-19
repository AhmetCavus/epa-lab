# Capability Spec — OIDC Authorization Code + PKCE

**Status:** DRAFT — architecture/security review required before approval.

## ADDED Requirements

### Requirement: Start a correlated real authorization request

The BFF SHALL initiate a real, one-time correlated authorization transaction and redirect the browser to Keycloak. This capability remains DRAFT and is not part of UI Slice 001.

#### Scenario: Starting authorization without an application session

**GIVEN** a visitor has no active application session  
**WHEN** they choose the OAuth mission's Start authentication action  
**THEN** the browser navigates to the BFF's login start endpoint  
**AND** the BFF establishes a one-time, session-correlated authorization transaction with state, PKCE S256 challenge, and OIDC nonce as applicable  
**AND** the browser follows a redirect to Keycloak's authorization endpoint  
**AND** Keycloak, not the BFF, presents the actual login UI.

### Requirement: Complete only after valid callback and OIDC validation

The BFF SHALL establish a session only after transaction correlation and valid OIDC response handling, without exposing bearer tokens to browser JavaScript.

#### Scenario: Completing a valid authorization transaction

**GIVEN** a valid authorization transaction  
**WHEN** the BFF receives the expected callback and exchanges the Authorization Code directly at Keycloak's token endpoint with the matching verifier  
**THEN** it validates the token response with an established OIDC library  
**AND** only then establishes an application session  
**AND** browser JavaScript never receives bearer tokens.

#### Scenario: Rejecting an invalid authorization transaction

**GIVEN** absent/mismatched state, expired/reused code or failed exchange  
**WHEN** callback processing occurs  
**THEN** no authenticated application session is created  
**AND** the UI receives only a safe error outcome.

### Requirement: Protected API uses Access Token authorization

The Resource Server SHALL independently validate Access Token authorization and deny invalid or insufficient credentials.

#### Scenario: Authorizing a synthetic resource request

**GIVEN** the authenticated application session and a valid Access Token for the demo resource with required permission  
**WHEN** the visitor requests the synthetic protected data via BFF  
**THEN** the Resource Server validates signature/trust, issuer, audience, lifetime and permission before allowing access  
**AND** no ID Token is used for API authorization.

#### Scenario: Denying an unauthorized resource request

**GIVEN** no session, wrong audience, invalid token or missing permission  
**WHEN** protected data is requested  
**THEN** the resource is denied  
**AND** no protected data is returned.

### Requirement: Application sign-out prevents subsequent access

The BFF SHALL invalidate the application session and associated server-held token references on application sign-out.

#### Scenario: Access after application sign-out

**GIVEN** an authenticated BFF session  
**WHEN** the visitor signs out  
**THEN** the BFF invalidates that application session and associated server-held token references  
**AND** a subsequent request via the old application session is denied  
**AND** the UX distinguishes application sign-out from the provider's broader SSO logout.

### Requirement: Protocol traces contain no secrets

Protocol traces SHALL contain no raw credentials, secrets, unsafe URLs or unredacted protocol bodies, and SHALL identify their actual observer.

#### Scenario: Inspecting traces and browser-accessible state

**GIVEN** any successful or failed flow  
**WHEN** the browser reads the event timeline, inspector or local storage, or routine logs are inspected  
**THEN** there are no raw OAuth bearer tokens, codes, PKCE verifiers, passwords, secrets, cookies or unsafe full URLs in the teaching trace  
**AND** every recorded event identifies the observing component.
