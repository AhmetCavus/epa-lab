import { createServer, preview, type ViteDevServer } from 'vite';

export default async function startPreviewServer() {
  // Own the server directly so teardown does not depend on shell process trees on Windows.
  const server = await preview({
    configFile: false,
    preview: { host: '127.0.0.1', port: 4173, strictPort: true },
  });
  const priorOrigin = process.env.PLAYGROUND_PRIVATE_ORIGIN;
  const priorTarget = process.env.PLAYGROUND_BFF_TARGET;
  process.env.PLAYGROUND_PRIVATE_ORIGIN = 'http://127.0.0.1:4174';
  // Runtime browser tests intercept these APIs. A missed route must fail safely.
  process.env.PLAYGROUND_BFF_TARGET = 'http://127.0.0.1:1';
  let privateServer: ViteDevServer | undefined;
  try {
    privateServer = await createServer({
      mode: 'private',
      server: { host: '127.0.0.1', port: 4174, strictPort: true },
    });
    await privateServer.listen();
  } finally {
    if (priorOrigin === undefined) delete process.env.PLAYGROUND_PRIVATE_ORIGIN;
    else process.env.PLAYGROUND_PRIVATE_ORIGIN = priorOrigin;
    if (priorTarget === undefined) delete process.env.PLAYGROUND_BFF_TARGET;
    else process.env.PLAYGROUND_BFF_TARGET = priorTarget;
  }

  return async () => {
    await privateServer?.close();
    if ('closeAllConnections' in server.httpServer) {
      server.httpServer.closeAllConnections();
    }
    await new Promise<void>((resolve, reject) => {
      server.httpServer.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  };
}
