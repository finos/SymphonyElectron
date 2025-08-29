const { bytesTo } = require('../script/script-helper');
const { DataMeasurement } = require('../../constant/unit');

const compareAndPrint = (currentSize, previousSize, threshHoldSize) => {
  const allKeys = new Set([
    ...Object.keys(currentSize),
    ...Object.keys(previousSize),
  ]);
  for (let key of allKeys) {
    const cur = currentSize[key] ?? 0;
    const prev = previousSize[key] ?? 0;
    const diff = cur - prev;
    const curMB = bytesTo(DataMeasurement.MB, cur);
    const diffMB = bytesTo(DataMeasurement.MB, Math.abs(diff));
    const output = `${key}: ${curMB} MB`;

    if (diff > threshHoldSize) {
      console.log(`${output} (INCREASED by ${diffMB} MB)`);
    }
  }
};

exports.compareAndPrint = compareAndPrint;

exports.default = {
  compareAndPrint,
};
