// scripts/before-pack.js
const fs = require('fs');
const path = require('path');

exports.default = async function (context) {
  const appDir = context.appOutDir;
  console.log(`\n📦 Analyzing size of unpacked Electron app at: ${appDir}\n`);

  const entries = fs.readdirSync(appDir);
  let total = 0;

  for (const entry of entries) {
    const fullPath = path.join(appDir, entry);
    const size = fs.statSync(fullPath).isDirectory()
      ? getTotalSize(fullPath)
      : fs.statSync(fullPath).size;

    total += size;
    console.log(`${formatSize(size).padEnd(10)}  ${entry}`);
  }

  console.log(`\n🧮 Total pre-package size: ${formatSize(total)}\n`);
};
