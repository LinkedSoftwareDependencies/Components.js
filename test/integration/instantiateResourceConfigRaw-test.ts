import type { RdfObjectLoader } from 'rdf-object';
import { ComponentsManager } from '../../lib/ComponentsManager';
import type { IConfigConstructorPool } from '../../lib/construction/IConfigConstructorPool';
import type { IConstructionSettings } from '../../lib/construction/IConstructionSettings';

const N3 = require('n3');
jest.mock('n3', () => ({
  Lexer: jest.fn((args: any) => ({ type: 'LEXER', args })),
  Parser: jest.fn((args: any) => ({ type: 'PARSER', args })),
  Util: { type: 'UTIL' },
}));

const Hello = require('../../__mocks__/helloworld').Hello;

describe('construction with component configs as Resource', () => {
  let manager: ComponentsManager<any>;
  let configConstructorPool: IConfigConstructorPool<any>;
  let objectLoader: RdfObjectLoader;
  let settings: IConstructionSettings;
  beforeEach(async() => {
    manager = await ComponentsManager.build({
      mainModulePath: __dirname,
      moduleState: <any> {},
      async moduleLoader() {
        // Register nothing
      },
    });
    configConstructorPool = manager.configConstructorPool;
    objectLoader = manager.objectLoader;
    settings = {};
    jest.clearAllMocks();
  });

  it('for a config instantiated with an argument', async() => {
    const config = objectLoader.createCompactedResource({
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
    const instance = await configConstructorPool.instantiate(config, settings);
    expect(instance.type).toEqual('LEXER');
    expect(N3.Lexer).toHaveBeenCalledWith({ comments: [ 'true' ]});
  });

  it('for a config instantiated with array arguments', async() => {
    const config = objectLoader.createCompactedResource({
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
    const instance = await configConstructorPool.instantiate(config, settings);
    expect(instance.type).toEqual('LEXER');
    expect(N3.Lexer).toHaveBeenCalledWith([ 'A', 'B', 'C' ]);
  });

  it('for a config instantiated with nesting', async() => {
    const n3LexerConfig = objectLoader.createCompactedResource({
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
    const config = objectLoader.createCompactedResource({
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
    const instance = await configConstructorPool.instantiate(config, settings);
    expect(instance.type).toEqual('PARSER');
    expect(N3.Parser).toHaveBeenCalledWith({
      format: [ 'application/trig' ],
      lexer: [
        {
          type: 'LEXER',
          args: { comments: [ 'true' ]},
        },
      ],
    });
  });

  it('for a config with requireElement to internal component', async() => {
    const config = objectLoader.createCompactedResource({
      requireName: '"helloworld"',
      requireElement: '"HelloNested.Deeper.Hello"',
      arguments: {
        list: [],
      },
    });
    const instance = await configConstructorPool.instantiate(config, settings);
    expect(instance).toBeInstanceOf(Hello);
  });

  it('for a config without instantation', async() => {
    const config = objectLoader.createCompactedResource({
      requireName: '"n3"',
      requireElement: '"Util"',
      requireNoConstructor: '"true"',
    });
    const instance = await configConstructorPool.instantiate(config, settings);
    expect(instance.type).toEqual('UTIL');
    expect(instance).toBe(N3.Util);
  });
});
