const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');

const INSTALLERS_URL = 'https://static.symphony.com/sda/';

function updateYamlFile(yamlFilePath) {
  let doc = yaml.load(fs.readFileSync(yamlFilePath, 'utf-8'));
  doc.files.map((file) => {
    file.url = INSTALLERS_URL + file.url;
  });
  delete doc.path;
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
  let yamlFilePath = process.argv[2];
  if (!fs.existsSync(yamlFilePath)) {
    const dir = path.dirname(yamlFilePath);
    if (fs.existsSync(dir)) {
      const files = fs
        .readdirSync(dir)
        .filter(
          (f) =>
            f.endsWith('.yml') &&
            !['stable.yml', 'beta.yml', 'daily.yml'].includes(f),
        );
      if (files.length > 0) {
        console.log(
          `${yamlFilePath} not found, copying ${files[0]} to ${yamlFilePath}`,
        );
        fs.copyFileSync(path.join(dir, files[0]), yamlFilePath);
      }
    }
  }
  updateYamlFile(yamlFilePath);
  generateChannelsFiles(yamlFilePath);
})();
