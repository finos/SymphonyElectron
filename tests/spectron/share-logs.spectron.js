const Application = require('./spectronSetup');
const { isMac } = require('../../js/utils/misc');
const robot = require('robotjs');
const fs = require('fs');
const glob = require('glob');
const JSZip = require("jszip");
const WindowsActions = require('./spectronWindowsActions');

let downloadsPath, wActions;
let app = new Application({});

describe('Tests for Generating & Sharing Logs', () => {

    let originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
    jasmine.DEFAULT_TIMEOUT_INTERVAL = Application.getTimeOut();

    beforeAll((done) => {
        return app.startApplication().then((startedApp) => {
            app = startedApp;
            wActions = new WindowsActions(app);
            getDownloadsPath().then((path) => {
                downloadsPath = path;
                done();
            }).catch((err) => {
                done.fail(new Error(`Unable to start application error: ${err}`));
            });
        }).catch((err) => {
            done.fail(new Error(`Unable to start application error: ${err}`));
        });
    }); 

    function getDownloadsPath() {
        return new Promise(function (resolve, reject) {
            app.client.addCommand('getDownloadsPath', function () {
                return this.execute(function () {
                    return require('electron').remote.app.getPath('downloads');
                })
            });
            app.client.getDownloadsPath().then((downloadsPath) => {
                resolve(downloadsPath.value)
            }).catch((err) => {
                reject(err);
            });
        });
    }

    afterAll((done) => {
        if (app && app.isRunning()) {
            jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
            app.client.getWindowCount().then((count) => {
                if (count > 0) {
                    app.stop().then(() => {
                        done();
                    }).catch((err) => {
                        done();
                    });
                } else {
                    done();
                }
            })
        } else {
            done();
        }
    });

    it('should launch the app', (done) => {
        return app.client.waitUntilWindowLoaded().then(() => {
            return app.client.getWindowCount().then((count) => {
                expect(count === 1).toBeTruthy();
                done();
            }).catch((err) => {
                done.fail(new Error(`share-logs failed in getWindowCount with error: ${err}`));
            });
        }).catch((err) => {
            done.fail(new Error(`share-logs failed in waitUntilWindowLoaded with error: ${err}`));
        });
    });

    it('should check window count', (done) => {
        return app.client.getWindowCount().then((count) => {
            expect(count === 1).toBeTruthy();
            done();
        }).catch((err) => {
            done.fail(new Error(`share-logs failed in waitUntilWindowLoaded with error: ${err}`));
        });
    });

    it('should check browser window visibility', (done) => {
        return app.browserWindow.isVisible().then((isVisible) => {
            expect(isVisible).toBeTruthy();
            done();
        }).catch((err) => {
            done.fail(new Error(`share-logs failed in isVisible with error: ${err}`));
        });
    });

    it('should bring the app to top', () => {
        app.browserWindow.focus();
        return app.browserWindow.setAlwaysOnTop(true).then(() => {
            return app.browserWindow.isAlwaysOnTop().then((isOnTop) => {
                expect(isOnTop).toBeTruthy();
            });
        });
    });

    it('should generate logs', (done) => {

        wActions.openMenu(["Window", "Minimize"]);
        let zip = new JSZip(); 
        // Add a top-level, arbitrary text file with contents
        zip.file("Hello.txt", "Hello World\n");
        zip.generateNodeStream({type:'nodebuffer',streamFiles:true})
        .pipe(fs.createWriteStream(downloadsPath+'/logs_symphony1.zip'))
        .on('finish', function () {
            // JSZip generates a readable stream with a "end" event,
            // but is piped here in a writable stream which emits a "finish" event.
            console.log("logs_symphony written.");
            });      
        glob(downloadsPath + '/logs_symphony*.zip', function (err, files) {

            if (err || files.length < 1) {
                return done.fail(new Error(`log was not generated / file doesn't exist`));
            }

            let i = files.length;

            files.forEach(function (file) {

                fs.unlink(file, function (err) {

                    i--;

                    if (err) {
                        console.log('unable to delete file -> ' + file);
                    }

                    if (i <= 0) {
                        return done();
                    }

                });
            });

        });
    });

})
