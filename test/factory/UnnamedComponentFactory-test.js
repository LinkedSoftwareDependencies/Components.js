require('should');
const Resource = require("../../lib/rdf/Resource").Resource;
const UnnamedComponentFactory = require("../../lib/factory/UnnamedComponentFactory").UnnamedComponentFactory;
const ComponentRunner = require("../../lib/ComponentRunner").ComponentRunner;
const fs = require("fs");
const N3 = require('n3');

// Component definition for an N3 Lexer
let n3LexerComponent = new Resource('http://example.org/n3#Lexer', {
  requireName: Resource.newString('n3'),
  requireElement: Resource.newString('Lexer'),
  arguments: new Resource(null, {
    list: [
      new Resource("_:param_lexer_0", {
        fields: [ { k: new Resource('"comments"'), v: new Resource('"true"') } ]
      })
    ]
  })
});

// Component definition for an N3 Parser
let n3ParserComponent = new Resource('http://example.org/n3#Parser', {
  requireName: Resource.newString('n3'),
  requireElement: Resource.newString('Parser'),
  arguments: new Resource(null, {
    list: [
      new Resource("_:param_parser_0", {
        fields: [
          { k: new Resource('"format"'), v: new Resource('"application/trig"') },
          { k: new Resource('"lexer"') , v: n3LexerComponent }
        ]
      })
    ]
  })
});

describe('UnnamedComponentFactory', function () {

  describe('#getArgumentValue', function () {
    it('should create valid literals', function () {
      UnnamedComponentFactory.getArgumentValue(new Resource('"application/trig"')).should.equal('application/trig');
    });

    it('should create valid instances', function () {
      let instance = UnnamedComponentFactory.getArgumentValue(n3LexerComponent, new ComponentRunner());
      instance.should.not.be.null();
      instance.should.be.instanceof(N3.Lexer);
    });
  });

  describe('for an N3 Lexer', function () {
    let constructor;
    beforeEach(function () {
      constructor = new UnnamedComponentFactory(n3LexerComponent, true);
    });

    it('should be valid', function () {
      constructor.should.not.be.null();
    });

    it('should create valid arguments', function () {
      constructor._makeArguments().should.deepEqual([ { comments: 'true' } ]);
    });

    it('should make a valid instance', function () {
      let instance = constructor.create();
      instance.should.not.be.null();
      instance.should.be.instanceof(N3.Lexer);
    });
  });

  describe('for an N3 Parser', function () {
    let constructor;
    beforeEach(function () {
      constructor = new UnnamedComponentFactory(n3ParserComponent, true);
    });

    it('should be valid', function () {
      constructor.should.not.be.null();
    });

    it('should create valid arguments', function () {
      let args = constructor._makeArguments();
      args.length.should.equal(1);
      args[0].format.should.equal('application/trig');
      args[0].lexer.should.not.be.null();
      args[0].lexer.should.be.instanceof(N3.Lexer);
    });

    it('should make a valid instance', function () {
      let instance = constructor.create();
      instance.should.not.be.null();
      instance.should.be.instanceof(N3.Parser);
    });
  });
});
