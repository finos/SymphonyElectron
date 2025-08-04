// analyze-size.js
const fs = require('fs');
const path = require('path');

function formatBytes(bytes) {
  const sizes = ['B', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i];
}

function getFolderSizeSync(dirPath) {
  let total = 0;

  const files = fs.readdirSync(dirPath);
  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    const stats = fs.statSync(fullPath);

    if (stats.isDirectory()) {
      total += getFolderSizeSync(fullPath);
    } else {
      total += stats.size;
    }
  }

  return total;
}

function analyzeDir(basePath) {
  const entries = fs.readdirSync(basePath);
  const result = [];

  for (const entry of entries) {
    const fullPath = path.join(basePath, entry);
    const stats = fs.statSync(fullPath);
    const size = stats.isDirectory() ? getFolderSizeSync(fullPath) : stats.size;

    result.push({ name: entry, size });
  }

  result.sort((a, b) => b.size - a.size);

  console.log(`\n📦 Size breakdown for: ${basePath}\n`);
  result.forEach((entry) => {
    console.log(`${formatBytes(entry.size).padEnd(10)}  ${entry.name}`);
  });

  const total = result.reduce((sum, e) => sum + e.size, 0);
  console.log(`\n🧮 Total size: ${formatBytes(total)}\n`);
}

// 🔧 Set your target directory here
analyzeDir(path.resolve(process.cwd(), 'dist/win-unpacked'));
