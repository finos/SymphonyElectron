const robot = require('robotjs');

class WindowsActions {
    constructor(app) {
        this.app = app;
    }

    async getCurrentWindowsSize() {
        var currentSize = {};
        await this.app.browserWindow.getBounds().then((bounds) => {
            currentSize["height"] = bounds.height;
            currentSize["width"] = bounds.width;
        })
        return currentSize;
    }

    async resizeWindows(width, height) {
        await this.app.browserWindow.getBounds().then((bounds) => {
            let x = bounds.x + (bounds.width - width);
            let y = bounds.y + (bounds.height - height);
            robot.setMouseDelay(500);
            robot.moveMouse(bounds.x, bounds.y);
            robot.mouseToggle("down");
            robot.dragMouse(x, y);
            robot.mouseToggle("up");
        })
    }

    async getCurrentWindowsPosition() {
        var currentPosition = {};
        await this.app.browserWindow.getBounds().then((bounds) => {
            currentPosition["y"] = bounds.y;
            currentPosition["x"] = bounds.x;
        })
        return currentPosition;
    }

    async dragWindows(x, y) {
        await this.app.browserWindow.getBounds().then((bounds) => {
            robot.setMouseDelay(500);
            robot.moveMouse(bounds.x + 200, bounds.y + 15);
            robot.mouseToggle("down");
            robot.moveMouse(bounds.x + 205, bounds.y + 15); // Workaround to make this keyword works properly, refer: https://github.com/octalmage/robotjs/issues/389
            robot.dragMouse(x + 205, y + 15);
            robot.mouseToggle("up");
        })
    }

    async maximizeWindows(){
        await this.app.browserWindow.getBounds().then((bounds) => {
            robot.setMouseDelay(500);
            robot.moveMouse(bounds.x + 200, bounds.y + 15);
            robot.mouseClick("left", "double");
        })
        await this.app.browserWindow.isMaximized().then(function (maximized) {
            expect(maximized).toBeTruthy();
        })
    }
}

module.exports = WindowsActions;