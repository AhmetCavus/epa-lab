declare const __PLAYGROUND_PRIVATE_OAUTH__: boolean;
declare const __PLAYGROUND_PRIVATE_ORIGIN__: string;

// This binding exists only in explicitly configured private Vite serving mode.
// Production/static builds always compile it off; URL parameters cannot enable it.
export const privateOAuthRuntime =
  __PLAYGROUND_PRIVATE_OAUTH__ && location.origin === __PLAYGROUND_PRIVATE_ORIGIN__;
