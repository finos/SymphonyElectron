import * as fs from 'fs';
import path = require('path');
import { isWindowsOS } from '../../../common/env';
import { logger } from '../../../common/logger';

const convertFileName = (filename: string): string => {
  return filename?.replace(/[^a-zA-Z0-9/_\.-]/g, '_');
};

const isValidWindowsFileName = (filename: string): boolean => {
  const invalidChars = /[<>:"/\\|?*\x00-\x1F]/;
  const reservedNames = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\..*)?$/i;

  return !invalidChars.test(filename) && !reservedNames.test(filename);
};

const isValidWindowsFilePath = (path: string) => {
  const unixPathRegex = /^\/([^\/]+\/)*([^\/]+)$/;
  const windowsPathRegex = /^[a-zA-Z]:\\([^\\]+\\)*([^\\]+)$/;

  if (isWindowsOS) {
    logger.info(
      `files-helper: indicating if ${path} is a valid window path - ${windowsPathRegex.test(
        path,
      )}`,
    );
    return windowsPathRegex.test(path);
  }

  return unixPathRegex.test(path);
};

const copyFiles = (
  sourceFolder: string,
  destinationFolder: string,
  filterCondition: string[] = [],
) => {
  if (!fs.existsSync(sourceFolder)) {
    logger.info(`files-helper: source folder isnt existed - ${sourceFolder}`);
    return;
  }

  if (!fs.existsSync(destinationFolder)) {
    fs.mkdirSync(destinationFolder, { recursive: true });
    logger.info(
      `files-helper: destination folder does not exist, starting to create - ${destinationFolder}`,
    );
  }

  fs.readdir(sourceFolder, (err, files) => {
    if (err) {
      logger.info(
        `files-helper: source folder cannot be read - ${sourceFolder}`,
      );
      return;
    }

    files.forEach((file) => {
      if (!(filterCondition.length < 1) || filterCondition.includes(file)) {
        const sourcePath = path.join(sourceFolder, file);
        const destinationPath = path.join(destinationFolder, file);

        logger.info(
          `files-helper: verified, file is included in filterCondition`,
        );
        copyOneSingleFile(sourcePath, destinationPath);
      }
    });
  });
};

const copyOneSingleFile = (sourceFile: string, destinationFile: string) => {
  if (!fs.existsSync(sourceFile)) {
    logger.info(`files-helper: source folder isnt existed - ${sourceFile}`);
    return;
  }

  if (!fs.existsSync(destinationFile)) {
    fs.mkdirSync(destinationFile, { recursive: true });
    logger.info(
      `files-helper: destination folder does not exist, starting to create - ${destinationFile}`,
    );
  }

  try {
    fs.copyFileSync(sourceFile, destinationFile);
    logger.info(`files-helper: copying ${sourceFile} to ${destinationFile}`);
  } catch (err) {
    logger.info(
      `files-helper: failed in performing copy ${sourceFile} to ${destinationFile}`,
    );
    logger.info(`files-helper: exception - ${err}`);
  }
};

const copyFileUsingReadWrite = (
  sourcePath: string,
  destinationPath: string,
) => {
  try {
    const logRead = fs.readFileSync(sourcePath, 'utf8');
    fs.writeFileSync(destinationPath, logRead);
    logger.info(
      `files-helper: copying file using read and write ${sourcePath} to ${destinationPath}`,
    );
  } catch (e) {
    logger.info(`files-helper: insuffient permission to copy the file`);
  }
};

export {
  convertFileName,
  isValidWindowsFileName,
  isValidWindowsFilePath,
  copyOneSingleFile,
  copyFiles,
  copyFileUsingReadWrite,
};
