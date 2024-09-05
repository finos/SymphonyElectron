const path = require('path');
const { flipFuses, FuseVersion, FuseV1Options } = require('@electron/fuses');

module.exports = async function afterPack(context) {
  const {
    appOutDir,
    packager: { appInfo, platform },
  } = context;
  const ext = {
    darwin: '.app',
    win32: '.exe',
  }[context.electronPlatformName];
  const electronBinaryPath = path.join(
    appOutDir,
    `${appInfo.productFilename}${ext}`,
  );
  await flipFuses(electronBinaryPath, {
    version: FuseVersion.V1,
    [FuseV1Options.EnableNodeCliInspectArguments]: false,
  });
};
