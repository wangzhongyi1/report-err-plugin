import ErrorStackParser from 'error-stack-parser';

class reportErrPlugin {
  constructor(option) {
    this.option = option;
    // 待上报信息
    this.waitReportList = [];
    this.init();
  }

  init() {
    this.registerVisibilitychange();
    this.globalCatchResourceLoadError();
    this.globalCatchJSError();
    this.globalCatchUnhandledrejection();
  }

  /**
   * 注册 visibilitychange 事件
   */
  registerVisibilitychange() {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState !== 'hidden') return;
      this._report();
    });
  }

  normalize(e) {
    return {
      timestamp: Date.now(),
      href: window.location.href, // 页面地址
      ...(Error.prototype.isPrototypeOf(e) ? { stack: ErrorStackParser.parse(e), name: e.name, message: e.message } : {})
    }
  }

  /**
   * 用户也可以手动调用这个函数进行 手动上报
   * @param {Error} err 错误实例
   */
  report(err) {
    this.waitReportList.push(this.normalize(err));
    // 达到最大数量就上报
    if (this.waitReportList.length >= (this.option.maxSize || 10)) {
      this._report();
    }
  }

  /**
   * 调用用户传进来的 上报方法 把信息上报到后端服务器
   */
  _report() {
    const { reportFunc } = this.option;
    const copy_waitReportList = JSON.parse(JSON.stringify(this.waitReportList));
    if (typeof reportFunc === 'function') {
      reportFunc(copy_waitReportList);
      // 清空数组
      this.clearReportList();
    } else {
      console.error('It seems like you forgot give `reportFunc` property');
    }
  }

  /**
   * 用户可以调用这个方法 强制上报到后端服务器
   */
  forceReport() {
    this._report();
  }

  clearReportList() {
    this.waitReportList.length = 0;
  }

  /**
   * 获取元素 id 或 class
   * @param {Element} el dom元素
   * @returns String
   */
  attachIdOrClass(el) {
    return (
      el.id
        ? `[id="${el.id}"]`
        : el.className
          ? `[class="${el.className}"]`
          : ''
    );
  }

  normalizeDomPath(element) {
    let str = element.nodeName.toLowerCase();
    let parent = element.parentElement;
    
    if (element.src) {
      str += `[src="${element.src}"]`;
    } else if (element.href) {
      str += `[href="${element.href}"]`;
    }

    str += this.attachIdOrClass(element);

    while (parent) {
      str = `${str} < ${parent.nodeName.toLowerCase()}${this.attachIdOrClass(parent)}`;
      parent = parent.parentElement;
    }

    return str;
  }

  /**
   * 捕获全局资源加载错误
   */
  globalCatchResourceLoadError() {
    window.addEventListener('error', (e) => {
      let el = e.target;
      if (el.src || el.href) {
        const domPath = this.normalizeDomPath(el);
        const customErr = new Error(domPath);
        customErr.name = 'ResourceError';
        customErr.message = `Cannot load resource of ${domPath}`;
        this.report(customErr);
      }
    }, true);
  }

  /**
   * 捕获全局 js 错误
   * 注意：在 vue 中不生效，应该使用 errorHandler 来捕获
   */
  globalCatchJSError() {
    window.addEventListener('error', (e) => {
      this.report(e.error);
    });
  }

  /**
   * 捕获全局未 catch 的 Promise 错误
   */
  globalCatchUnhandledrejection() {
    window.addEventListener('unhandledrejection', (e) => {
      this.report(e.reason);
    });
  }

  /**
   * 给 vue.use() 函数使用的vue插件，注册 errorHandler 事件
   * @param {vueInstance} app vue实例
   */
  install(app) {
    app.config.errorHandler = (e, instance, info) => {
      this.report(e);
    }
  }

}

export default reportErrPlugin;