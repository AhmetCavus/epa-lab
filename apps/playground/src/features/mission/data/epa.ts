import type { Mission } from '../domain/mission';

export const epaMission: Mission = {
  id: 'epa-concept',
  availability: 'planned',
  illustration: 'protected-system',
  channels: [],
  groups: [
    {
      id: 'insured',
      actors: [
        {
          id: 'insured-person',
          labelKey: 'mission:definitions.epa.actors.insured-person.label',
          roleKey: 'mission:definitions.epa.actors.insured-person.role',
          descriptionKey: 'mission:definitions.epa.actors.insured-person.description',
        },
      ],
      labelKey: 'mission:definitions.epa.groups.insured.label',
    },
    {
      id: 'access',
      actors: [
        {
          id: 'fdv',
          labelKey: 'mission:definitions.epa.actors.fdv.label',
          roleKey: 'mission:definitions.epa.actors.fdv.role',
          descriptionKey: 'mission:definitions.epa.actors.fdv.description',
        },
      ],
      labelKey: 'mission:definitions.epa.groups.access.label',
    },
    {
      id: 'identity',
      actors: [
        {
          id: 'sectoral-idp',
          labelKey: 'mission:definitions.epa.actors.sectoral-idp.label',
          roleKey: 'mission:definitions.epa.actors.sectoral-idp.role',
          descriptionKey: 'mission:definitions.epa.actors.sectoral-idp.description',
        },
      ],
      labelKey: 'mission:definitions.epa.groups.identity.label',
    },
    {
      id: 'authorization',
      actors: [
        {
          id: 'epa-authorization',
          labelKey: 'mission:definitions.epa.actors.epa-authorization.label',
          roleKey: 'mission:definitions.epa.actors.epa-authorization.role',
          descriptionKey: 'mission:definitions.epa.actors.epa-authorization.description',
        },
      ],
      labelKey: 'mission:definitions.epa.groups.authorization.label',
    },
    {
      id: 'protected',
      actors: [
        {
          id: 'vau',
          labelKey: 'mission:definitions.epa.actors.vau.label',
          roleKey: 'mission:definitions.epa.actors.vau.role',
          descriptionKey: 'mission:definitions.epa.actors.vau.description',
        },
      ],
      labelKey: 'mission:definitions.epa.groups.protected.label',
    },
  ],
  checkpoints: [
    {
      id: 'actors',
      actorIds: ['insured-person', 'fdv', 'sectoral-idp', 'epa-authorization', 'vau'],
      titleKey: 'mission:definitions.epa.checkpoints.actors.title',
      explanationKey: 'mission:definitions.epa.checkpoints.actors.explanation',
    },
    {
      id: 'identity',
      actorIds: ['fdv', 'sectoral-idp'],
      titleKey: 'mission:definitions.epa.checkpoints.identity.title',
      explanationKey: 'mission:definitions.epa.checkpoints.identity.explanation',
    },
    {
      id: 'authorization',
      actorIds: ['epa-authorization'],
      titleKey: 'mission:definitions.epa.checkpoints.authorization.title',
      explanationKey: 'mission:definitions.epa.checkpoints.authorization.explanation',
    },
    {
      id: 'protected',
      actorIds: ['vau'],
      titleKey: 'mission:definitions.epa.checkpoints.protected.title',
      explanationKey: 'mission:definitions.epa.checkpoints.protected.explanation',
    },
    {
      id: 'evidence',
      actorIds: [],
      titleKey: 'mission:definitions.epa.checkpoints.evidence.title',
      explanationKey: 'mission:definitions.epa.checkpoints.evidence.explanation',
    },
  ],
  preview: {
    kind: 'concept',
    noteKey: 'mission:definitions.epa.preview.note',
  },
  titleKey: 'mission:definitions.epa.title',
  subtitleKey: 'mission:definitions.epa.subtitle',
  outcomeKey: 'mission:definitions.epa.outcome',
  objectiveKey: 'mission:definitions.epa.objective',
  previewLabelKey: 'mission:definitions.epa.previewLabel',
  topicKeys: [
    'mission:definitions.epa.topics.identity',
    'mission:definitions.epa.topics.authorization',
    'mission:definitions.epa.topics.protectedSystems',
  ],
};
