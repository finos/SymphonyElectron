const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');

const INSTALLERS_URL = 'https://static.symphony.com/sda/';

function updateYamlFile(yamlFilePath) {
  let doc = yaml.load(fs.readFileSync(yamlFilePath, 'utf-8'));
  doc.files[0].url = INSTALLERS_URL + doc.files[0].url;
  doc.path = INSTALLERS_URL + doc.path;
  fs.writeFileSync(yamlFilePath, yaml.dump(doc, { lineWidth: -1 }));
}

function generateChannelsFiles(srcFile) {
  // "latest" channel is already created so we need to generate stable, beta and daily
  const targetedAutoUpdateChannels = ['stable', 'beta', 'daily'];
  for (const channel of targetedAutoUpdateChannels) {
    const updatedFileName = srcFile.replace('latest', channel);
    fs.copyFileSync(srcFile, updatedFileName);
  }
}

(async () => {
  const yamlFilePath = process.argv[2];
  updateYamlFile(yamlFilePath);
  generateChannelsFiles(yamlFilePath);
})();
