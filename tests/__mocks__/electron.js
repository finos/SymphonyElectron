const path = require('path');

function pathToConfigDir() {
    return path.join(__dirname, '..');
}
const app = {
    getAppPath: pathToConfigDir,
    getPath: pathToConfigDir
}

module.exports = {
  require: jest.genMockFunction(),
  match: jest.genMockFunction(),
  app: app,
  remote: jest.genMockFunction(),
  dialog: jest.genMockFunction()
};
