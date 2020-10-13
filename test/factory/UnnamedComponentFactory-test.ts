import { Resource } from '../../lib/rdf/Resource';
import { UnnamedComponentFactory } from '../../lib/factory/UnnamedComponentFactory';
import { Loader } from '../../lib/Loader';

const Hello = require("../../__mocks__/helloworld").HelloNested.Deeper.Hello;
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

// Component definition for an N3 Parser
let nestedHelloWorldComponent = new Resource('http://example.org/n3#Parser', {
  requireName: Resource.newString('helloworld'),
  requireElement: Resource.newString('HelloNested.Deeper.Hello'),
  arguments: new Resource(null, {
    list: []
  })
});

// Component definition for an N3 Lexer with an array argument
let n3LexerComponentArray = new Resource('http://example.org/n3#Lexer', {
  requireName: Resource.newString('n3'),
  requireElement: Resource.newString('Lexer'),
  arguments: new Resource(null, {
    list: [
      new Resource("_:param_lexer_0", {
        elements: [ { v: new Resource('"A"') }, { v: new Resource('"B"') }, { v: new Resource('"C"') } ]
      })
    ]
  })
});

// Component definition for an N3 Lexer without constructor
let n3LexerComponentNoConstructor = new Resource('http://example.org/n3#Lexer', {
  requireName: Resource.newString('n3'),
  requireElement: Resource.newString('Lexer'),
  requireNoConstructor: Resource.newBoolean(true),
});

describe('UnnamedComponentFactory', function () {

  describe('#getArgumentValue', function () {
    it('should create valid literals', async() => {
      expect(await UnnamedComponentFactory.getArgumentValue(new Resource('"application/trig"'), new Loader()))
        .toEqual('application/trig');
    });

    it('should create valid instances', async() => {
      const ret = await UnnamedComponentFactory.getArgumentValue(n3LexerComponent, new Loader());
      expect(ret).toBeTruthy();
      expect(ret).toBeInstanceOf(N3.Lexer);
    });
  });

  describe('for an N3 Lexer', function () {
    let constructor: UnnamedComponentFactory;
    beforeEach(function () {
      constructor = new UnnamedComponentFactory(n3LexerComponent, true);
    });

    it('should be valid', function () {
      expect(constructor).toBeTruthy();
    });

    it('should create valid arguments', async() => {
      const args = await constructor.makeArguments();
      expect(args).toEqual([ { comments: 'true' } ]);
    });

    it('should make a valid instance', async() => {
      const ret = await UnnamedComponentFactory.getArgumentValue(n3LexerComponent, new Loader());
      expect(ret).toBeTruthy();
      expect(ret).toBeInstanceOf(N3.Lexer);
    });
  });

  describe('for an N3 Lexer with array arguments', function () {
    let constructor: UnnamedComponentFactory;
    beforeEach(function () {
      constructor = new UnnamedComponentFactory(n3LexerComponentArray, true);
    });

    it('should be valid', function () {
      expect(constructor).toBeTruthy();
    });

    it('should create valid arguments', async() => {
      const args = await constructor.makeArguments();
      expect(args).toEqual([['A', 'B', 'C']]);
    });

    it('should make a valid instance', async() => {
      const instance = await constructor.create();
      expect(instance).toBeTruthy();
      expect(instance).toBeInstanceOf(N3.Lexer);
    });
  });

  describe('for an N3 Parser', function () {
    let constructor: UnnamedComponentFactory;
    beforeEach(function () {
      constructor = new UnnamedComponentFactory(n3ParserComponent, true);
    });

    it('should be valid', function () {
      expect(constructor).toBeTruthy();
    });

    it('should create valid arguments', async() => {
      const args = await constructor.makeArguments();
      expect(args.length).toEqual(1);
      expect(args[0].format).toEqual('application/trig');
      expect(args[0].lexer).toBeTruthy();
      expect(args[0].lexer).toBeInstanceOf(N3.Lexer);
    });

    it('should make a valid instance', async() => {
      const instance = await constructor.create();
      expect(instance).toBeTruthy();
      expect(instance).toBeInstanceOf(N3.Parser);
    });
  });

  describe('for a nested HelloWorld component', function () {
    let constructor: UnnamedComponentFactory;
    beforeEach(function () {
      constructor = new UnnamedComponentFactory(nestedHelloWorldComponent, true);
    });

    it('should be valid', function () {
      expect(constructor).toBeTruthy();
    });

    it('should create valid arguments', async() => {
      const args = await constructor.makeArguments();
      expect(args).toEqual([]);
    });

    it('should make a valid instance', async() => {
      const instance = await constructor.create();
      expect(instance).toBeTruthy();
      expect(instance).toBeInstanceOf(Hello);
    });
  });

  describe('for an N3 Lexer without constructor', function () {
    let constructor: UnnamedComponentFactory;
    beforeEach(function () {
      constructor = new UnnamedComponentFactory(n3LexerComponentNoConstructor, true);
    });

    it('should be valid', function () {
      expect(constructor).toBeTruthy();
    });

    it('should make a valid instance', async() => {
      const instance = await constructor.create();
      expect(instance).toBeTruthy();
      expect(instance()).toBeInstanceOf(N3.Lexer);
    });
  });
});
