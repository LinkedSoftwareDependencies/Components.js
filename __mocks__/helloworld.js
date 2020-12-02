/**
 * A dummy Hello World module
 */
class Hello {

  constructor(...params) {
    this._params = params;
  }

  run() {
    console.log(this._params);
  }

}

module.exports = {
  Hello: Hello,
  HelloNested: {
    Deeper: {
      Hello: Hello,
    },
  },
  NoConstructor: new Hello(),
};
