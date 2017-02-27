const path = require('path');

// use config provided by test framework
function pathToConfigDir() {
    return path.join(__dirname, '/../fixtures');
}
const app = {
    getAppPath: pathToConfigDir,
    getPath: function(type) {
        if (type === 'exe') {
            return path.join(pathToConfigDir(), '/Symphony.exe');
        }
        return pathToConfigDir();
    }
}

module.exports = {
  require: jest.genMockFunction(),
  match: jest.genMockFunction(),
  app: app,
  remote: jest.genMockFunction(),
  dialog: jest.genMockFunction()
};
