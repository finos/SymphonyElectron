const { getRawHeader } = require('@electron/asar');
const path = require('path');
const fs = require('fs');
const { saveMetaData } = require('./helpers/script/script-helper');
const {
  compareAndPrint,
} = require('../scripts/helpers/terminal/terminal-helper');

const folderSnapshotFile = './dist/asar-size-metadata.json';
const currentFolderMetaDataFile =
  './dist/bundle-analytics/asar-size-metadata.json';

function getTotalSize(record) {
  if ('size' in record) {
    // FileRecord
    return record.size;
  } else {
    // DirectoryRecord
    return Object.values(record.files).reduce(
      (sum, metadata) => sum + getTotalSize(metadata),
      0,
    );
  }
}

async function getFileSizes(archivePath) {
  const headerBuffer = await getRawHeader(archivePath);
  const files = {};

  for (const [fileName, fileMeta] of Object.entries(
    headerBuffer.header.files,
  )) {
    files[fileName] = getTotalSize(fileMeta);
  }

  let previousFolderSizes = {};

  if (fs.existsSync(folderSnapshotFile)) {
    previousFolderSizes = JSON.parse(fs.readFileSync(folderSnapshotFile));
    console.log('Comparing with previous metadata...\n');
    compareAndPrint(files, previousFolderSizes, 0.01);
  } else {
    console.log('No previous metadata found. Creating one...');
  }

  saveMetaData(files, currentFolderMetaDataFile);
  return files;
}

module.exports = async function afterSign(context) {
  if (context.electronPlatformName === 'win32') {
    const { appOutDir } = context;
    // nosemgrep
    const electronAsarPath = path.join(appOutDir, 'resources', 'app.asar');
    await getFileSizes(electronAsarPath);
  }
};
