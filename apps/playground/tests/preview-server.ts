import { preview } from 'vite';

export default async function startPreviewServer() {
  // Own the server directly so teardown does not depend on shell process trees on Windows.
  const server = await preview({
    configFile: false,
    preview: { host: '127.0.0.1', port: 4173, strictPort: true },
  });

  return async () => {
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
