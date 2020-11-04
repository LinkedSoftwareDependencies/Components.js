import * as fs from 'fs';
import { Readable } from 'stream';
import type * as RDF from 'rdf-js';
import type { RdfObjectLoader, Resource } from 'rdf-object';
import { Loader } from '../lib/Loader';
import { RdfParser } from '../lib/rdf/RdfParser';
import * as Util from '../lib/Util';
const quad = require('rdf-quad');

const Hello = require('../__mocks__/helloworld').Hello;

describe('Loader', () => {
  let loader: Loader;
  let objectLoader: RdfObjectLoader;
  beforeEach(() => {
    loader = new Loader({ importPaths: { 'http://example.org/': `${__dirname}/` }});
    // Create resources via object loader, so we can use CURIEs
    objectLoader = loader.objectLoader;
  });

  describe('constructing an N3 Parser, unnamed', () => {
    it('components to be registered', () => {
      const component1 = objectLoader.createCompactedResource({
        '@id': 'ex:mycomponent1',
        types: [ `${Util.PREFIXES.oo}Class` ],
      });
      const component2 = objectLoader.createCompactedResource({
        '@id': 'ex:mycomponent2',
        types: [ `${Util.PREFIXES.oo}Class` ],
      });
      const component3 = objectLoader.createCompactedResource({
        '@id': 'ex:mycomponent3',
        types: [ `${Util.PREFIXES.oo}Class` ],
      });

      loader.registerComponentResource(component1);
      loader.registerComponentResource(component2);
      loader.registerComponentResource(component3);

      expect(loader.componentResources).toHaveProperty([ 'ex:mycomponent1' ], component1);
      expect(loader.componentResources).toHaveProperty([ 'ex:mycomponent2' ], component2);
      expect(loader.componentResources).toHaveProperty([ 'ex:mycomponent3' ], component3);
    });

    it('module components to be registered', () => {
      const component1 = objectLoader.createCompactedResource({
        '@id': 'ex:mycomponent1',
        types: [ `${Util.PREFIXES.oo}Class` ],
      });
      const component2 = objectLoader.createCompactedResource({
        '@id': 'ex:mycomponent2',
        types: [ `${Util.PREFIXES.oo}Class` ],
      });
      const component3 = objectLoader.createCompactedResource({
        '@id': 'ex:mycomponent3',
        types: [ `${Util.PREFIXES.oo}Class` ],
      });
      const module = objectLoader.createCompactedResource({
        '@id': 'ex:mymodule',
        components: [
          component1,
          component2,
          component3,
        ],
      });

      loader.registerModuleResource(module);

      expect(loader.componentResources).toHaveProperty([ 'ex:mycomponent1' ], component1);
      expect(loader.componentResources).toHaveProperty([ 'ex:mycomponent2' ], component2);
      expect(loader.componentResources).toHaveProperty([ 'ex:mycomponent3' ], component3);
    });

    describe('with a manual triple stream', () => {
      const module = 'http://example.org/myModule';
      const component1 = 'http://example.org/myModule#mycomponent1';
      const component2 = 'http://example.org/myModule#mycomponent2';
      const component3 = 'http://example.org/myModule#mycomponent3';

      beforeEach(async() => {
        const moduleStream = new Readable({ objectMode: true });
        moduleStream.push(quad(module, `${Util.PREFIXES.rdf}type`, `${Util.PREFIXES.oo}Module`));
        moduleStream.push(quad(module, `${Util.PREFIXES.oo}component`, component1));
        moduleStream.push(quad(module, `${Util.PREFIXES.doap}name`, '"helloworld"'));
        moduleStream.push(quad(component1, `${Util.PREFIXES.rdf}type`, `${Util.PREFIXES.oo}Class`));
        moduleStream.push(quad(component1, `${Util.PREFIXES.oo}componentPath`, '"Hello"'));
        moduleStream.push(quad(component1, `${Util.PREFIXES.oo}parameter`, 'http://example.org/myModule/params#param1'));
        moduleStream.push(quad(component1, `${Util.PREFIXES.oo}parameter`, 'http://example.org/myModule/params#param3'));
        moduleStream.push(quad(module, `${Util.PREFIXES.oo}component`, component2));
        moduleStream.push(quad(component2, `${Util.PREFIXES.rdf}type`, `${Util.PREFIXES.oo}Class`));
        moduleStream.push(quad(component2, `${Util.PREFIXES.oo}componentPath`, '"Hello"'));
        moduleStream.push(quad(component2, `${Util.PREFIXES.oo}parameter`, 'http://example.org/myModule/params#param1'));
        moduleStream.push(quad(module, `${Util.PREFIXES.oo}component`, component3));
        moduleStream.push(quad(component3, `${Util.PREFIXES.rdf}type`, `${Util.PREFIXES.oo}Class`));
        moduleStream.push(quad(component3, `${Util.PREFIXES.oo}componentPath`, '"Hello"'));
        moduleStream.push(quad(component3, `${Util.PREFIXES.oo}parameter`, 'http://example.org/myModule/params#param2'));
        moduleStream.push(null);
        await loader.registerModuleResourcesStream(moduleStream);
      });

      it('module components to be registered', () => {
        expect(loader.componentResources).toHaveProperty([ component1 ]);
        expect(loader.componentResources).toHaveProperty([ component2 ]);
        expect(loader.componentResources).toHaveProperty([ component3 ]);
      });

      it('a config resource', async() => {
        const configResource = objectLoader.createCompactedResource({
          types: component1,
          'http://example.org/myModule/params#param1': '"ABC"',
          'http://example.org/myModule/params#param2': '"DEF"',
          'http://example.org/myModule/params#param3': '"GHI"',
        });
        const run = await loader.instantiate(configResource);
        expect(run._params).toEqual({
          'http://example.org/myModule/params#param1': [ 'ABC' ],
          'http://example.org/myModule/params#param3': [ 'GHI' ],
        });
      });

      it('a config stream', async() => {
        const config1 = 'http://example.org/myModule#myconfig1';
        const configResourceStream = new Readable({ objectMode: true });
        configResourceStream.push(quad(config1, `${Util.PREFIXES.rdf}type`, component1));
        configResourceStream.push(quad(config1, 'http://example.org/myModule/params#param1', '"ABC"'));
        configResourceStream.push(quad(config1, 'http://example.org/myModule/params#param2', '"DEF"'));
        configResourceStream.push(quad(config1, 'http://example.org/myModule/params#param3', '"GHI"'));
        configResourceStream.push(null);

        const run = await loader.instantiateFromStream(config1, configResourceStream);
        expect(run._params).toEqual({
          'http://example.org/myModule/params#param1': [ 'ABC' ],
          'http://example.org/myModule/params#param3': [ 'GHI' ],
        });
      });

      it('a manual run', async() => {
        const params: any = {};
        params['http://example.org/myModule/params#param1'] = 'ABC';
        params['http://example.org/myModule/params#param2'] = 'DEF';
        params['http://example.org/myModule/params#param3'] = 'GHI';
        const run = await loader.instantiateManually(component1, params);
        expect(run._params).toEqual({
          'http://example.org/myModule/params#param1': [ 'ABC' ],
          'http://example.org/myModule/params#param3': [ 'GHI' ],
        });
      });
    });

    describe('with a file triple stream', () => {
      beforeEach(async() => {
        await loader.registerModuleResourcesStream(parse('module-hello-world.jsonld'));
      });

      it('module components to be registered', () => {
        expect(loader.componentResources).toHaveProperty([ 'http://example.org/HelloWorldModule#SayHelloComponent' ]);
      });

      it('a config resource', async() => {
        const configResource = objectLoader.createCompactedResource({
          types: [ 'http://example.org/HelloWorldModule#SayHelloComponent' ],
          'http://example.org/hello/hello': '"WORLD"',
          'http://example.org/hello/say': '"HELLO"',
          'http://example.org/hello/bla': '"BLA"',
        });
        const run = await loader.instantiate(configResource);
        expect(run._params).toEqual({
          'http://example.org/hello/hello': [ 'WORLD' ],
          'http://example.org/hello/say': [ 'HELLO' ],
        });
      });

      it('a config stream', async() => {
        const configResourceStream = parse('config-hello-world.jsonld');
        const run = await loader.instantiateFromStream('http://example.org/myconfig', configResourceStream);
        expect(run._params).toEqual({
          'http://example.org/hello/hello': [ 'WORLD' ],
          'http://example.org/hello/say': [ 'HI' ],
        });
      });

      it('a manual run', async() => {
        const params: any = {};
        params['http://example.org/hello/hello'] = 'WORLD';
        params['http://example.org/hello/say'] = 'BONJOUR';
        params['http://example.org/hello/bla'] = 'BLA';
        const run = await loader.instantiateManually('http://example.org/HelloWorldModule#SayHelloComponent', params);
        expect(run._params).toEqual({
          'http://example.org/hello/hello': [ 'WORLD' ],
          'http://example.org/hello/say': [ 'BONJOUR' ],
        });
      });
    });

    it('should get contents from a file', () => {
      return expect(Util.getContentsFromUrlOrPath('assets/dummy.txt', __dirname)
        .then(data => new Promise((resolve, reject) => {
          let body = '';
          data.on('data', d => body += d.toString());
          data.on('end', () => resolve(body));
        })))
        .resolves.toEqual('ABC');
    });

    it('should get contents from an URL', async() => {
      await expect(Util.getContentsFromUrlOrPath('http://google.com', __dirname)).resolves.toBeTruthy();
    });

    describe('with a valid JSON file path', () => {
      beforeEach(async() => {
        await loader.registerModuleResourcesUrl('./assets/module-hello-world.jsonld', __dirname);
      });

      it('module components to be registered', () => {
        expect(loader.componentResources).toHaveProperty([ 'http://example.org/HelloWorldModule#SayHelloComponent' ]);
      });
    });

    describe('with a valid ttl file path', () => {
      beforeEach(async() => {
        await loader.registerModuleResourcesUrl('assets/module-hello-world.ttl', __dirname);
      });

      it('module components to be registered', () => {
        expect(loader.componentResources).toHaveProperty([ 'http://example.org/HelloWorldModuleSayHelloComponent' ]);
      });
    });

    describe('with an invalid file path', () => {
      it('should reject the promise', async() => {
        await expect(loader.registerModuleResourcesUrl(
          'assets/module-hello-world.jsonld.invalid',
          __dirname,
        )).rejects.toThrow();
      });
    });

    describe('with import statements', () => {
      beforeEach(async() => {
        await loader.registerModuleResourcesUrl('assets/module-hello-world-imports.jsonld', __dirname);
      });

      it('should import components', () => {
        expect(loader.componentResources).toHaveProperty([ 'http://example.org/HelloWorldModule#SayHelloComponent1' ]);
        expect(loader.componentResources).toHaveProperty([ 'http://example.org/HelloWorldModule#SayHelloComponent2' ]);
      });
    });
  });

  describe('constructing an component with constructor mappings', () => {
    beforeEach(async() => {
      await loader.registerModuleResourcesStream(parse('module-hello-world-mapping.jsonld'));
    });

    it('should produce instances with correct parameter values for a first instantiation', async() => {
      const configResourceStream1 = parse('config-hello-world-mapping.jsonld');
      const run1 = await loader.instantiateFromStream('http://example.org/myHelloWorld1', configResourceStream1);
      expect(run1._params).toEqual({
        something1: [ 'SOMETHING1', 'SOMETHING2' ],
      });
    });

    it('should produce instances with correct parameter values for a second instantiation', async() => {
      const configResourceStream2 = parse('config-hello-world-mapping.jsonld');
      const run2 = await loader.instantiateFromStream('http://example.org/myHelloWorld2', configResourceStream2);
      expect(run2._params).toEqual([ 'SOMETHING3', 'SOMETHING4' ]);
    });
  });

  describe('constructing an component with referenced parameters values', () => {
    beforeEach(async() => {
      const moduleStream = parse('module-hello-world.jsonld');
      await loader.registerModuleResourcesStream(moduleStream);
    });

    it('should produce instances with equal parameter values', async() => {
      const configResourceStream = parse('config-hello-world-referenced.jsonld');
      const run = await loader.instantiateFromStream('http://example.org/myHelloWorld1', configResourceStream);
      expect(run._params).toEqual({
        'http://example.org/hello/hello': [ new Hello() ],
        'http://example.org/hello/say': [ new Hello() ],
      });
      expect(run._params['http://example.org/hello/hello'][0]).toEqual(run._params['http://example.org/hello/say'][0]);
    });

    it('should produce instances with different parameter values', async() => {
      const configResourceStream = parse('config-hello-world-unreferenced.jsonld');
      const run = await loader.instantiateFromStream('http://example.org/myHelloWorld1', configResourceStream);
      expect(run._params).toEqual({
        'http://example.org/hello/hello': [ new Hello() ],
        'http://example.org/hello/say': [ new Hello() ],
      });
      expect(run._params['http://example.org/hello/hello']).not.toBe(run._params['http://example.org/hello/say']);
    });

    it('should produce invalid instances with itself as parameter value when self-referenced', async() => {
      const configResourceStream = parse('config-hello-world-selfreferenced.jsonld');
      const run = await loader.instantiateFromStream('http://example.org/myHelloWorld1', configResourceStream);
      expect(run._params).toEqual({
        'http://example.org/hello/hello': [{}],
      });
    });
  });

  describe('constructing an component with inheritable parameter values', () => {
    beforeEach(async() => {
      const moduleStream = parse('module-hello-world-inheritableparams.jsonld');
      await loader.registerModuleResourcesStream(moduleStream);
    });

    it('should produce instances with inherited parameter values', async() => {
      const configResourceStream = parse('config-hello-world-inheritableparams.jsonld');
      const run1 = await loader.instantiateFromStream('http://example.org/myHelloWorld1', configResourceStream);
      expect(run1._params).toEqual({
        'http://example.org/hello/something': [ 'SOMETHING' ],
      });
      const run2 = await loader.instantiate(loader.objectLoader.resources['http://example.org/myHelloWorld2']);
      expect(run2._params).toEqual({
        'http://example.org/hello/something': [ 'SOMETHING' ],
      });
    });
  });

  describe('constructing components from an abstract component', () => {
    beforeEach(async() => {
      await loader.registerModuleResourcesStream(parse('module-hello-world-subclass.jsonld'));
    });

    it('a config stream with component instances with inherited parameters from the parent', async() => {
      const configResourceStream = parse('config-hello-world-subclass.jsonld');
      const run = await loader.instantiateFromStream('http://example.org/myHelloWorld1', configResourceStream);
      expect(run._params).toEqual({
        'http://example.org/hello/something': [ 'SOMETHING1' ],
      });
    });

    it('a config stream with component instances with inherited parameters from the parent\'s parent', async() => {
      const configResourceStream = parse('config-hello-world-subclass.jsonld');
      const run = await loader.instantiateFromStream('http://example.org/myHelloWorld2', configResourceStream);
      expect(run._params).toEqual({
        'http://example.org/hello/something': [ 'SOMETHING2' ],
      });
    });
  });

  describe('constructing components from an abstract component with constructor mappings', () => {
    beforeEach(async() => {
      const moduleStream = parse('module-hello-world-subclassmapping.jsonld');
      await loader.registerModuleResourcesStream(moduleStream);
    });

    it('a config stream with component instances with inherited parameters from the parent', async() => {
      const configResourceStream = parse('config-hello-world-subclassmapping.jsonld');
      const run = await loader.instantiateFromStream('http://example.org/myHelloWorld1', configResourceStream);
      expect(run._params).toEqual({
        something: [ 'SOMETHING' ],
        something1: [ 'SOMETHING1' ],
      });
    });

    it('a config stream with component instances with inherited parameters from the parent\'s parent', async() => {
      const configResourceStream = parse('config-hello-world-subclassmapping.jsonld');
      const run = await loader.instantiateFromStream('http://example.org/myHelloWorld2', configResourceStream);
      expect(run._params).toEqual({
        something: [ 'SOMETHING' ],
        something1: [ 'SOMETHING1' ],
        something2: [ 'SOMETHING2' ],
      });
    });

    it('a config stream with component instances with inherited parameters from the parent\'s parent\'s parent',
      async() => {
        const configResourceStream = parse('config-hello-world-subclassmapping.jsonld');
        const run = await loader.instantiateFromStream('http://example.org/myHelloWorld3', configResourceStream);
        expect(run._params).toEqual({
          something: [ 'SOMETHING' ],
          something1: [ 'SOMETHING1' ],
          something2: [ 'SOMETHING2' ],
        });
      });
  });

  describe('constructing an component with inheritable parameter values with constructor mappings', () => {
    beforeEach(async() => {
      const moduleStream = parse('module-hello-world-inheritableparams-subclassmapping.jsonld');
      await loader.registerModuleResourcesStream(moduleStream);
    });

    it('should produce instances with inherited parameter values', async() => {
      const configResourceStream1 = parse('config-hello-world-inheritableparams.jsonld');
      const run1 = await loader.instantiateFromStream('http://example.org/myHelloWorld1', configResourceStream1);
      expect(run1._params).toEqual({
        something: [ 'SOMETHING' ],
      });
      const run2 = await loader.instantiate(loader.objectLoader.resources['http://example.org/myHelloWorld2']);
      expect(run2._params).toEqual({
        something: [ 'SOMETHING' ],
      });
    });
  });

  describe('constructing components from an abstract component with dynamic entries in constructor mappings', () => {
    beforeEach(async() => {
      const moduleStream = parse('module-hello-world-dynamicentries.jsonld');
      await loader.registerModuleResourcesStream(moduleStream);
    });

    it('a first config stream with component instances', async() => {
      const configResourceStream = parse('config-hello-world-dynamicentries.jsonld');
      const run = await loader.instantiateFromStream('http://example.org/myHelloWorld1', configResourceStream);
      expect(run._params).toEqual({
        KEY1: 'VALUE1',
        KEY2: 'VALUE2',
      });
    });

    it('a second config stream with component instances', async() => {
      const configResourceStream = parse('config-hello-world-dynamicentries.jsonld');
      const run = await loader.instantiateFromStream('http://example.org/myHelloWorld2', configResourceStream);
      expect(run._params).toEqual({
        KEY3: 'VALUE3',
        KEY4: 'VALUE4',
      });
    });
  });

  describe('constructing components from an abstract component ' +
    'with constructor mappings with inheritable parameters and dynamic entries', () => {
    beforeEach(async() => {
      const moduleStream = parse('module-hello-world-subclassmapping-dynamicentries.jsonld');
      await loader.registerModuleResourcesStream(moduleStream);
    });

    it('a config stream with component instances with inherited parameters from the parent', async() => {
      const configResourceStream = parse('config-hello-world-subclassmapping-dynamicentries.jsonld');
      const run = await loader.instantiateFromStream('http://example.org/myHelloWorld1', configResourceStream);
      expect(run._params).toEqual({
        '0KEY1': '0VALUE1',
        '0KEY2': '0VALUE2',
        '1KEY1': '1VALUE1',
        '1KEY2': '1VALUE2',
      });
    });

    it('a config stream with component instances with inherited parameters from the parent\'s parent', async() => {
      const configResourceStream = parse('config-hello-world-subclassmapping-dynamicentries.jsonld');
      const run = await loader.instantiateFromStream('http://example.org/myHelloWorld2', configResourceStream);
      expect(run._params).toEqual({
        '0KEY1': '0VALUE1',
        '0KEY2': '0VALUE2',
        '1KEY1': '1VALUE1',
        '1KEY2': '1VALUE2',
        '2KEY1': '2VALUE1',
        '2KEY2': '2VALUE2',
      });
    });
  });

  describe('constructing an component with inheritable parameter values ' +
    'with constructor mappings, inherited parameters and dynamic entries', () => {
    beforeEach(async() => {
      const moduleStream = parse('module-hello-world-inheritableparams-subclassmapping-dynamicentries.jsonld');
      await loader.registerModuleResourcesStream(moduleStream);
    });

    it('should produce instances with inherited parameter values', async() => {
      const configResourceStream1 = parse('config-hello-world-dynamicentries2.jsonld');
      const run1 = await loader.instantiateFromStream('http://example.org/myHelloWorld1', configResourceStream1);
      expect(run1._params).toEqual({
        somethings1: {
          KEY1: 'VALUE1',
          KEY2: 'VALUE2',
        },
      });
      const run2 = await loader.instantiate(loader.objectLoader.resources['http://example.org/myHelloWorld2']);
      expect(run2._params).toEqual({
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
      });
    });
  });

  describe('constructing an component with inheritable parameter values and dynamic entries', () => {
    beforeEach(async() => {
      const moduleStream = parse('module-hello-world-inheritableparams-dynamicentries.jsonld');
      await loader.registerModuleResourcesStream(moduleStream);
    });

    it('should produce instances with inherited parameter values', async() => {
      const configResourceStream1 = parse('config-hello-world-inheritableparams-dynamicentries.jsonld');
      const run1 = await loader.instantiateFromStream('http://example.org/myHelloWorld1', configResourceStream1);
      expect(run1._params).toEqual({
        KEY1: 'VALUE1',
        KEY2: 'VALUE2',
      });
      const run2 = await loader.instantiate(loader.objectLoader.resources['http://example.org/myHelloWorld2']);
      expect(run2._params).toEqual({
        KEY1: 'VALUE1',
        KEY2: 'VALUE2',
      });
    });
  });

  describe('an empty resource', () => {
    let resource: Resource;
    beforeEach(() => {
      resource = objectLoader.createCompactedResource({});
    });

    it('must be an invalid component', () => {
      expect(loader._isValidComponent(resource)).toBeFalsy();
    });
  });

  describe('a basic resource', () => {
    let resource: Resource;
    beforeEach(() => {
      resource = objectLoader.createCompactedResource({
        '@id': 'http://example.org',
        'ex:a': 'ex:b',
        types: 'aaa',
      });
    });

    it('must be an invalid component', () => {
      expect(loader._isValidComponent(resource)).toBeFalsy();
    });
  });

  describe('a resource with the abstract class type', () => {
    let resource: Resource;
    beforeEach(() => {
      resource = objectLoader.createCompactedResource({
        '@id': 'http://example.org',
        'ex:a': 'ex:b',
        types: `${Util.PREFIXES.oo}AbstractClass`,
      });
    });

    it('must be a valid component', () => {
      expect(loader._isValidComponent(resource)).toBeTruthy();
    });
  });

  describe('a resource with the class type', () => {
    let resource: Resource;
    beforeEach(() => {
      resource = objectLoader.createCompactedResource({
        '@id': 'http://example.org',
        'ex:a': 'ex:b',
        types: `${Util.PREFIXES.oo}Class`,
      });
    });

    it('must be a valid component', () => {
      expect(loader._isValidComponent(resource)).toBeTruthy();
    });
  });

  describe('constructing an component with typed parameters', () => {
    beforeEach(async() => {
      const moduleStream = parse('module-hello-world-paramranges.jsonld');
      await loader.registerModuleResourcesStream(moduleStream);
    });

    it('should produce instances with correct parameter values after an erroring instantiation', async() => {
      const configResourceStream1 = parse('config-hello-world.jsonld');
      const configResourceStream2 = parse('config-hello-world-paramranges.jsonld');
      await expect(loader.instantiateFromStream('http://example.org/myconfig', configResourceStream1))
        .rejects.toThrow(new Error(
          'HI is not of type http://www.w3.org/2001/XMLSchema#boolean for parameter http://example.org/hello/say',
        ));
      const run2 = await loader.instantiateFromStream('http://example.org/myconfig2', configResourceStream2);
      expect(run2._params).toEqual({
        'http://example.org/hello/hello': [ 'WORLD' ],
        'http://example.org/hello/say': [ true ],
      });
    });
  });

  describe('constructing components from a component with nested dynamic entries in constructor mappings', () => {
    beforeEach(async() => {
      const moduleStream = parse('module-hello-world-dynamicentries-nested.jsonld');
      await loader.registerModuleResourcesStream(moduleStream);
    });

    it('a config stream with component instances with nested array mappings', async() => {
      const configResourceStream = parse('config-hello-world-dynamicentries-nested.jsonld');
      const run = await loader.instantiateFromStream('http://example.org/myHelloWorld1', configResourceStream);
      expect(run._params).toEqual({
        KEY1: {
          'sub-KEY1': [ '1', '2' ],
          'sub-KEY2': [ 'a', 'b' ],
        },
        KEY2: {
          'sub-KEY1': [ '1', '2' ],
        },
      });
    });

    it('a config stream with component instances with nested object mappings', async() => {
      const configResourceStream = parse('config-hello-world-dynamicentries-nested.jsonld');
      const run = await loader.instantiateFromStream('http://example.org/myHelloWorld2', configResourceStream);
      expect(run._params).toEqual({
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
      });
    });

    it('a config stream with component instances with double nested array mappings', async() => {
      const configResourceStream = parse('config-hello-world-dynamicentries-nested.jsonld');
      const run = await loader.instantiateFromStream('http://example.org/myHelloWorld3', configResourceStream);
      expect(run._params).toEqual({
        KEY1: [
          [ '1', '2' ],
          [ 'a', 'b' ],
        ],
        KEY2: [
          [ '1', '2' ],
        ],
      });
    });
  });

  describe('constructing an component with lazy parameters values', () => {
    beforeEach(async() => {
      const moduleStream = parse('module-hello-world-lazy.jsonld');
      await loader.registerModuleResourcesStream(moduleStream);
    });

    it('should produce instances with lazy parameter values', async() => {
      const configResourceStream = parse('config-hello-world-lazy.jsonld');
      const run = await loader.instantiateFromStream('http://example.org/myHelloWorldLazy1', configResourceStream);
      const val1 = await run._params.somethingLazy();
      const val2 = await val1._params.somethingLazy();
      expect(val2).toEqual('bla');
    });
  });
});

function parse(fileName: string): RDF.Stream & Readable {
  return new RdfParser().parse(
    fs.createReadStream(`${__dirname}/assets/${fileName}`),
    { path: '.jsonld' },
  );
}
