import { spawn } from 'node:child_process';

const npmCli = process.env.npm_execpath;

if (!npmCli) {
  console.error('Unable to locate npm. Run this command with npm run dev.');
  process.exit(1);
}

const commands = ['dev:api', 'dev:web'];
const children = commands.map((command) =>
  spawn(process.execPath, [npmCli, 'run', command], {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: process.env,
  })
);

let shuttingDown = false;

function terminateTree(child) {
  if (!child.pid || child.killed) return Promise.resolve();

  if (process.platform === 'win32') {
    return new Promise((resolve) => {
      const killer = spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], {
        stdio: 'ignore',
        windowsHide: true,
      });
      killer.once('error', resolve);
      killer.once('exit', resolve);
    });
  }

  child.kill('SIGTERM');
  return Promise.resolve();
}

async function stop(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;

  await Promise.all(children.map(terminateTree));
  process.exit(exitCode);
}

for (const child of children) {
  child.on('error', (error) => {
    console.error(`Failed to start a development service: ${error.message}`);
    void stop(1);
  });
  child.on('exit', (code, signal) => {
    if (!shuttingDown && code !== 0) {
      console.error(`A development service stopped (${signal ?? `exit ${code}`}).`);
      void stop(code ?? 1);
    }
  });
}

process.on('SIGINT', () => void stop());
process.on('SIGTERM', () => void stop());
