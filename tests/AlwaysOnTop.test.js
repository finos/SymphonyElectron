var electron = require('electron');
var Application = require('spectron').Application;
var path = require('path');

var appPath = path.resolve(__dirname, '../dist/mac/Symphony.app/Contents/MacOS/Symphony');

describe('Test Suite for Always on Top', function () {
  beforeEach(function () {
    this.app = new Application({
      path: appPath
    })
    return this.app.start();
  });

  afterEach(function () {
    if (this.app && this.app.isRunning()) {
      return this.app.stop();
    }
  });

  describe('Always on Top', function () {
    it('should launch the app', function () {
      return this.app.client.getWindowCount().then(function (count) {
        expect(count).toEqual(1);
      })
    });

    it('should check isAlwaysOnTop', function () {
      return this.app.client.windowHandles().then(function (response) {
        expect(response.value.length).toEqual(1);
      });
    });

    it('should check browser window visibility', function () {
        return this.app.browserWindow.isVisible().then(function (visible) {
            expect(visible).toBe(true);
        });
    });

    it('should check is always on top', function() {
        return this.app.browserWindow.isAlwaysOnTop().then(function (isAlwaysOnTop) {
            expect(isAlwaysOnTop).toEqual(false);
        });
    });
  });
});