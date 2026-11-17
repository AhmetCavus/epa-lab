import { z } from 'zod';

const code = z.strictObject({
  coding: z.tuple([
    z.strictObject({
      system: z.literal('https://example.invalid/playground/demo'),
      code: z.literal('oauth-learning-demo'),
      display: z.literal('Fictional protocol learning resource'),
    }),
  ]),
  text: z.literal('Synthetic non-clinical OAuth demonstration; no patient data'),
});

/** Exact known upstream fixture; source metadata is accepted but never exposed. */
export const syntheticBasicSchema = z.strictObject({
  resourceType: z.literal('Basic'),
  id: z.literal('playground-demo'),
  code,
  meta: z
    .strictObject({
      versionId: z.string().max(64).optional(),
      lastUpdated: z.string().datetime({ offset: true }).optional(),
      source: z.string().max(2048).optional(),
    })
    .optional(),
});

export const safeSyntheticBasicSchema = z.strictObject({
  resourceType: z.literal('Basic'),
  id: z.literal('playground-demo'),
  code,
  meta: z
    .strictObject({
      versionId: z
        .string()
        .min(1)
        .max(64)
        .regex(/^[A-Za-z0-9.-]+$/)
        .optional(),
      lastUpdated: z.string().datetime({ offset: true }).optional(),
    })
    .optional(),
});
export type SafeSyntheticBasic = z.infer<typeof safeSyntheticBasicSchema>;
