import type { Mission } from '../domain/mission';

export const epaMission: Mission = {
  id: 'epa-concept',
  title: 'ePA / gematik',
  subtitle: 'Protected-system boundaries · conceptual layout',
  outcome:
    'Explore a conceptual map of identity, authorization and protected-system responsibilities in an ePA journey.',
  objective:
    'Test how different actors and security boundaries fit the workspace. Exact protocol choreography is a future specification decision.',
  topics: ['Identity boundaries', 'Authorization', 'Protected systems'],
  availability: 'Planned',
  previewLabel: 'Preview concept',
  illustration: 'protected-system',
  channels: [],
  groups: [
    {
      id: 'insured',
      label: 'Person',
      actors: [
        {
          id: 'insured-person',
          label: 'Insured person',
          role: 'User',
          description:
            'Illustrative initiator of a protected ePA journey. No real patient or medical data is used.',
        },
      ],
    },
    {
      id: 'access',
      label: 'Access channel',
      actors: [
        {
          id: 'fdv',
          label: 'FdV / client',
          role: 'Scenario-dependent',
          description:
            'Illustrative user-facing access channel. This layout does not imply an implemented browser-based FdV.',
        },
      ],
    },
    {
      id: 'identity',
      label: 'Identity boundary',
      actors: [
        {
          id: 'sectoral-idp',
          label: 'Sectoral IdP',
          role: 'Identity responsibility',
          description:
            'Illustrative authentication or federation responsibility, when applicable to a future specified scenario.',
        },
      ],
    },
    {
      id: 'authorization',
      label: 'Authorization boundary',
      actors: [
        {
          id: 'epa-authorization',
          label: 'ePA Authorization Service',
          role: 'Authorization responsibility',
          description:
            'A conceptual authorization boundary. No ePA authorization operation is implemented or demonstrated.',
        },
      ],
    },
    {
      id: 'protected',
      label: 'Protected subsystem',
      actors: [
        {
          id: 'vau',
          label: 'ePA system / VAU',
          role: 'Protected-system topic',
          description:
            'A protected subsystem and secure-communication topic to model separately. No live TI connection, exact sequence, or certification is claimed.',
        },
      ],
    },
  ],
  checkpoints: [
    {
      id: 'actors',
      title: 'Discover responsibilities',
      explanation:
        'These actor types test the layout. They do not imply that every actor participates in one sequence or that a specific ePA scenario has been implemented.',
      actorIds: ['insured-person', 'fdv', 'sectoral-idp', 'epa-authorization', 'vau'],
    },
    {
      id: 'identity',
      title: 'Examine identity boundaries',
      explanation:
        'Identify where identity or federation responsibilities could belong. Current applicable gematik specifications must determine the future scenario.',
      actorIds: ['fdv', 'sectoral-idp'],
    },
    {
      id: 'authorization',
      title: 'Inspect authorization boundaries',
      explanation:
        'Identity and authorization responsibilities are distinct. This conceptual map specifies no requests, decisions, credentials or operational results.',
      actorIds: ['epa-authorization'],
    },
    {
      id: 'protected',
      title: 'Understand protected systems',
      explanation:
        'A protected subsystem and secure-communication boundary need their own specification. No VAU behavior is simulated here.',
      actorIds: ['vau'],
    },
    {
      id: 'evidence',
      title: 'Separate concept from evidence',
      explanation:
        'There is no live integration, telemetry or simulated operational result. The empty timeline is intentional. This preview makes no gematik compliance or certification claim.',
      actorIds: [],
    },
  ],
  preview: {
    kind: 'concept',
    note: 'Planned — no live integration, telemetry or simulated operational results. Actor placement is conceptual and does not define a protocol sequence.',
  },
};
