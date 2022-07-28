const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const yaml = require('js-yaml');

const INSTALLERS = 'installers/';

function updateYamlFile(yamlFilePath, installerHash) {
  let doc = yaml.load(fs.readFileSync(yamlFilePath, 'utf-8'));
  doc.files[0].url = INSTALLERS + doc.files[0].url;
  doc.files[0].sha512 = installerHash;
  doc.path = INSTALLERS + doc.path;
  delete doc.sha512;
  doc.sha512 = installerHash;
  fs.writeFileSync(yamlFilePath, yaml.dump(doc, { lineWidth: -1 }));
}

function getHashFile(
  file,
  yamlFilePath,
  algorithm = 'sha512',
  encoding = 'base64',
  options,
) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash(algorithm);
    hash.on('error', reject).setEncoding(encoding);
    fs.createReadStream(
      file,
      Object.assign({}, options, {
        highWaterMark: 1024 * 1024,
        /* better to use more memory but hash faster */
      }),
    )
      .on('error', reject)
      .on('end', () => {
        hash.end();
        const installerHash = hash.read();
        console.log('hash done', installerHash);
        updateYamlFile(yamlFilePath, installerHash);
        resolve(installerHash);
      })
      .pipe(hash, {
        end: false,
      });
  });
}

(async () => {
  const installerPath = process.argv[2];
  const yamlFilePath = process.argv[3];
  await getHashFile(installerPath, yamlFilePath);
})();
