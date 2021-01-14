import * as fs from 'fs';
import * as Path from 'path';
import { Readable } from 'stream';
import { ComponentsManager } from '../../lib/ComponentsManager';
import type { IModuleState } from '../../lib/loading/ModuleStateBuilder';
import { IRIS_DOAP, IRIS_OO, IRIS_RDF } from '../../lib/rdf/Iris';

const quad = require('rdf-quad');

const Hello = require('../../__mocks__/helloworld').Hello;

describe('construction with component configs as files', () => {
  let moduleState: IModuleState;
  let manager: ComponentsManager<any>;
  beforeEach(async() => {
    moduleState = <any> {
      mainModulePath: `${__dirname}/../../__mocks__`,
      importPaths: {
        'http://example.org/': `${__dirname}/../`,
      },
    };
    jest.clearAllMocks();
  });

  describe('for a module from a stream with 3 components', () => {
    const module = 'http://example.org/myModule';
    const component1 = 'http://example.org/myModule#mycomponent1';
    const component2 = 'http://example.org/myModule#mycomponent2';
    const component3 = 'http://example.org/myModule#mycomponent3';

    beforeEach(async() => {
      const moduleStream = new Readable({ objectMode: true });
      moduleStream.push(quad(module, IRIS_RDF.type, IRIS_OO.Module));
      moduleStream.push(quad(module, IRIS_OO.component, component1));
      moduleStream.push(quad(module, IRIS_DOAP.name, '"helloworld"'));
      moduleStream.push(quad(component1, IRIS_RDF.type, IRIS_OO.Class));
      moduleStream.push(quad(component1, IRIS_OO.componentPath, '"Hello"'));
      moduleStream.push(quad(component1, IRIS_OO.parameter, 'http://example.org/myModule/params#param1'));
      moduleStream.push(quad(component1, IRIS_OO.parameter, 'http://example.org/myModule/params#param3'));
      moduleStream.push(quad(module, IRIS_OO.component, component2));
      moduleStream.push(quad(component2, IRIS_RDF.type, IRIS_OO.Class));
      moduleStream.push(quad(component2, IRIS_OO.componentPath, '"Hello"'));
      moduleStream.push(quad(component2, IRIS_OO.parameter, 'http://example.org/myModule/params#param1'));
      moduleStream.push(quad(module, IRIS_OO.component, component3));
      moduleStream.push(quad(component3, IRIS_RDF.type, IRIS_OO.Class));
      moduleStream.push(quad(component3, IRIS_OO.componentPath, '"Hello"'));
      moduleStream.push(quad(component3, IRIS_OO.parameter, 'http://example.org/myModule/params#param2'));
      moduleStream.push(null);
      manager = await ComponentsManager.build({
        mainModulePath: __dirname,
        moduleState,
        async moduleLoader(registry) {
          await registry.registerModuleStream(moduleStream);
        },
      });
      manager.logger.error = jest.fn();
    });

    it('instantiated with a resource-based config', async() => {
      const configResource = manager.objectLoader.createCompactedResource({
        '@id': 'my:config',
        types: component1,
        'http://example.org/myModule/params#param1': '"ABC"',
        'http://example.org/myModule/params#param2': '"DEF"',
        'http://example.org/myModule/params#param3': '"GHI"',
      });

      const run = await manager.instantiate(configResource.value);
      expect(run).toBeInstanceOf(Hello);
      expect(run._params).toEqual([{
        'http://example.org/myModule/params#param1': [ 'ABC' ],
        'http://example.org/myModule/params#param3': [ 'GHI' ],
      }]);
    });

    it('instantiated with a stream-based config', async() => {
      const config1 = 'http://example.org/myModule#myconfig1';
      const configResourceStream = new Readable({ objectMode: true });
      configResourceStream.push(quad(config1, IRIS_RDF.type, component1));
      configResourceStream.push(quad(config1, 'http://example.org/myModule/params#param1', '"ABC"'));
      configResourceStream.push(quad(config1, 'http://example.org/myModule/params#param2', '"DEF"'));
      configResourceStream.push(quad(config1, 'http://example.org/myModule/params#param3', '"GHI"'));
      configResourceStream.push(null);
      await manager.configRegistry.registerStream(configResourceStream);

      const run = await manager.instantiate(config1);
      expect(run).toBeInstanceOf(Hello);
      expect(run._params).toEqual([{
        'http://example.org/myModule/params#param1': [ 'ABC' ],
        'http://example.org/myModule/params#param3': [ 'GHI' ],
      }]);
    });

    it('instantiated manually', async() => {
      const params: any = {};
      params['http://example.org/myModule/params#param1'] = 'ABC';
      params['http://example.org/myModule/params#param2'] = 'DEF';
      params['http://example.org/myModule/params#param3'] = 'GHI';
      await manager.configRegistry.registerCustom('my:config', component1, params);

      const run = await manager.instantiate('my:config');
      expect(run).toBeInstanceOf(Hello);
      expect(run._params).toEqual([{
        'http://example.org/myModule/params#param1': [ 'ABC' ],
        'http://example.org/myModule/params#param3': [ 'GHI' ],
      }]);
    });
  });

  describe('for a module from a JSON-LD file', () => {
    beforeEach(async() => {
      manager = await ComponentsManager.build({
        mainModulePath: __dirname,
        moduleState,
        async moduleLoader(registry) {
          await registry.registerModule(Path.join(__dirname, '../assets/module.jsonld'));
        },
      });
    });

    it('instantiated from a config file', async() => {
      await manager.configRegistry.register(Path.join(__dirname, '../assets/config.jsonld'));

      const run = await manager.instantiate('http://example.org/myconfig');
      expect(run).toBeInstanceOf(Hello);
      expect(run._params).toEqual([{
        'http://example.org/hello/hello': [ 'WORLD' ],
        'http://example.org/hello/say': [ 'HI' ],
      }]);
    });
  });

  describe('for a module from a Turtle file', () => {
    beforeEach(async() => {
      manager = await ComponentsManager.build({
        mainModulePath: __dirname,
        moduleState,
        async moduleLoader(registry) {
          await registry.registerModule(Path.join(__dirname, '../assets/module.ttl'));
        },
      });
    });

    it('instantiated from a config file', async() => {
      await manager.configRegistry.register(Path.join(__dirname, '../assets/config.jsonld'));

      const run = await manager.instantiate('http://example.org/myconfig');
      expect(run).toBeInstanceOf(Hello);
      expect(run._params).toEqual([{
        'http://example.org/hello/hello': [ 'WORLD' ],
        'http://example.org/hello/say': [ 'HI' ],
      }]);
    });
  });

  it('for an invalid module path', async() => {
    await expect(ComponentsManager.build({
      mainModulePath: __dirname,
      moduleState,
      async moduleLoader(registry) {
        await registry.registerModule(Path.join(__dirname, '../assets/module-unknown.ttl'));
      },
    })).rejects.toThrow(/^ENOENT: no such file or directory, stat/u);
  });

  it('for a module with imports', async() => {
    manager = await ComponentsManager.build({
      mainModulePath: __dirname,
      moduleState,
      async moduleLoader(registry) {
        await registry.registerModule(Path.join(__dirname, '../assets/module-imports.jsonld'));
      },
    });
    expect(manager.componentResources)
      .toHaveProperty([ 'http://example.org/HelloWorldModule#SayHelloComponent1' ]);
    expect(manager.componentResources)
      .toHaveProperty([ 'http://example.org/HelloWorldModule#SayHelloComponent2' ]);
  });

  describe('for constructor mappings', () => {
    beforeEach(async() => {
      manager = await ComponentsManager.build({
        mainModulePath: __dirname,
        moduleState,
        async moduleLoader(registry) {
          await registry.registerModule(Path.join(__dirname, '../assets/module-mapping.jsonld'));
        },
        async configLoader(registry) {
          await registry.register(Path.join(__dirname, '../assets/config-mapping.jsonld'));
        },
      });
    });

    it('instantiated for its first instance', async() => {
      const run = await manager.instantiate('http://example.org/myHelloWorld1');
      expect(run).toBeInstanceOf(Hello);
      expect(run._params).toEqual([{
        something1: [ 'SOMETHING1', 'SOMETHING2' ],
      }]);
    });

    it('instantiated for its second instance', async() => {
      const run = await manager.instantiate('http://example.org/myHelloWorld2');
      expect(run).toBeInstanceOf(Hello);
      expect(run._params).toEqual([[ 'SOMETHING3', 'SOMETHING4' ]]);
    });
  });

  describe('for nested instances', () => {
    beforeEach(async() => {
      manager = await ComponentsManager.build({
        mainModulePath: __dirname,
        moduleState,
        async moduleLoader(registry) {
          await registry.registerModule(Path.join(__dirname, '../assets/module.jsonld'));
        },
      });
    });

    it('instantiated with equal param instances', async() => {
      await manager.configRegistry.register(Path.join(__dirname, '../assets/config-referenced.jsonld'));

      const run = await manager.instantiate('http://example.org/myHelloWorld1');
      expect(run).toBeInstanceOf(Hello);
      expect(run._params).toEqual([{
        'http://example.org/hello/hello': [ new Hello({}) ],
        'http://example.org/hello/say': [ new Hello({}) ],
      }]);
      expect(run._params[0]['http://example.org/hello/hello'][0])
        .toBe(run._params[0]['http://example.org/hello/say'][0]);
    });

    it('instantiated with non-equal param instances', async() => {
      await manager.configRegistry.register(Path.join(__dirname, '../assets/config-unreferenced.jsonld'));

      const run = await manager.instantiate('http://example.org/myHelloWorld1');
      expect(run).toBeInstanceOf(Hello);
      expect(run._params).toEqual([{
        'http://example.org/hello/hello': [ new Hello({}) ],
        'http://example.org/hello/say': [ new Hello({}) ],
      }]);
      expect(run._params[0]['http://example.org/hello/hello'])
        .not.toBe(run._params[0]['http://example.org/hello/say']);
    });

    it('instantiated with itself as param instance should become undefined', async() => {
      await manager.configRegistry.register(Path.join(__dirname, '../assets/config-selfreferenced.jsonld'));

      const run = await manager.instantiate('http://example.org/myHelloWorld1');
      expect(run).toBeInstanceOf(Hello);
      expect(run._params).toEqual([{
        'http://example.org/hello/hello': [ undefined ],
      }]);
    });
  });

  describe('for inheritable params', () => {
    beforeEach(async() => {
      manager = await ComponentsManager.build({
        mainModulePath: __dirname,
        moduleState,
        async moduleLoader(registry) {
          await registry.registerModule(Path.join(__dirname, '../assets/module-inheritableparams.jsonld'));
        },
      });
    });

    it('instantiated should inherit param values', async() => {
      await manager.configRegistry
        .register(Path.join(__dirname, '../assets/config-inheritableparams.jsonld'));

      const run1 = await manager.instantiate('http://example.org/myHelloWorld1');
      expect(run1).toBeInstanceOf(Hello);
      expect(run1._params).toEqual([{
        'http://example.org/hello/something': [ 'SOMETHING' ],
      }]);

      const run2 = await manager.instantiate('http://example.org/myHelloWorld2');
      expect(run2).toBeInstanceOf(Hello);
      expect(run2._params).toEqual([{
        'http://example.org/hello/something': [ 'SOMETHING' ],
      }]);
    });
  });

  describe('for a component extending from an abstract component', () => {
    beforeEach(async() => {
      manager = await ComponentsManager.build({
        mainModulePath: __dirname,
        moduleState,
        async moduleLoader(registry) {
          await registry.registerModule(Path.join(__dirname, '../assets/module-subclass.jsonld'));
        },
      });
    });

    it('should be able to use params from the parent', async() => {
      await manager.configRegistry
        .register(Path.join(__dirname, '../assets/config-subclass.jsonld'));

      const run1 = await manager.instantiate('http://example.org/myHelloWorld1');
      expect(run1).toBeInstanceOf(Hello);
      expect(run1._params).toEqual([{
        'http://example.org/hello/something': [ 'SOMETHING1' ],
      }]);
    });

    it('should be able to use params from the parent parent', async() => {
      await manager.configRegistry
        .register(Path.join(__dirname, '../assets/config-subclass.jsonld'));

      const run1 = await manager.instantiate('http://example.org/myHelloWorld2');
      expect(run1).toBeInstanceOf(Hello);
      expect(run1._params).toEqual([{
        'http://example.org/hello/something': [ 'SOMETHING2' ],
      }]);
    });
  });

  describe('for a component extending from an abstract component with constructor args', () => {
    beforeEach(async() => {
      manager = await ComponentsManager.build({
        mainModulePath: __dirname,
        moduleState,
        async moduleLoader(registry) {
          await registry.registerModule(Path.join(__dirname, '../assets/module-subclassmapping.jsonld'));
        },
      });
    });

    it('should be able to use params from the parent', async() => {
      await manager.configRegistry
        .register(Path.join(__dirname, '../assets/config-subclassmapping.jsonld'));

      const run1 = await manager.instantiate('http://example.org/myHelloWorld1');
      expect(run1).toBeInstanceOf(Hello);
      expect(run1._params).toEqual([{
        something: [ 'SOMETHING' ],
        something1: [ 'SOMETHING1' ],
      }]);
    });

    it('should be able to use params from the parent parent', async() => {
      await manager.configRegistry
        .register(Path.join(__dirname, '../assets/config-subclassmapping.jsonld'));

      const run1 = await manager.instantiate('http://example.org/myHelloWorld2');
      expect(run1).toBeInstanceOf(Hello);
      expect(run1._params).toEqual([{
        something: [ 'SOMETHING' ],
        something1: [ 'SOMETHING1' ],
        something2: [ 'SOMETHING2' ],
      }]);
    });

    it('should be able to use params from the parent parent parent', async() => {
      await manager.configRegistry
        .register(Path.join(__dirname, '../assets/config-subclassmapping.jsonld'));

      const run1 = await manager.instantiate('http://example.org/myHelloWorld3');
      expect(run1).toBeInstanceOf(Hello);
      expect(run1._params).toEqual([{
        something: [ 'SOMETHING' ],
        something1: [ 'SOMETHING1' ],
        something2: [ 'SOMETHING2' ],
      }]);
    });
  });

  describe('for a component extending from an abstract component and inheritable params', () => {
    beforeEach(async() => {
      manager = await ComponentsManager.build({
        mainModulePath: __dirname,
        moduleState,
        async moduleLoader(registry) {
          await registry.registerModule(Path.join(__dirname,
            '../assets/module-inheritableparams-subclassmapping.jsonld'));
        },
      });
    });

    it('should inherit param values from the parent', async() => {
      await manager.configRegistry
        .register(Path.join(__dirname, '../assets/config-inheritableparams.jsonld'));

      const run1 = await manager.instantiate('http://example.org/myHelloWorld1');
      expect(run1).toBeInstanceOf(Hello);
      expect(run1._params).toEqual([{
        something: [ 'SOMETHING' ],
      }]);

      const run2 = await manager.instantiate('http://example.org/myHelloWorld2');
      expect(run2).toBeInstanceOf(Hello);
      expect(run2._params).toEqual([{
        something: [ 'SOMETHING' ],
      }]);
    });
  });

  describe('for a component with constructor args with entry collection', () => {
    beforeEach(async() => {
      manager = await ComponentsManager.build({
        mainModulePath: __dirname,
        moduleState,
        async moduleLoader(registry) {
          await registry.registerModule(Path.join(__dirname, '../assets/module-dynamicentries.jsonld'));
        },
      });
    });

    it('should collect entries for a first instance', async() => {
      await manager.configRegistry
        .register(Path.join(__dirname, '../assets/config-dynamicentries.jsonld'));

      const run1 = await manager.instantiate('http://example.org/myHelloWorld1');
      expect(run1).toBeInstanceOf(Hello);
      expect(run1._params).toEqual([{
        KEY1: 'VALUE1',
        KEY2: 'VALUE2',
      }]);
    });

    it('should collect entries for a second instance', async() => {
      await manager.configRegistry
        .register(Path.join(__dirname, '../assets/config-dynamicentries.jsonld'));

      const run1 = await manager.instantiate('http://example.org/myHelloWorld2');
      expect(run1).toBeInstanceOf(Hello);
      expect(run1._params).toEqual([{
        KEY3: 'VALUE3',
        KEY4: 'VALUE4',
      }]);
    });
  });

  describe('for a component with constructor args extending from a parent with entry collection', () => {
    beforeEach(async() => {
      manager = await ComponentsManager.build({
        mainModulePath: __dirname,
        moduleState,
        async moduleLoader(registry) {
          await registry.registerModule(Path.join(__dirname,
            '../assets/module-subclassmapping-dynamicentries.jsonld'));
        },
      });
    });

    it('should collect entries for a first instance', async() => {
      await manager.configRegistry
        .register(Path.join(__dirname, '../assets/config-subclassmapping-dynamicentries.jsonld'));

      const run1 = await manager.instantiate('http://example.org/myHelloWorld1');
      expect(run1).toBeInstanceOf(Hello);
      expect(run1._params).toEqual([{
        '0KEY1': '0VALUE1',
        '0KEY2': '0VALUE2',
        '1KEY1': '1VALUE1',
        '1KEY2': '1VALUE2',
      }]);
    });

    it('should collect entries for a second instance', async() => {
      await manager.configRegistry
        .register(Path.join(__dirname, '../assets/config-subclassmapping-dynamicentries.jsonld'));

      const run1 = await manager.instantiate('http://example.org/myHelloWorld2');
      expect(run1).toBeInstanceOf(Hello);
      expect(run1._params).toEqual([{
        '0KEY1': '0VALUE1',
        '0KEY2': '0VALUE2',
        '1KEY1': '1VALUE1',
        '1KEY2': '1VALUE2',
        '2KEY1': '2VALUE1',
        '2KEY2': '2VALUE2',
      }]);
    });
  });

  describe(`for a component with constructor args extending from a parent with entry collection and inheritable params`, () => {
    beforeEach(async() => {
      manager = await ComponentsManager.build({
        mainModulePath: __dirname,
        moduleState,
        async moduleLoader(registry) {
          await registry.registerModule(Path.join(__dirname,
            '../assets/module-inheritableparams-subclassmapping-dynamicentries.jsonld'));
        },
      });
    });

    it('should collect entries for a first instance', async() => {
      await manager.configRegistry
        .register(Path.join(__dirname, '../assets/config-dynamicentries2.jsonld'));

      const run1 = await manager.instantiate('http://example.org/myHelloWorld1');
      expect(run1).toBeInstanceOf(Hello);
      expect(run1._params).toEqual([{
        somethings1: {
          KEY1: 'VALUE1',
          KEY2: 'VALUE2',
        },
      }]);
    });

    it('should collect entries for a second instance and inherit from the first', async() => {
      await manager.configRegistry
        .register(Path.join(__dirname, '../assets/config-dynamicentries2.jsonld'));

      const run1 = await manager.instantiate('http://example.org/myHelloWorld1');
      expect(run1).toBeInstanceOf(Hello);
      expect(run1._params).toEqual([{
        somethings1: {
          KEY1: 'VALUE1',
          KEY2: 'VALUE2',
        },
      }]);

      const run2 = await manager.instantiate('http://example.org/myHelloWorld2');
      expect(run2).toBeInstanceOf(Hello);
      expect(run2._params).toEqual([{
        somethings1: {
          KEY1: 'VALUE1',
          KEY2: 'VALUE2',
        },
        somethings2: {
          KEY1: 'VALUE1',
          KEY2: 'VALUE2',
        },
        somethings3: {
          KEY3: 'VALUE3',
          KEY4: 'VALUE4',
        },
      }]);
    });
  });

  describe(`for a component with constructor args with entry collection and inheritable params`, () => {
    beforeEach(async() => {
      manager = await ComponentsManager.build({
        mainModulePath: __dirname,
        moduleState,
        async moduleLoader(registry) {
          await registry.registerModule(Path.join(__dirname,
            '../assets/module-inheritableparams-dynamicentries.jsonld'));
        },
      });
    });

    it('should collect entries for a second instance and inherit from the first', async() => {
      await manager.configRegistry
        .register(Path.join(__dirname, '../assets/config-inheritableparams-dynamicentries.jsonld'));

      const run1 = await manager.instantiate('http://example.org/myHelloWorld1');
      expect(run1).toBeInstanceOf(Hello);
      expect(run1._params).toEqual([{
        KEY1: 'VALUE1',
        KEY2: 'VALUE2',
      }]);

      const run2 = await manager.instantiate('http://example.org/myHelloWorld2');
      expect(run2).toBeInstanceOf(Hello);
      expect(run2._params).toEqual([{
        KEY1: 'VALUE1',
        KEY2: 'VALUE2',
      }]);
    });
  });

  describe(`for a component with typed params`, () => {
    beforeEach(async() => {
      manager = await ComponentsManager.build({
        mainModulePath: __dirname,
        moduleState,
        async moduleLoader(registry) {
          await registry.registerModule(Path.join(__dirname, '../assets/module-paramranges.jsonld'));
        },
      });
    });

    it('should throw on invalid param values', async() => {
      await manager.configRegistry
        .register(Path.join(__dirname, '../assets/config.jsonld'));
      manager.logger.error = jest.fn();

      await expect(manager.instantiate('http://example.org/myconfig')).rejects
        .toThrow(`Parameter value "HI" is not of required range type "http://www.w3.org/2001/XMLSchema#boolean"`);
      expect(fs.existsSync('componentsjs-error-state.json')).toBeTruthy();
      fs.unlinkSync('componentsjs-error-state.json');
    });

    it('should cast valid param values', async() => {
      await manager.configRegistry
        .register(Path.join(__dirname, '../assets/config-paramranges.jsonld'));

      const run1 = await manager.instantiate('http://example.org/myconfig2');
      expect(run1).toBeInstanceOf(Hello);
      expect(run1._params).toEqual([{
        'http://example.org/hello/hello': [ 'WORLD' ],
        'http://example.org/hello/say': [ true ],
      }]);
    });
  });

  describe('for a component with constructor args with nested entry collection', () => {
    beforeEach(async() => {
      manager = await ComponentsManager.build({
        mainModulePath: __dirname,
        moduleState,
        async moduleLoader(registry) {
          await registry.registerModule(Path.join(__dirname,
            '../assets/module-dynamicentries-nested.jsonld'));
        },
      });
    });

    it('should collect entries for a first instance', async() => {
      await manager.configRegistry
        .register(Path.join(__dirname, '../assets/config-dynamicentries-nested.jsonld'));

      const run1 = await manager.instantiate('http://example.org/myHelloWorld1');
      expect(run1).toBeInstanceOf(Hello);
      expect(run1._params).toEqual([{
        KEY1: {
          'sub-KEY1': [ '1', '2' ],
          'sub-KEY2': [ 'a', 'b' ],
        },
        KEY2: {
          'sub-KEY1': [ '1', '2' ],
        },
      }]);
    });

    it('should collect entries for a second instance', async() => {
      await manager.configRegistry
        .register(Path.join(__dirname, '../assets/config-dynamicentries-nested.jsonld'));

      const run1 = await manager.instantiate('http://example.org/myHelloWorld2');
      expect(run1).toBeInstanceOf(Hello);
      expect(run1._params).toEqual([{
        KEY1: {
          'sub-KEY1': {
            initial: [ '1' ],
            final: [ '2' ],
          },
          'sub-KEY2': {
            initial: [ 'a' ],
            final: [ 'b' ],
          },
        },
        KEY2: {
          'sub-KEY1': {
            initial: [ '1' ],
            final: [ '2' ],
          },
        },
      }]);
    });

    it('should collect entries for a double nested third instance', async() => {
      await manager.configRegistry
        .register(Path.join(__dirname, '../assets/config-dynamicentries-nested.jsonld'));

      const run1 = await manager.instantiate('http://example.org/myHelloWorld3');
      expect(run1).toBeInstanceOf(Hello);
      expect(run1._params).toEqual([{
        KEY1: [
          [ '1', '2' ],
          [ 'a', 'b' ],
        ],
        KEY2: [
          [ '1', '2' ],
        ],
      }]);
    });
  });

  describe('for a component with lazy params', () => {
    beforeEach(async() => {
      manager = await ComponentsManager.build({
        mainModulePath: __dirname,
        moduleState,
        async moduleLoader(registry) {
          await registry.registerModule(Path.join(__dirname, '../assets/module-lazy.jsonld'));
        },
      });
    });

    it('should result in lazy param values', async() => {
      await manager.configRegistry
        .register(Path.join(__dirname, '../assets/config-lazy.jsonld'));

      const run1 = await manager.instantiate('http://example.org/myHelloWorldLazy1');
      expect(run1).toBeInstanceOf(Hello);
      const val1 = await run1._params[0].somethingLazy();
      const val2 = await val1._params[0].somethingLazy();
      expect(val2).toEqual('bla');
    });
  });
});
