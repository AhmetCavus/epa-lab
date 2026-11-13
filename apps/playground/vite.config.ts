import { createLogger, defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export function privateOrigin(candidate: string | undefined): string {
  try {
    const url = new URL(candidate ?? '');
    const hostname = url.hostname;
    const parts = hostname.split('.').map(Number);
    const ipv4 =
      parts.length === 4 &&
      parts.every((part) => Number.isInteger(part) && part >= 0 && part <= 255);
    const loopback = hostname === 'localhost' || hostname === '[::1]' || (ipv4 && parts[0] === 127);
    const privateIpv4 =
      ipv4 &&
      (parts[0] === 10 ||
        (parts[0] === 172 && (parts[1] ?? 0) >= 16 && (parts[1] ?? 0) <= 31) ||
        (parts[0] === 192 && parts[1] === 168));
    if (
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      (loopback || privateIpv4) &&
      candidate === url.origin &&
      !url.username &&
      !url.password
    ) {
      return url.origin;
    }
  } catch {
    // Configuration errors report field names only, never supplied values.
  }
  throw new Error('Private runtime requires a canonical local/private origin');
}

export default defineConfig(({ command, mode, isPreview }) => {
  const enabled = command === 'serve' && !isPreview && mode === 'private';
  const origin = enabled ? privateOrigin(process.env.PLAYGROUND_PRIVATE_ORIGIN) : '';
  const target = enabled ? privateOrigin(process.env.PLAYGROUND_BFF_TARGET) : undefined;
  const logger = createLogger();
  return {
    plugins: [react()],
    define: {
      __PLAYGROUND_PRIVATE_OAUTH__: JSON.stringify(enabled),
      __PLAYGROUND_PRIVATE_ORIGIN__: JSON.stringify(origin),
    },
    // Vite's default proxy error logger includes request URLs and exception stacks.
    // Private callback traffic must never reach that diagnostic surface.
    customLogger: enabled
      ? {
          ...logger,
          info: () => undefined,
          warn: () => logger.warn('Private runtime warning.'),
          warnOnce: () => logger.warnOnce('Private runtime warning.'),
          error: () => logger.error('Private runtime request unavailable.'),
        }
      : logger,
    server: {
      host: '127.0.0.1',
      strictPort: true,
      hmr: enabled ? false : undefined,
      proxy: enabled
        ? {
            '^/api/oauth(?:/|$)': {
              target,
              changeOrigin: false,
              xfwd: false,
              followRedirects: false,
              proxyTimeout: 35000,
              timeout: 35000,
            },
          }
        : undefined,
    },
  };
});
