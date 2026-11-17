/** Presentation default only. The BFF independently enforces its own finite allowlist. */
export const syntheticResource = { resourceType: 'Basic', resourceId: 'playground-demo' } as const;

export interface ResourceSelection {
  readonly resourceType: string;
  readonly resourceId: string;
}

export interface SyntheticBasic {
  readonly resourceType: 'Basic';
  readonly id: 'playground-demo';
  readonly code: {
    readonly coding: readonly [
      {
        readonly system: 'https://example.invalid/playground/demo';
        readonly code: 'oauth-learning-demo';
        readonly display: 'Fictional protocol learning resource';
      },
    ];
    readonly text: 'Synthetic non-clinical OAuth demonstration; no patient data';
  };
  readonly meta?: { readonly versionId?: string; readonly lastUpdated?: string };
}

interface ReadResult {
  readonly status: number | null;
  readonly source: 'hapi' | 'bff' | 'boundary' | 'unavailable';
  readonly messageKey: string;
}
export type ResourceReadResult = ReadResult &
  (
    | { readonly outcome: 'allowed'; readonly resource: SyntheticBasic }
    | { readonly outcome: 'denied' | 'not-found' | 'rejected' | 'unavailable' }
    | { readonly outcome: 'throttled'; readonly retryAfterSeconds: number | null }
  );
