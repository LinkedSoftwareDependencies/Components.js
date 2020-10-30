import { UnnamedComponentFactory } from '../../lib/factory/UnnamedComponentFactory';
import { Loader } from '../../lib/Loader';
import { RdfObjectLoader, Resource } from 'rdf-object';
import * as fs from 'fs';

const Hello = require("../../__mocks__/helloworld").HelloNested.Deeper.Hello;
const N3 = require('n3');

describe('UnnamedComponentFactory', function () {

  let objectLoader: RdfObjectLoader;
  beforeEach(() => {
    // Create resources via object loader, so we can use CURIEs
    objectLoader = new RdfObjectLoader({ context: JSON.parse(fs.readFileSync(__dirname + '/../../components/context.jsonld', 'utf8')) });
  });

  describe('for an N3 Lexer', function () {
    let n3LexerComponent: Resource;
    let constructor: UnnamedComponentFactory;
    beforeEach(function () {
      n3LexerComponent = objectLoader.createCompactedResource({
        '@id': 'http://example.org/n3#Lexer',
        requireName: '"n3"',
        requireElement: '"Lexer"',
        arguments: {
          list: [
            {
              fields: [ { key: '"comments"', value: '"true"' } ]
            }
          ]
        }
      });
      constructor = new UnnamedComponentFactory(n3LexerComponent, true, {}, new Loader());
    });

    describe('#getArgumentValue', function () {
      it('should create valid literals', async() => {
        expect(await UnnamedComponentFactory.getArgumentValue(objectLoader.createCompactedResource('"application/trig"'), new Loader()))
          .toEqual('application/trig');
      });

      it('should create valid instances', async() => {
        const ret = await UnnamedComponentFactory.getArgumentValue(n3LexerComponent, new Loader());
        expect(ret).toBeTruthy();
        expect(ret).toBeInstanceOf(N3.Lexer);
      });
    });

    it('should be valid', function () {
      expect(constructor).toBeTruthy();
    });

    it('should create valid arguments', async() => {
      const args = await constructor.makeArguments();
      expect(args).toEqual([ { comments: [ 'true' ] } ]);
    });

    it('should make a valid instance', async() => {
      const ret = await UnnamedComponentFactory.getArgumentValue(n3LexerComponent, new Loader());
      expect(ret).toBeTruthy();
      expect(ret).toBeInstanceOf(N3.Lexer);
    });
  });

  describe('for an N3 Lexer with array arguments', function () {
    let n3LexerComponentArray: Resource;
    let constructor: UnnamedComponentFactory;
    beforeEach(function () {
      n3LexerComponentArray = objectLoader.createCompactedResource({
        '@id': 'http://example.org/n3#LexerArray',
        requireName: '"n3"',
        requireElement: '"Lexer"',
        arguments: {
          list: [
            {
              elements: [ { value: '"A"' }, { value: '"B"' }, { value: '"C"' } ]
            }
          ]
        }
      });
      constructor = new UnnamedComponentFactory(n3LexerComponentArray, true, {}, new Loader());
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
    let n3LexerComponent: Resource;
    let n3ParserComponent: Resource;
    let constructor: UnnamedComponentFactory;
    beforeEach(function () {
      n3LexerComponent = objectLoader.createCompactedResource({
        '@id': 'http://example.org/n3#Lexer',
        requireName: '"n3"',
        requireElement: '"Lexer"',
        arguments: {
          list: [
            {
              fields: [ { key: '"comments"', value: '"true"' } ]
            }
          ]
        }
      });
      n3ParserComponent = objectLoader.createCompactedResource({
        '@id': 'http://example.org/n3#Parser',
        requireName: '"n3"',
        requireElement: '"Parser"',
        arguments: {
          list: [
            {
              fields: [
                { key: '"format"', value: '"application/trig"' },
                { key: '"lexer"', value: n3LexerComponent },
              ]
            }
          ]
        }
      });
      constructor = new UnnamedComponentFactory(n3ParserComponent, true, {}, new Loader());
    });

    it('should be valid', function () {
      expect(constructor).toBeTruthy();
    });

    it('should create valid arguments', async() => {
      const args = await constructor.makeArguments();
      expect(args.length).toEqual(1);
      expect(args[0].format).toEqual([ 'application/trig' ]);
      expect(args[0].lexer).toBeTruthy();
      expect(args[0].lexer[0]).toBeInstanceOf(N3.Lexer);
    });

    it('should make a valid instance', async() => {
      const instance = await constructor.create();
      expect(instance).toBeTruthy();
      expect(instance).toBeInstanceOf(N3.Parser);
    });
  });

  describe('for a nested HelloWorld component', function () {
    let nestedHelloWorldComponent: Resource;
    let constructor: UnnamedComponentFactory;
    beforeEach(function () {
      nestedHelloWorldComponent = objectLoader.createCompactedResource({
        '@id': 'http://example.org/helloWorldNested',
        requireName: '"helloworld"',
        requireElement: '"HelloNested.Deeper.Hello"',
        arguments: {
          list: []
        }
      });
      constructor = new UnnamedComponentFactory(nestedHelloWorldComponent, true, {}, new Loader());
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
    let n3LexerComponentNoConstructor: Resource;
    let constructor: UnnamedComponentFactory;
    beforeEach(function () {
      n3LexerComponentNoConstructor = objectLoader.createCompactedResource({
        '@id': 'http://example.org/n3#LexerNoConstructor',
        requireName: '"n3"',
        requireElement: '"Lexer"',
        requireNoConstructor: '"true"'
      });
      constructor = new UnnamedComponentFactory(n3LexerComponentNoConstructor, true, {}, new Loader());
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
