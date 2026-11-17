type WorkspaceGlyph =
  | 'home'
  | 'play'
  | 'inspect'
  | 'layers'
  | 'shield'
  | 'arrow'
  | 'check'
  | 'browser'
  | 'server'
  | 'key'
  | 'database';

const paths: Record<WorkspaceGlyph, string> = {
  home: 'm3 10 9-7 9 7M5 9v12h5v-7h4v7h5V9',
  play: 'm8 4 12 8-12 8V4Z',
  inspect: 'm8 6-6 6 6 6m8-12 6 6-6 6m-3-15-2 18',
  layers: 'm12 3 10 5-10 5L2 8l10-5Zm-10 9 10 5 10-5M2 16l10 5 10-5',
  shield: 'm12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6l9-4Z',
  arrow: 'M5 12h14m-6-6 6 6-6 6',
  check: 'm5 12 5 5L20 7',
  browser: 'M3 3h18v14H3V3Zm-2 18h22M7 17l-1 4m11-4 1 4',
  server: 'M3 3h18v4H3V3Zm0 7h18v4H3v-4Zm0 7h18v4H3v-4ZM6 5h1m-1 7h1m-1 7h1m10-14h1m-1 7h1m-1 7h1',
  key: 'M14 3a7 7 0 0 0-6 10l-6 6v3h4v-3h3v-3l2-2a7 7 0 1 0 3-11Zm3 5h.01',
  database:
    'M21 6c0 2-4 4-9 4S3 8 3 6s4-4 9-4 9 2 9 4Zm0 0v12c0 2-4 4-9 4s-9-2-9-4V6m0 6c0 2 4 4 9 4s9-2 9-4',
};

export function WorkspaceIcon({ name }: { name: WorkspaceGlyph }) {
  return (
    <svg
      className="mc-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
