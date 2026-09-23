const { spawn } = require('child_process');
const path = require('path');

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const virtualEnvBin = path.join(process.cwd(), '.venv', process.platform === 'win32' ? 'Scripts' : 'bin');
const childEnv = {
  ...process.env,
  PATH: `${virtualEnvBin}${path.delimiter}${process.env.PATH || ''}`,
};
const services = [
  ['Node API', ['run', 'dev:backend']],
  ['FastAPI ML', ['run', 'dev:fastapi']],
  ['React UI', ['run', 'dev:frontend']],
];

const children = services.map(([name, args]) => {
  const child = spawn(npmCommand, args, {
    cwd: process.cwd(),
    env: childEnv,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  child.on('exit', (code, signal) => {
    if (code && code !== 0) {
      console.error(`[dev] ${name} exited with code ${code}${signal ? ` (${signal})` : ''}.`);
    }
  });
  return child;
});

function shutdown(signal) {
  for (const child of children) {
    if (!child.killed) child.kill(signal);
  }
  setTimeout(() => process.exit(0), 250).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

console.log('[dev] Starting Node API :5000, FastAPI ML :8000, and React UI :3000.');
