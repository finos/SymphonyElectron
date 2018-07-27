const ui = require('./spectronInterfaces.js');

class WebActions {
    constructor(app) {
        this.app = app;
    }

    async minimizeWindowByClick() {
        await this.app.client.click(ui.MINIMIZED_BUTTON);
    }

    async closeWindowByClick() {
        await this.app.client.click(ui.CLOSE_BUTTON);
    }

    async openApplicationMenuByClick() {
        await this.app.client.click(ui.MAIN_MENU_ITEM);
    }

    async  getElementByXPath(xpath) {
        var elem = this.app.client.element(xpath);
        if (elem.isVisible()) {
            return elem;
        }
        return null;
    }
    async  inputText(el, data) {
        var obj = await this.getElementByXPath(el);
        if (obj != null)
            await this.app.client.setValue(el, data);
    }
    async clickElement(xpath,elementToVisible,timeOut=500)
    {     
        await this.app.client.click(xpath).then(async()=>
        {
            await  this.app.client.waitForExist(elementToVisible,timeOut);
           
        });
    }    

    async  login(user) {
        await this.inputText(ui.SIGN_IN_EMAIL, user.username);
        await this.inputText(ui.SIGN_IN_PASSWORD, user.password);
        await this.clickElement(ui.SIGN_IN_BUTTON,"#primaryCreateButton",60000);
    }
    async   scrollAndClick(selector,findElement)
    {
        var i =0;
        var y = 0;
        await this.app.client.scroll(selector,0,y);
        var size  =0;        
        while(i<10)
            {
                size  = this.app.client.getElementSize(findElement);                              
            if (findElement!=null && size ==0)
            {           
                y+=50;
                await this.app.client.scroll(selector,0,y);
            }
            else
            {
                await this.app.client.click(findElement);
                return;
            }
            i++;
        }
        return;
    }  
    async checkBox(selector)
    {
        var isCheck = true;
        var obj = await this.getElementByXPath(selector);
        var s =  await this.app.client.getAttribute(selector,'value').then(async(value)=>
            {
                await console.log(value);
            });
        return s;    
   }
   async promiseTimeout(ms, promiseFunc){

    return new Promise(function(resolve, reject){
  
      // create a timeout to reject promise if not resolved
      var timer = setTimeout(function(){
          reject(new Error("promise timeout"));
      }, ms);
  
      promiseFunc
          .then(function(res){
              clearTimeout(timer);
              resolve(res);
          })
          .catch(function(err){
              clearTimeout(timer);
              reject(err);
          });
    });
  };

}

module.exports = WebActions;
