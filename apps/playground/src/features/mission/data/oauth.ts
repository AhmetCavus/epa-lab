import type { Mission } from '../domain/mission';
import type { EvidenceField, FixtureEvent } from '../../protocol-flow/contracts';

const frontChannel = { kind: 'front', label: 'Front channel' } as const;
const backChannel = { kind: 'back', label: 'Back channel' } as const;
const internalChannel = { kind: 'internal', label: 'Provider internal' } as const;

// This allowlist describes educational examples, never raw protocol payloads.
type OAuthExample =
  | { readonly kind: 'authorization'; readonly responseType: 'code'; readonly pkceMethod: 'S256' }
  | { readonly kind: 'exchange'; readonly channel: 'Back channel'; readonly client: 'BFF' }
  | {
      readonly kind: 'resource';
      readonly credentialPurpose: 'Access Token';
      readonly data: 'Synthetic only';
    }
  | { readonly kind: 'provider-internal' };

function projectExample(example: OAuthExample): readonly EvidenceField[] {
  switch (example.kind) {
    case 'authorization':
      return [
        { label: 'Example response type', value: example.responseType },
        { label: 'Example PKCE method', value: example.pkceMethod },
      ];
    case 'exchange':
      return [
        { label: 'Channel', value: example.channel },
        { label: 'OAuth client', value: example.client },
      ];
    case 'resource':
      return [
        { label: 'Credential purpose', value: example.credentialPurpose },
        { label: 'Resource type', value: example.data },
      ];
    case 'provider-internal':
      return [];
  }
}

const events: readonly FixtureEvent[] = [
  {
    id: 'authorization-example',
    kind: 'message',
    title: 'Browser authorization redirect',
    sourceActorId: 'browser',
    targetActorId: 'authorization-server',
    channel: frontChannel,
    visibility: 'Explained',
    summary:
      'An example of the browser following a BFF-initiated redirect to the Authorization Server. No redirect occurred.',
    explanation:
      'The BFF is the OAuth client. It creates the authorization transaction; the browser carries the request to Keycloak. A learning checkpoint cannot pause or execute this redirect.',
    evidence: projectExample({ kind: 'authorization', responseType: 'code', pkceMethod: 'S256' }),
  },
  {
    id: 'provider-internal-example',
    kind: 'internal',
    title: 'Provider-internal PKCE binding',
    actorId: 'authorization-server',
    channel: internalChannel,
    visibility: 'Not observable',
    summary: 'A teaching note about a provider-internal check, not an instrumented event.',
    explanation:
      'The Authorization Server checks the verifier against the original challenge during code exchange. A BFF could observe the exchange outcome, but cannot claim a direct trace of this internal check.',
    evidence: projectExample({ kind: 'provider-internal' }),
  },
  {
    id: 'exchange-example',
    kind: 'message',
    title: 'Direct code exchange',
    sourceActorId: 'bff',
    targetActorId: 'authorization-server',
    channel: backChannel,
    visibility: 'Explained',
    summary:
      'An example of direct BFF-to-provider communication. No exchange or session was created.',
    explanation:
      'The BFF exchanges the authorization code and validates the OIDC response before establishing a session. Tokens stay server-side. This fixture contains no code, verifier, token response, or session result.',
    evidence: projectExample({ kind: 'exchange', channel: 'Back channel', client: 'BFF' }),
  },
  {
    id: 'resource-example',
    kind: 'message',
    title: 'Independent resource authorization',
    sourceActorId: 'bff',
    targetActorId: 'resource-server',
    channel: backChannel,
    visibility: 'Explained',
    summary:
      'An example of a protected-resource boundary. No resource request was sent or permitted.',
    explanation:
      'A Resource Server independently validates trust, issuer, audience, lifetime and permission for an Access Token. An ID Token describes an authentication result for the client and is not an API access credential.',
    evidence: projectExample({
      kind: 'resource',
      credentialPurpose: 'Access Token',
      data: 'Synthetic only',
    }),
  },
];

export const oauthMission: Mission = {
  id: 'oauth-oidc',
  title: 'OAuth 2.0 / OIDC',
  subtitle: 'Authorization Code + PKCE · fixture preview',
  outcome:
    'Understand the roles, browser redirects and server-side boundaries behind a secure sign-in journey.',
  objective:
    'Explain how a browser, confidential client and provider work together, and why API authorization is a separate decision.',
  topics: ['OAuth 2.0', 'OIDC', 'PKCE', 'API authorization'],
  availability: 'Fixture preview',
  previewLabel: 'Preview fixture',
  illustration: 'identity',
  channels: [frontChannel, backChannel, internalChannel],
  groups: [
    {
      id: 'person',
      label: 'User',
      actors: [
        {
          id: 'user',
          label: 'Human user',
          role: 'Resource Owner',
          description:
            'The person initiating the journey. The human, rather than the SPA, is the Resource Owner.',
        },
      ],
    },
    {
      id: 'device',
      label: 'User device',
      actors: [
        {
          id: 'browser',
          label: 'Browser / SPA',
          role: 'User agent',
          description:
            'Displays the playground and follows browser redirects. It is not the OAuth client in this architecture.',
        },
      ],
    },
    {
      id: 'application',
      label: 'Our application',
      actors: [
        {
          id: 'bff',
          label: 'NestJS BFF',
          role: 'OAuth / OIDC Client',
          description:
            'The proposed confidential client owns transactions, server-held tokens and the application session. No backend is connected to this preview.',
        },
      ],
    },
    {
      id: 'keycloak',
      label: 'Keycloak · one deployment',
      actors: [
        {
          id: 'authorization-server',
          label: 'Authorization Server',
          role: 'OAuth role',
          description:
            'Handles authorization requests and code exchange. This logical role shares the Keycloak deployment with the Identity Provider.',
        },
        {
          id: 'identity-provider',
          label: 'Identity Provider',
          role: 'OIDC / federation concept',
          description:
            'Authenticates the user in Keycloak’s UI. This is a logical role, not a second deployed server or an original OAuth 2.0 role.',
        },
      ],
    },
    {
      id: 'resource',
      label: 'Demo backend',
      actors: [
        {
          id: 'resource-server',
          label: 'Resource Server',
          role: 'API authorization',
          description:
            'Independently validates the Access Token and permissions before returning synthetic data in a future runnable mission.',
        },
      ],
    },
  ],
  checkpoints: [
    {
      id: 'roles',
      title: 'Understand the actors',
      explanation:
        'Separate the human user, browser, OAuth client, Authorization Server, Identity Provider and Resource Server. Two Keycloak roles share one deployment.',
      actorIds: [
        'user',
        'browser',
        'bff',
        'authorization-server',
        'identity-provider',
        'resource-server',
      ],
    },
    {
      id: 'authorization',
      title: 'Follow the front channel',
      explanation:
        'In a real flow, the BFF initiates a redirect and the browser navigates to Keycloak. This preview never starts authentication or leaves for a provider.',
      actorIds: ['browser', 'bff', 'authorization-server'],
    },
    {
      id: 'identity',
      title: 'Locate authentication',
      explanation:
        'Credentials belong in Keycloak’s login experience. The playground does not provide a password form or observe provider-internal authentication.',
      actorIds: ['user', 'identity-provider'],
    },
    {
      id: 'exchange',
      title: 'Examine the back channel',
      explanation:
        'The BFF correlates the callback, exchanges the code directly with Keycloak and validates the OIDC response. A successful exchange would not directly instrument Keycloak’s internal checks.',
      actorIds: ['bff', 'authorization-server'],
    },
    {
      id: 'tokens',
      title: 'Distinguish token purposes',
      explanation:
        'An ID Token conveys the authentication result to the client. An Access Token is used at the Resource Server. Neither belongs in this inspector.',
      actorIds: ['bff', 'resource-server'],
    },
    {
      id: 'resource',
      title: 'Find the API boundary',
      explanation:
        'A session alone does not prove API authorization. The Resource Server must check the intended audience, issuer, lifetime, trust and permission.',
      actorIds: ['bff', 'resource-server'],
    },
    {
      id: 'evidence',
      title: 'Review evidence limits',
      explanation:
        'Load the fixture samples to explore safe explanatory fields. None is an observed trace; no authentication, API permission or session outcome is demonstrated.',
      actorIds: [],
    },
  ],
  preview: {
    kind: 'fixture',
    note: 'Fixture-only preview. Samples explain a possible journey; no network operation, authentication or session is created.',
    loadLabel: 'Load fixture samples',
    events,
  },
};
