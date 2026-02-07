const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const repoRoot = path.resolve(__dirname, '..');
const watchRoots = ['src', 'public'].map((relativePath) => path.join(repoRoot, relativePath));
const pollIntervalMs = Number.parseInt(process.env.DEV_POLL_INTERVAL_MS || '700', 10);

let appProcess = null;
let isRestarting = false;
let isShuttingDown = false;
let lastSignature = '';

function collectFiles(directory, results) {
  if (!fs.existsSync(directory)) {
    return;
  }

  const entries = fs.readdirSync(directory, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      collectFiles(fullPath, results);
      continue;
    }
    if (entry.isFile()) {
      results.push(fullPath);
    }
  }
}

function buildSignature() {
  const files = [];
  for (const root of watchRoots) {
    collectFiles(root, files);
  }

  files.sort();
  const hash = crypto.createHash('sha256');

  for (const filePath of files) {
    const stats = fs.statSync(filePath);
    hash.update(filePath);
    hash.update(':');
    hash.update(String(stats.size));
    hash.update(':');
    hash.update(String(stats.mtimeMs));
    hash.update('\n');
  }

  return hash.digest('hex');
}

function startApp() {
  appProcess = spawn(process.execPath, ['src/index.js'], {
    cwd: repoRoot,
    env: process.env,
    stdio: 'inherit'
  });

  appProcess.on('exit', (code, signal) => {
    if (isShuttingDown || isRestarting) {
      return;
    }
    if (code !== 0) {
      console.error(`[dev:docker] app exited with code ${code}${signal ? ` (signal ${signal})` : ''}`);
    }
  });
}

function restartApp(reason) {
  if (isShuttingDown || isRestarting) {
    return;
  }

  isRestarting = true;
  console.log(`[dev:docker] restart triggered (${reason})`);

  const previous = appProcess;
  if (!previous || previous.killed || previous.exitCode !== null || previous.signalCode !== null) {
    startApp();
    isRestarting = false;
    return;
  }

  previous.once('exit', () => {
    startApp();
    isRestarting = false;
  });
  previous.kill('SIGTERM');

  setTimeout(() => {
    if (!isRestarting || previous.killed) {
      return;
    }
    previous.kill('SIGKILL');
  }, 3000);
}

function shutdown(signal) {
  isShuttingDown = true;
  if (!appProcess || appProcess.killed || appProcess.exitCode !== null || appProcess.signalCode !== null) {
    process.exit(0);
    return;
  }

  appProcess.once('exit', () => process.exit(0));
  appProcess.kill(signal);
}

function tick() {
  let signature;
  try {
    signature = buildSignature();
  } catch (error) {
    console.error('[dev:docker] failed to read watch paths', error);
    return;
  }

  if (!lastSignature) {
    lastSignature = signature;
    return;
  }

  if (signature !== lastSignature) {
    lastSignature = signature;
    restartApp('source change');
  }
}

if (!Number.isFinite(pollIntervalMs) || pollIntervalMs < 100) {
  throw new Error('DEV_POLL_INTERVAL_MS must be a number >= 100');
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

lastSignature = buildSignature();
startApp();
setInterval(tick, pollIntervalMs);
