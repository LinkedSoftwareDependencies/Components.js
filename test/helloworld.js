/**
 * A dummy Hello World module
 */
class Hello {

  constructor(params) {
    this._params = params || {};
    this._say = (this._params['http://example.org/hello/say'] || ['World'])[0];
    this._hello = (this._params['http://example.org/hello/hello'] || ['Hello'])[0];
  }

  run() {
    console.log(this._hello + ' ' + this._say);
  }

}

module.exports = { Hello: Hello };