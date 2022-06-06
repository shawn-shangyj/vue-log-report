/**
 * 全局日志捕获：
 * a.JavaScript运行时错误（包括语法错误）发生时捕获
 * 1.InternalError: 内部错误，比如如递归爆栈;
 * 2.RangeError: 范围错误，比如new Array(-1);
 * 3.EvalError: 使用eval()时错误;
 * 4.ReferenceError: 引用错误，比如使用未定义变量;
 * 5.SyntaxError: 语法错误，比如var a = ;
 * 6.TypeError: 类型错误，比如[1,2].split(‘.’);
 * 7.URIError: 给 encodeURI或 decodeURl()传递的参数无效，比如decodeURI(‘%2’)
 * 8.Error: 上面7种错误的基类，通常是开发者抛出
 *
 * b.promise 没有reject处理的异常捕获
 *
 */
(function (global) {
  //创建对象并初始化
  var Logger = function (options) {
    return new Logger.init(options);
  };
  //
  Logger.prototype = {
    //得到全局捕获错误日志信息
    getErrorLog: function (errorMsg) {
      return Object.assign(
        { username: this.username, password: this.password },
        errorMsg,
        this.logExt
      );
    },
    //运行时错误捕获
    windowError: function (msg, url, line, col, error) {
      global.onerror = (msg, url, line, col, error) => {
        let errorMsg = {
          type: "windowError",
          name: error.name,
          message: error.message,
          stack: error.stack,
          browserInfo: this.getBrowserInfo(),
        };
        let errorLog = this.getErrorLog(errorMsg);
        //
        if (this.isReport) {
          this.sendAjax(errorLog);
        } else {
          this.logCallback(errorLog);
        }
        return true;
      };
    },
    //promise错误捕获
    unhandledrejection: function () {
      global.addEventListener("unhandledrejection", (event) => {
        let errorMsg = {
          type: "unhandledrejection",
          name: "promise",
          message: "promise.error",
          stack: event.reason,
          browserInfo: this.getBrowserInfo(),
        };
        let errorLog = this.getErrorLog(errorMsg);
        //
        if (this.isReport) {
          this.sendAjax(errorLog);
        } else {
          this.logCallback(errorLog);
        }
        return true;
      });
    },
    //得到浏览器版本
    getBrowserInfo: function () {
      let agent = navigator.userAgent.toLowerCase();
      let regStr_ie = /msie [\d.]+;/gi;
      let regStr_ff = /firefox\/[\d.]+/gi;
      let regStr_chrome = /chrome\/[\d.]+/gi;
      let regStr_saf = /safari\/[\d.]+/gi;
      //IE
      if (agent.indexOf("msie") > 0) {
        return agent.match(regStr_ie);
      }
      //firefox
      if (agent.indexOf("firefox") > 0) {
        return agent.match(regStr_ff);
      }
      //Safari
      if (agent.indexOf("safari") > 0 && agent.indexOf("chrome") < 0) {
        return agent.match(regStr_saf);
      }
      //Chrome
      if (agent.indexOf("chrome") > 0) {
        return agent.match(regStr_chrome);
      }
    },
    //上报服务器错误日志
    sendAjax: function (logDate) {
      var xhr = new XMLHttpRequest();
      xhr.timeout = 3000;
      xhr.responseType = "json";
      xhr.open("POST", this.reportAddress, true);
      xhr.setRequestHeader("Content-Type", "application/json; charset=UTF-8");
      xhr.send(JSON.stringify(logDate));
    },
  };
  //初始化
  Logger.init = function (options) {
    var self = this;
    if (options.username === "" || options.username === undefined) {
      throw new Error("无效的用户名");
    } else {
      self.username = options.username;
    }
    if (options.password === "" || options.password === undefined) {
      throw new Error("无效的密码");
    } else {
      self.password = options.password;
    }
    if (options.logEnv !== "production" && options.logEnv !== "development") {
      throw new Error("无效的环境变量");
    } else {
      self.logEnv = options.logEnv;
    }
    if (options.logExt !== undefined) {
      self.logExt = options.logExt;
    }
    if (options.isReport !== undefined) {
      self.isReport = options.isReport;
    }
    if (options.reportAddress !== undefined) {
      self.reportAddress = options.reportAddress;
    }
    if (options.logCallback !== undefined) {
      self.logCallback = options.logCallback;
    }
  };
  Logger.init.prototype = Logger.prototype;
  global.Logger = global.L$ = Logger;
})(window);

/**
 * 扩展vue初始化和vue错误捕获，vue指定组件的渲染和观察期间错误的捕获1
 */
const vueLogger = {
  install(Vue, options) {
    //初始化
    try {
      let vuel = L$(options);
      //生产环境添加全局捕获
      if (vuel.logEnv === "production") {
        vuel.windowError();
        vuel.unhandledrejection();
        // 扩展vue，vue捕获的错误不会上报到window.error
        Vue.config.errorHandler = function (error, vm, msg) {
          let errorMsg = {
            type: "vueErrorHandler",
            name: error.name,
            message: error.message,
            stack: error.stack,
            browserInfo: vuel.getBrowserInfo(),
          };
          let errorLog = vuel.getErrorLog(errorMsg);
          //
          if (vuel.isReport) {
            vuel.sendAjax(errorLog);
          } else {
            vuel.logCallback(errorLog);
          }
          return true;
        };
      }
      //包装日志类
      Vue.prototype.$log = function (...args) {
        if (vuel.logEnv === "production") return;
        console.log(...args);
      };
    } catch (error) {
      console.log(error);
    }
  },
};

export default vueLogger;
