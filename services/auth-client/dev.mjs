import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const compiler = spawn(
  process.execPath,
  [require.resolve('typescript/bin/tsc'), '-p', 'tsconfig.build.json', '--watch'],
  { stdio: 'inherit' },
);
const server = spawn(process.execPath, ['--watch', 'dist/main.js'], { stdio: 'inherit' });

function stop() {
  compiler.kill('SIGTERM');
  server.kill('SIGTERM');
}

process.on('SIGINT', stop);
process.on('SIGTERM', stop);
compiler.on('error', stop);
server.on('error', stop);
compiler.on('exit', stop);
server.on('exit', stop);
