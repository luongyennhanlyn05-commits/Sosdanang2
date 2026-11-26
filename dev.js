import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('============================================================');
console.log('🚀 DANG KHOI DONG CHE DO PHAT TRIEN (DEV MODE)');
console.log('   - Backend API: http://localhost:5000');
console.log('   - Frontend UI: http://localhost:5173');
console.log('============================================================\n');

const isWin = process.platform === 'win32';
const npxCmd = isWin ? 'npx.cmd' : 'npx';

// 1. Khởi động Backend
const server = spawn('node', ['server.js'], {
  cwd: __dirname,
  env: { ...process.env, NO_OPEN: 'true' },
  stdio: 'inherit'
});

// 2. Khởi động Frontend Vite
const vite = spawn(npxCmd, ['vite', '--host', '0.0.0.0', '--port', '5173'], {
  cwd: __dirname,
  shell: isWin,
  stdio: 'inherit'
});

const cleanup = () => {
  try { server.kill(); } catch (e) {}
  try { vite.kill(); } catch (e) {}
  process.exit();
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
