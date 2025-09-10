const fs = require('fs');
const path = require('path');
const { DataMeasurement } = require('../../constant/unit');

const getFolderSizes = (dir) => {
  let stats = {};
  const entries = fs.readdirSync(dir);

  for (let entry of entries) {
    // nosemgrep
    const fullPath = path.join(dir, entry);
    const stat = fs.statSync(fullPath);
    if (stat.isFile()) {
      stats[entry] = stat.size;
    } else if (stat.isDirectory()) {
      stats[entry] = getFolderSizeRecursive(fullPath);
    }
  }
  return stats;
};

const formatSize = (bytes) => {
  const units = Object.values(DataMeasurement);
  const unitIndex = bytes ? Math.floor(Math.log(bytes) / Math.log(1024)) : 0;
  const convertToSizeByUnit = (bytes / Math.pow(1024, unitIndex)).toFixed(2);

  return `${convertToSizeByUnit} ${units[unitIndex]}`;
};

const bytesTo = (unit, bytes) => {
  const units = Object.values(DataMeasurement);
  const unitIndex = units.indexOf(unit);
  return (bytes / Math.pow(1024, unitIndex)).toFixed(2);
};

const getTotalSize = (dir) => {
  try {
    let files = fs.readdirSync(dir);

    const filesSize = files.reduce((prev, next, index) => {
      // nosemgrep
      const full = path.join(dir, files[index]);
      const stats = fs.statSync(full);

      if (stats.isDirectory()) {
        return (prev += getTotalSize(full));
      } else {
        return (prev += stats.size);
      }
    }, 0);

    return filesSize;
  } catch (e) {
    console.log('getTotalSize: Error ' + e);
    return 0;
  }
};

const saveMetaData = (data, currentFolderSnapshotFile) => {
  const dirPath = path.dirname(currentFolderSnapshotFile);

  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`📁 Created folder: ${dirPath}`);
  }

  console.log(`📁 Saving New Metadata: ${dirPath}`);
  fs.writeFileSync(currentFolderSnapshotFile, JSON.stringify(data, null, 2));
};

const getFolderSizeRecursive = (folderPath) => {
  let totalSize = 0;
  const entries = fs.readdirSync(folderPath);

  for (let entry of entries) {
    // nosemgrep
    const fullPath = path.join(folderPath, entry);
    const stat = fs.statSync(fullPath);
    if (stat.isFile()) totalSize += stat.size;
    else if (stat.isDirectory()) totalSize += getFolderSizeRecursive(fullPath);
  }
  return totalSize;
};

const getAllFileSizes = (dir, baseDir = dir, stats = {}) => {
  const entries = fs.readdirSync(dir);

  for (let entry of entries) {
    // nosemgrep
    const fullPath = path.join(dir, entry);
    const relPath = path.relative(baseDir, fullPath);
    const stat = fs.statSync(fullPath);

    if (stat.isFile()) {
      stats[relPath] = stat.size;
    } else if (stat.isDirectory()) {
      getAllFileSizes(fullPath, baseDir, stats);
    }
  }

  return stats;
};

exports.formatSize = formatSize;
exports.bytesTo = bytesTo;
exports.getTotalSize = getTotalSize;
exports.saveMetaData = saveMetaData;
exports.getFolderSizes = getFolderSizes;

exports.default = {
  formatSize,
  bytesTo,
  getTotalSize,
  getFolderSizes,
  saveMetaData,
};
