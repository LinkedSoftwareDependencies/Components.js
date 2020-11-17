import type { Resource, RdfObjectLoader } from 'rdf-object';
import { UnnamedComponentFactory } from '../../lib/factory/UnnamedComponentFactory';
import type { IInstancePool } from '../../lib/IInstancePool';
import { Loader } from '../../lib/Loader';
import type { IModuleState } from '../../lib/ModuleStateBuilder';

const N3 = require('n3');
const Hello = require('../../__mocks__/helloworld').HelloNested.Deeper.Hello;

describe('UnnamedComponentFactory', () => {
  let loader: Loader;
  let objectLoader: RdfObjectLoader;
  let moduleState: IModuleState;
  let instancePool: IInstancePool;
  beforeEach(async() => {
    loader = new Loader();
    moduleState = <any> {
      mainModulePath: `${__dirname}/..`,
      importPaths: {
        'http://example.org/': `${__dirname}/`,
      },
    };
    (<any> loader).moduleState = moduleState;
    objectLoader = (<any> loader).objectLoader;
    instancePool = await loader.getInstancePool();
  });

  function makeConstructor(config: Resource) {
    return new UnnamedComponentFactory({
      objectLoader,
      config,
      constructable: true,
      overrideRequireNames: {},
      instancePool,
    });
  }

  describe('for an N3 Lexer', () => {
    let config: Resource;
    let constructor: UnnamedComponentFactory;
    beforeEach(() => {
      config = objectLoader.createCompactedResource({
        '@id': 'http://example.org/n3#Lexer',
        requireName: '"n3"',
        requireElement: '"Lexer"',
        arguments: {
          list: [
            {
              fields: [{ key: '"comments"', value: '"true"' }],
            },
          ],
        },
      });
      constructor = makeConstructor(config);
    });

    describe('#getArgumentValue', () => {
      it('should create valid literals', async() => {
        expect(await constructor.getArgumentValue(
          objectLoader.createCompactedResource('"application/trig"'),
          {},
        )).toEqual('application/trig');
      });

      it('should create valid instances', async() => {
        const ret = await constructor.getArgumentValue(config, {});
        expect(ret).toBeTruthy();
        expect(ret).toBeInstanceOf(N3.Lexer);
      });
    });

    it('should be valid', () => {
      expect(constructor).toBeTruthy();
    });

    it('should create valid arguments', async() => {
      const args = await constructor.createArguments({ moduleState });
      expect(args).toEqual([{ comments: [ 'true' ]}]);
    });

    it('should make a valid instance', async() => {
      const ret = await constructor.getArgumentValue(config, {});
      expect(ret).toBeTruthy();
      expect(ret).toBeInstanceOf(N3.Lexer);
    });
  });

  describe('for an N3 Lexer with array arguments', () => {
    let config: Resource;
    let constructor: UnnamedComponentFactory;
    beforeEach(() => {
      config = objectLoader.createCompactedResource({
        '@id': 'http://example.org/n3#LexerArray',
        requireName: '"n3"',
        requireElement: '"Lexer"',
        arguments: {
          list: [
            {
              elements: [{ value: '"A"' }, { value: '"B"' }, { value: '"C"' }],
            },
          ],
        },
      });
      constructor = makeConstructor(config);
    });

    it('should be valid', () => {
      expect(constructor).toBeTruthy();
    });

    it('should create valid arguments', async() => {
      const args = await constructor.createArguments({ moduleState });
      expect(args).toEqual([[ 'A', 'B', 'C' ]]);
    });

    it('should make a valid instance', async() => {
      const instance = await constructor.createInstance({ moduleState });
      expect(instance).toBeTruthy();
      expect(instance).toBeInstanceOf(N3.Lexer);
    });
  });

  describe('for an N3 Parser', () => {
    let n3LexerConfig: Resource;
    let n3ParserConfig: Resource;
    let constructor: UnnamedComponentFactory;
    beforeEach(() => {
      n3LexerConfig = objectLoader.createCompactedResource({
        '@id': 'http://example.org/n3#Lexer',
        requireName: '"n3"',
        requireElement: '"Lexer"',
        arguments: {
          list: [
            {
              fields: [{ key: '"comments"', value: '"true"' }],
            },
          ],
        },
      });
      n3ParserConfig = objectLoader.createCompactedResource({
        '@id': 'http://example.org/n3#Parser',
        requireName: '"n3"',
        requireElement: '"Parser"',
        arguments: {
          list: [
            {
              fields: [
                { key: '"format"', value: '"application/trig"' },
                { key: '"lexer"', value: n3LexerConfig },
              ],
            },
          ],
        },
      });
      constructor = makeConstructor(n3ParserConfig);
    });

    it('should be valid', () => {
      expect(constructor).toBeTruthy();
    });

    it('should create valid arguments', async() => {
      const args = await constructor.createArguments({ moduleState });
      expect(args.length).toEqual(1);
      expect(args[0].format).toEqual([ 'application/trig' ]);
      expect(args[0].lexer).toBeTruthy();
      expect(args[0].lexer[0]).toBeInstanceOf(N3.Lexer);
    });

    it('should make a valid instance', async() => {
      const instance = await constructor.createInstance({ moduleState });
      expect(instance).toBeTruthy();
      expect(instance).toBeInstanceOf(N3.Parser);
    });
  });

  describe('for a nested HelloWorld component', () => {
    let config: Resource;
    let constructor: UnnamedComponentFactory;
    beforeEach(() => {
      config = objectLoader.createCompactedResource({
        '@id': 'http://example.org/helloWorldNested',
        requireName: '"helloworld"',
        requireElement: '"HelloNested.Deeper.Hello"',
        arguments: {
          list: [],
        },
      });
      constructor = makeConstructor(config);
    });

    it('should be valid', () => {
      expect(constructor).toBeTruthy();
    });

    it('should create valid arguments', async() => {
      const args = await constructor.createArguments({ moduleState });
      expect(args).toEqual([]);
    });

    it('should make a valid instance', async() => {
      const instance = await constructor.createInstance({ moduleState });
      expect(instance).toBeTruthy();
      expect(instance).toBeInstanceOf(Hello);
    });
  });

  describe('for a HelloWorld component without constructor', () => {
    let config: Resource;
    let constructor: UnnamedComponentFactory;
    beforeEach(() => {
      config = objectLoader.createCompactedResource({
        '@id': 'http://example.org/helloWorldNested',
        requireName: '"helloworld"',
        requireElement: '"NoConstructor"',
        requireNoConstructor: '"true"',
      });
      constructor = makeConstructor(config);
    });

    it('should be valid', () => {
      expect(constructor).toBeTruthy();
    });

    it('should create valid arguments', async() => {
      const args = await constructor.createArguments({ moduleState });
      expect(args).toEqual([]);
    });

    it('should make a valid instance', async() => {
      const instance = await constructor.createInstance({ moduleState });
      expect(instance).toBeTruthy();
      expect(instance).toBeInstanceOf(Hello);
    });
  });
});
