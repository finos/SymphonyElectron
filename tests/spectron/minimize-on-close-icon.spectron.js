const Application = require('./spectronSetup');
const { isMac } = require('../../js/utils/misc');
const robot = require('robotjs');

let configPath;
let app = new Application({
    startTimeout: Application.getTimeOut(),
    waitTimeout: Application.getTimeOut()
});

describe('Tests for Minimize on Close', () => {

    let originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
    jasmine.DEFAULT_TIMEOUT_INTERVAL = Application.getTimeOut();

    beforeAll((done) => {
        return app.startApplication().then((startedApp) => {
            app = startedApp;
            getConfigPath().then((config) => {
                configPath = config;
                done();
            }).catch((err) => {
                done.fail(new Error(`Unable to start application error: ${err}`));
            });
        }).catch((err) => {
            done.fail(new Error(`Unable to start application error: ${err}`));
        });
    });

    function getConfigPath() {
        return new Promise(function (resolve, reject) {
            app.client.addCommand('getUserDataPath', function () {
                return this.execute(function () {
                    return require('electron').remote.app.getPath('userData');
                })
            });
            app.client.getUserDataPath().then((userConfigPath) => {
                resolve(userConfigPath.value)
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
    it('should bring the app to top', () => {
        app.browserWindow.focus();
        return app.browserWindow.setAlwaysOnTop(true).then(() => {
            return app.browserWindow.isAlwaysOnTop().then((isOnTop) => {
                expect(isOnTop).toBeTruthy();
            });
        });
    });
    it('AVT-939:Verify Minimize on Close option once the application is installed', async () => {
        await Application.readConfig(configPath).then(async  (userConfig) => {
            if (isMac) {
                done();
              }
               //window
            else
            {
                if (!userConfig.minimizeOnClose) {                    
                    await app.browserWindow.getBounds().then(async (bounds) => {
                        //await app.browserWindow.moveTop();
                        await   robot.setMouseDelay(100);                               
                            let x = bounds.x + 95;
                            let y = bounds.y + 35;
                            await    robot.moveMouseSmooth(x, y);
                            await     robot.moveMouse(x, y);
                            console.log("x::"+x+"y::"+y);
                            await    robot.mouseClick();
                            await    app.client.click("#hamburger-menu-button"); 
                            await robot.setKeyboardDelay(1000);    
                            await        robot.keyTap('enter'); 
                            await     robot.keyTap('down');    
                            await     robot.keyTap('down'); 
                            await robot.keyTap('right');                                                  
                            for (let i = 0; i < 4; i++) { 
                                await robot.keyTap('down');
                                                        
                            }                         
                            await app.client.click("#title-bar-minimize-button"); 
                            await app.browserWindow.isMinimized().then(async function (minimized) {
                                await expect(minimized).toBeTruthy();                               
                            }).catch((err) => {
                                new Error(`minimize-on-close failed in isMinimized with error: ${err}`);
                            });                       
                    });
                } 
                else
                {
                    
                    await app.browserWindow.getBounds().then(async (bounds) => {
                        //await app.browserWindow.moveTop();
                        await   robot.setMouseDelay(100);                               
                        let x = bounds.x + 95;
                        let y = bounds.y + 35;
                        await    robot.moveMouseSmooth(x, y);
                        await     robot.moveMouse(x, y);
                        console.log("x:"+x+"y:"+y);
                        await    robot.mouseClick();
                        await    app.client.click("#hamburger-menu-button"); 
                        await robot.setKeyboardDelay(1000);    
                        await        robot.keyTap('enter'); 
                        await     robot.keyTap('down');    
                        await     robot.keyTap('down'); 
                        await robot.keyTap('right');                                                  
                        for (let i = 0; i < 4; i++) { 
                            await robot.keyTap('down');
                                                    
                        }                         
                        await app.client.click("#title-bar-minimize-button"); 
                        await app.browserWindow.isMinimized().then(async function (minimized) {
                            await expect(minimized).toBeTruthy();                               
                        }).catch((err) => {
                            new Error(`minimize-on-close failed in isMinimized with error: ${err}`);
                        });     
                        
                    });
                } 
            }
                
            
        }).catch((err) => {
            new Error(`minimize-on-close failed in readConfig with error: ${err}`);
        })
    });

});
