const path = require('path');
const { flipFuses, FuseVersion, FuseV1Options } = require('@electron/fuses');
const fs = require('fs');
const {
  saveMetaData,
  getTotalSize,
  formatSize,
  getFolderSizes,
} = require('./helpers/script/script-helper');
const {
  compareAndPrint,
} = require('../scripts/helpers/terminal/terminal-helper');

const buildDir = './dist/win-unpacked';
const folderMetadataFile = './dist/bundle-analytics/folder-size-metadata.json';
const currentFolderMetaDataFile =
  './dist/bundle-analytics/folder-size-metadata.json';

const folderComparison = () => {
  console.log(
    '====================Build Size Changes By Folders====================\n',
  );

  const folderSizes = getFolderSizes(buildDir);
  let previousBuildSizeTotal = 0;
  let previousFolderSizes = {};
  if (fs.existsSync(folderMetadataFile)) {
    previousFolderSizes = JSON.parse(fs.readFileSync(folderMetadataFile));
    previousBuildSizeTotal = Object.values(previousFolderSizes).reduce(
      (prev, next) => prev + next,
      0,
    );
    console.log('Comparing with previous metadata...\n');
    compareAndPrint(folderSizes, previousFolderSizes, 0.01);

    return previousBuildSizeTotal;
  } else {
    console.log('No previous metadata found. Creating one...');
  }
  saveMetaData(folderSizes, currentFolderMetaDataFile);
};

const analyzeBundle = (context, totalPreviousBuildSize) => {
  console.log('\n====================Bundle overall====================\n');
  const appDir = context.appOutDir;
  console.log(`📦 Analyzing size of unpacked Electron app at: ${appDir}\n`);

  const entries = fs.readdirSync(appDir);
  let total = 0;

  for (const entry of entries) {
    // nosemgrep
    const fullPath = path.join(appDir, entry);
    const size = fs.statSync(fullPath).isDirectory()
      ? getTotalSize(fullPath, entry)
      : fs.statSync(fullPath).size;

    total += size;
    console.log(`${formatSize(size).padEnd(10)}  ${entry}`);
  }

  console.log(`\n🧮 Total pre-package size: ${formatSize(total)}\n`);
  console.log(
    `\n🧮 Overall Size Different: ${
      total - totalPreviousBuildSize > 0 ? 'INCREASED by' : 'DECREASED by'
    } ${formatSize(Math.abs(total - totalPreviousBuildSize))}\n`,
  );
};

module.exports = async function afterPack(context) {
  const {
    appOutDir,
    packager: { appInfo },
  } = context;
  const ext = {
    darwin: '.app',
    win32: '.exe',
    linux: [''],
  }[context.electronPlatformName];
  const electronBinaryPath = path.join(
    appOutDir,
    `${appInfo.productFilename}${ext}`,
  );
  await flipFuses(electronBinaryPath, {
    version: FuseVersion.V1,
    [FuseV1Options.EnableNodeCliInspectArguments]: false,
  });

  if (context.electronPlatformName === 'win32') {
    // Run comparison for folder changes
    const totalPreviousBuildSize = folderComparison();

    // Run comparison for bundle changes
    totalPreviousBuildSize && analyzeBundle(context, totalPreviousBuildSize);
  }
};
