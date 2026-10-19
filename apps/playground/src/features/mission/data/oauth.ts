import type { Mission } from '../domain/mission';
import type { EvidenceField, FixtureEvent } from '../../protocol-flow/contracts';

// Allowlisted educational values only; never raw protocol payloads.
type OAuthExample =
  | { readonly kind: 'authorization'; readonly responseType: 'code'; readonly pkceMethod: 'S256' }
  | { readonly kind: 'exchange'; readonly client: 'BFF' }
  | { readonly kind: 'resource'; readonly credentialPurpose: 'Access Token' }
  | { readonly kind: 'provider-internal' };

function projectExample(example: OAuthExample): readonly EvidenceField[] {
  switch (example.kind) {
    case 'authorization':
      return [
        {
          labelKey: 'mission:definitions.oauthOidc.evidence.responseType',
          value: { kind: 'literal', value: example.responseType },
        },
        {
          labelKey: 'mission:definitions.oauthOidc.evidence.pkceMethod',
          value: { kind: 'literal', value: example.pkceMethod },
        },
      ];
    case 'exchange':
      return [
        {
          labelKey: 'mission:definitions.oauthOidc.evidence.channel',
          value: { kind: 'text', key: 'protocol-flow:channels.back' },
        },
        {
          labelKey: 'mission:definitions.oauthOidc.evidence.client',
          value: { kind: 'literal', value: example.client },
        },
      ];
    case 'resource':
      return [
        {
          labelKey: 'mission:definitions.oauthOidc.evidence.credentialPurpose',
          value: { kind: 'literal', value: example.credentialPurpose },
        },
        {
          labelKey: 'mission:definitions.oauthOidc.evidence.resourceType',
          value: { kind: 'text', key: 'mission:definitions.oauthOidc.evidence.syntheticOnly' },
        },
      ];
    case 'provider-internal':
      return [];
  }
}

const events: readonly FixtureEvent[] = [
  {
    id: 'authorization-example',
    kind: 'message',
    sourceActorId: 'browser',
    targetActorId: 'authorization-server',
    channel: {
      kind: 'front',
      labelKey: 'protocol-flow:channels.front',
    },
    visibility: 'explained',
    titleKey: 'mission:definitions.oauthOidc.events.authorization-example.title',
    summaryKey: 'mission:definitions.oauthOidc.events.authorization-example.summary',
    explanationKey: 'mission:definitions.oauthOidc.events.authorization-example.explanation',
    evidence: projectExample({ kind: 'authorization', responseType: 'code', pkceMethod: 'S256' }),
  },
  {
    id: 'provider-internal-example',
    kind: 'internal',
    actorId: 'authorization-server',
    channel: {
      kind: 'internal',
      labelKey: 'protocol-flow:channels.internal',
    },
    visibility: 'not-observable',
    titleKey: 'mission:definitions.oauthOidc.events.provider-internal-example.title',
    summaryKey: 'mission:definitions.oauthOidc.events.provider-internal-example.summary',
    explanationKey: 'mission:definitions.oauthOidc.events.provider-internal-example.explanation',
    evidence: projectExample({ kind: 'provider-internal' }),
  },
  {
    id: 'exchange-example',
    kind: 'message',
    sourceActorId: 'bff',
    targetActorId: 'authorization-server',
    channel: {
      kind: 'back',
      labelKey: 'protocol-flow:channels.back',
    },
    visibility: 'explained',
    titleKey: 'mission:definitions.oauthOidc.events.exchange-example.title',
    summaryKey: 'mission:definitions.oauthOidc.events.exchange-example.summary',
    explanationKey: 'mission:definitions.oauthOidc.events.exchange-example.explanation',
    evidence: projectExample({ kind: 'exchange', client: 'BFF' }),
  },
  {
    id: 'resource-example',
    kind: 'message',
    sourceActorId: 'bff',
    targetActorId: 'resource-server',
    channel: {
      kind: 'back',
      labelKey: 'protocol-flow:channels.back',
    },
    visibility: 'explained',
    titleKey: 'mission:definitions.oauthOidc.events.resource-example.title',
    summaryKey: 'mission:definitions.oauthOidc.events.resource-example.summary',
    explanationKey: 'mission:definitions.oauthOidc.events.resource-example.explanation',
    evidence: projectExample({ kind: 'resource', credentialPurpose: 'Access Token' }),
  },
];
export const oauthMission: Mission = {
  id: 'oauth-oidc',
  availability: 'fixture',
  illustration: 'identity',
  channels: [
    {
      kind: 'front',
      labelKey: 'protocol-flow:channels.front',
    },
    {
      kind: 'back',
      labelKey: 'protocol-flow:channels.back',
    },
    {
      kind: 'internal',
      labelKey: 'protocol-flow:channels.internal',
    },
  ],
  groups: [
    {
      id: 'person',
      actors: [
        {
          id: 'user',
          labelKey: 'mission:definitions.oauthOidc.actors.user.label',
          roleKey: 'mission:definitions.oauthOidc.actors.user.role',
          descriptionKey: 'mission:definitions.oauthOidc.actors.user.description',
        },
      ],
      labelKey: 'mission:definitions.oauthOidc.groups.person.label',
    },
    {
      id: 'device',
      actors: [
        {
          id: 'browser',
          labelKey: 'mission:definitions.oauthOidc.actors.browser.label',
          roleKey: 'mission:definitions.oauthOidc.actors.browser.role',
          descriptionKey: 'mission:definitions.oauthOidc.actors.browser.description',
        },
      ],
      labelKey: 'mission:definitions.oauthOidc.groups.device.label',
    },
    {
      id: 'application',
      actors: [
        {
          id: 'bff',
          labelKey: 'mission:definitions.oauthOidc.actors.bff.label',
          roleKey: 'mission:definitions.oauthOidc.actors.bff.role',
          descriptionKey: 'mission:definitions.oauthOidc.actors.bff.description',
        },
      ],
      labelKey: 'mission:definitions.oauthOidc.groups.application.label',
    },
    {
      id: 'keycloak',
      actors: [
        {
          id: 'authorization-server',
          labelKey: 'mission:definitions.oauthOidc.actors.authorization-server.label',
          roleKey: 'mission:definitions.oauthOidc.actors.authorization-server.role',
          descriptionKey: 'mission:definitions.oauthOidc.actors.authorization-server.description',
        },
        {
          id: 'identity-provider',
          labelKey: 'mission:definitions.oauthOidc.actors.identity-provider.label',
          roleKey: 'mission:definitions.oauthOidc.actors.identity-provider.role',
          descriptionKey: 'mission:definitions.oauthOidc.actors.identity-provider.description',
        },
      ],
      labelKey: 'mission:definitions.oauthOidc.groups.keycloak.label',
    },
    {
      id: 'resource',
      actors: [
        {
          id: 'resource-server',
          labelKey: 'mission:definitions.oauthOidc.actors.resource-server.label',
          roleKey: 'mission:definitions.oauthOidc.actors.resource-server.role',
          descriptionKey: 'mission:definitions.oauthOidc.actors.resource-server.description',
        },
      ],
      labelKey: 'mission:definitions.oauthOidc.groups.resource.label',
    },
  ],
  checkpoints: [
    {
      id: 'roles',
      actorIds: [
        'user',
        'browser',
        'bff',
        'authorization-server',
        'identity-provider',
        'resource-server',
      ],
      titleKey: 'mission:definitions.oauthOidc.checkpoints.roles.title',
      explanationKey: 'mission:definitions.oauthOidc.checkpoints.roles.explanation',
    },
    {
      id: 'authorization',
      actorIds: ['browser', 'bff', 'authorization-server'],
      titleKey: 'mission:definitions.oauthOidc.checkpoints.authorization.title',
      explanationKey: 'mission:definitions.oauthOidc.checkpoints.authorization.explanation',
    },
    {
      id: 'identity',
      actorIds: ['user', 'identity-provider'],
      titleKey: 'mission:definitions.oauthOidc.checkpoints.identity.title',
      explanationKey: 'mission:definitions.oauthOidc.checkpoints.identity.explanation',
    },
    {
      id: 'exchange',
      actorIds: ['bff', 'authorization-server'],
      titleKey: 'mission:definitions.oauthOidc.checkpoints.exchange.title',
      explanationKey: 'mission:definitions.oauthOidc.checkpoints.exchange.explanation',
    },
    {
      id: 'tokens',
      actorIds: ['bff', 'resource-server'],
      titleKey: 'mission:definitions.oauthOidc.checkpoints.tokens.title',
      explanationKey: 'mission:definitions.oauthOidc.checkpoints.tokens.explanation',
    },
    {
      id: 'resource',
      actorIds: ['bff', 'resource-server'],
      titleKey: 'mission:definitions.oauthOidc.checkpoints.resource.title',
      explanationKey: 'mission:definitions.oauthOidc.checkpoints.resource.explanation',
    },
    {
      id: 'evidence',
      actorIds: [],
      titleKey: 'mission:definitions.oauthOidc.checkpoints.evidence.title',
      explanationKey: 'mission:definitions.oauthOidc.checkpoints.evidence.explanation',
    },
  ],
  preview: {
    kind: 'fixture',
    events,
    noteKey: 'mission:definitions.oauthOidc.preview.note',
    loadLabelKey: 'mission:definitions.oauthOidc.preview.loadLabel',
  },
  titleKey: 'mission:definitions.oauthOidc.title',
  subtitleKey: 'mission:definitions.oauthOidc.subtitle',
  outcomeKey: 'mission:definitions.oauthOidc.outcome',
  objectiveKey: 'mission:definitions.oauthOidc.objective',
  previewLabelKey: 'mission:definitions.oauthOidc.previewLabel',
  topicKeys: [
    'mission:definitions.oauthOidc.topics.oauth',
    'mission:definitions.oauthOidc.topics.oidc',
    'mission:definitions.oauthOidc.topics.pkce',
    'mission:definitions.oauthOidc.topics.apiAuthorization',
  ],
};
