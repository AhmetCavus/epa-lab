import { z } from 'zod';
import { AuthorizationError } from '../../common/errors/authorization-error';
/** The complete server allowlist. No selector is ever interpolated into an upstream URL. */
export const allowedResourceSelection = {
  resourceType: 'Basic',
  resourceId: 'playground-demo',
} as const;

export interface ResourceSelection {
  readonly resourceType: string;
  readonly resourceId: string;
}

export function isAllowedResourceSelection(selection: ResourceSelection): boolean {
  return (
    selection.resourceType === allowedResourceSelection.resourceType &&
    selection.resourceId === allowedResourceSelection.resourceId
  );
}

const resourceSelectors = z.strictObject({
  resourceType: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[A-Z][A-Za-z0-9]*$/),
  resourceId: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[A-Za-z0-9.-]+$/),
});

export function readResourceSelection(
  query: Record<string, unknown>,
): ResourceSelection | undefined {
  if (Object.keys(query).length === 0) return undefined;
  const parsed = resourceSelectors.safeParse(query);
  if (!parsed.success || parsed.data.resourceId.includes('..')) {
    throw new AuthorizationError(
      { status: 400, code: 'malformedRequest' },
      'Provide exactly one bounded resourceType and resourceId.',
    );
  }
  return parsed.data;
}
