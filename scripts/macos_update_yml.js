const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const yaml = require('js-yaml');

const INSTALLERS = 'installers/';

function updateYamlFile(yamlFilePath) {
  let doc = yaml.load(fs.readFileSync(yamlFilePath, 'utf-8'));
  doc.files[0].url = INSTALLERS + doc.files[0].url;
  doc.path = INSTALLERS + doc.path;
  fs.writeFileSync(yamlFilePath, yaml.dump(doc, { lineWidth: -1 }));
}

(async () => {
  const yamlFilePath = process.argv[2];
  updateYamlFile(yamlFilePath);
})();
