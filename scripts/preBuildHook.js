const fs = require('fs');
const path = require('path');

function formatSize(bytes) {
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = bytes ? Math.floor(Math.log(bytes) / Math.log(1024)) : 0;
  return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + units[i];
}

function getTotalSize(dir) {
  let size = 0;
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stats = fs.statSync(fullPath);
    if (stats.isDirectory()) {
      size += getTotalSize(fullPath);
    } else {
      size += stats.size;
    }
  }
  return size;
}

const buildDir = path.resolve(__dirname, '../dist/win-unpacked');

if (!fs.existsSync(buildDir)) {
  console.error(`❌ Build directory not found: ${buildDir}`);
  process.exit(1);
}

console.log(`📦 Size breakdown of "${buildDir}":\n`);

const entries = fs.readdirSync(buildDir);
let total = 0;

for (const entry of entries) {
  const fullPath = path.join(buildDir, entry);
  const size = fs.statSync(fullPath).isDirectory()
    ? getTotalSize(fullPath)
    : fs.statSync(fullPath).size;

  total += size;
  console.log(`${formatSize(size).padEnd(10)}  ${entry}`);
}

console.log(`\n🧮 Total size before packaging: ${formatSize(total)}\n`);
