import { Loader } from '../lib/Loader';
import { RdfClassLoader } from '../lib/rdf/RdfClassLoader';
import { Resource } from '../lib/rdf/Resource';
import { Readable } from 'stream';
import Util = require('../lib/Util');
import * as fs from 'fs';
import { JsonLdStreamParser } from '../lib/rdf/JsonLdStreamParser';

const Hello = require("../__mocks__/helloworld").Hello;

describe('Loader', function () {
  var runner: Loader;
  beforeEach(function () {
    runner = new Loader({ importPaths: { 'http://example.org/': __dirname + '/' } });
  });

  describe('constructing an N3 Parser, unnamed', function () {
    it('should construct a module loader', function () {
      expect(runner._newModuleLoader()).toBeInstanceOf(RdfClassLoader);
      expect(runner._newModuleLoader()._captureAllProperties).toBeTruthy();
      expect(runner._newModuleLoader()._captureAllClasses).toBeFalsy();
    });

    it('should construct a config loader', function () {
      expect(runner._newConfigLoader()).toBeInstanceOf(RdfClassLoader);
      expect(runner._newConfigLoader()._captureAllProperties).toBeTruthy();
      expect(runner._newConfigLoader()._captureAllClasses).toBeTruthy();
    });

    it('should allow components to be registered', function () {
      let component1 = new Resource('mycomponent1', { types: [ new Resource(Util.PREFIXES['oo'] + 'Class') ] });
      let component2 = new Resource('mycomponent2', { types: [ new Resource(Util.PREFIXES['oo'] + 'Class') ] });
      let component3 = new Resource('mycomponent3', { types: [ new Resource(Util.PREFIXES['oo'] + 'Class') ] });
      runner._registerComponentResource(component1);
      runner._registerComponentResource(component2);
      runner._registerComponentResource(component3);
      expect(runner._componentResources).toHaveProperty(['mycomponent1'], component1);
      expect(runner._componentResources).toHaveProperty(['mycomponent2'], component2);
      expect(runner._componentResources).toHaveProperty(['mycomponent3'], component3);
    });

    it('should allow module components to be registered', function () {
      let component1 = new Resource('mycomponent1', { types: [ new Resource(Util.PREFIXES['oo'] + 'Class') ] });
      let component2 = new Resource('mycomponent2', { types: [ new Resource(Util.PREFIXES['oo'] + 'Class') ] });
      let component3 = new Resource('mycomponent3', { types: [ new Resource(Util.PREFIXES['oo'] + 'Class') ] });
      let module = new Resource('mymodule', { hasComponent: [ component1, component2, component3 ] });
      runner.registerModuleResource(module);
      expect(runner._componentResources).toHaveProperty(['mycomponent1'], component1);
      expect(runner._componentResources).toHaveProperty(['mycomponent2'], component2);
      expect(runner._componentResources).toHaveProperty(['mycomponent3'], component3);
    });

    describe('with a manual triple stream', function () {
      let module = 'http://example.org/myModule';
      let component1 = 'http://example.org/myModule#mycomponent1';
      let component2 = 'http://example.org/myModule#mycomponent2';
      let component3 = 'http://example.org/myModule#mycomponent3';

      beforeEach(async() => {
        let moduleStream = new Readable({ objectMode: true });
        moduleStream.push({ subject: module, predicate: Util.PREFIXES['rdf'] + 'type', object: Util.PREFIXES['oo'] + 'Module'});
        moduleStream.push({ subject: module, predicate: Util.PREFIXES['oo'] + 'component', object: component1});
        moduleStream.push({ subject: module, predicate: Util.PREFIXES['doap'] + 'name', object: '"helloworld"'});
        moduleStream.push({ subject: component1, predicate: Util.PREFIXES['rdf'] + 'type', object: Util.PREFIXES['oo'] + 'Class'});
        moduleStream.push({ subject: component1, predicate: Util.PREFIXES['oo'] + 'componentPath', object: '"Hello"'});
        moduleStream.push({ subject: component1, predicate: Util.PREFIXES['oo'] + 'parameter', object: 'http://example.org/myModule/params#param1'});
        moduleStream.push({ subject: component1, predicate: Util.PREFIXES['oo'] + 'parameter', object: 'http://example.org/myModule/params#param3'});
        moduleStream.push({ subject: module, predicate: Util.PREFIXES['oo'] + 'component', object: component2});
        moduleStream.push({ subject: component2, predicate: Util.PREFIXES['rdf'] + 'type', object: Util.PREFIXES['oo'] + 'Class'});
        moduleStream.push({ subject: component2, predicate: Util.PREFIXES['oo'] + 'componentPath', object: '"Hello"'});
        moduleStream.push({ subject: component2, predicate: Util.PREFIXES['oo'] + 'parameter', object: 'http://example.org/myModule/params#param1'});
        moduleStream.push({ subject: module, predicate: Util.PREFIXES['oo'] + 'component', object: component3});
        moduleStream.push({ subject: component3, predicate: Util.PREFIXES['rdf'] + 'type', object: Util.PREFIXES['oo'] + 'Class'});
        moduleStream.push({ subject: component3, predicate: Util.PREFIXES['oo'] + 'componentPath', object: '"Hello"'});
        moduleStream.push({ subject: component3, predicate: Util.PREFIXES['oo'] + 'parameter', object: 'http://example.org/myModule/params#param2'});
        moduleStream.push(null);
        await runner.registerModuleResourcesStream(moduleStream);
      });

      it('should allow module components to be registered', function () {
        expect(runner._componentResources).toHaveProperty([component1]);
        expect(runner._componentResources).toHaveProperty([component2]);
        expect(runner._componentResources).toHaveProperty([component3]);
      });

      it('should allow a config resource to be run', async() => {
        let fields: any = { types: [ new Resource(component1) ] };
        fields['http://example.org/myModule/params#param1'] = [ Resource.newString('ABC') ];
        fields['http://example.org/myModule/params#param2'] = [ Resource.newString('DEF') ];
        fields['http://example.org/myModule/params#param3'] = [ Resource.newString('GHI') ];
        const run = await runner.instantiate(new Resource(null, fields));
        expect(run._params).toEqual({
          'http://example.org/myModule/params#param1': ['ABC'],
          'http://example.org/myModule/params#param3': ['GHI']
        });
      });

      it('should allow a config stream to be run', async() => {
        let config1 = 'http://example.org/myModule#myconfig1';
        let configResourceStream = new Readable({ objectMode: true });
        configResourceStream.push({ subject: config1, predicate: Util.PREFIXES['rdf'] + 'type', object: component1});
        configResourceStream.push({ subject: config1, predicate: 'http://example.org/myModule/params#param1', object: '"ABC"'});
        configResourceStream.push({ subject: config1, predicate: 'http://example.org/myModule/params#param2', object: '"DEF"'});
        configResourceStream.push({ subject: config1, predicate: 'http://example.org/myModule/params#param3', object: '"GHI"'});
        configResourceStream.push(null);

        const run = await runner.instantiateFromStream(config1, configResourceStream);
        expect(run._params).toEqual({
          'http://example.org/myModule/params#param1': ['ABC'],
          'http://example.org/myModule/params#param3': ['GHI']
        });
      });

      it('should allow a manual run', async() => {
        let params: any = {};
        params['http://example.org/myModule/params#param1'] = 'ABC';
        params['http://example.org/myModule/params#param2'] = 'DEF';
        params['http://example.org/myModule/params#param3'] = 'GHI';
        const run = await runner.instantiateManually(component1, params);
        expect(run._params).toEqual({
          'http://example.org/myModule/params#param1': ['ABC'],
          'http://example.org/myModule/params#param3': ['GHI']
        });
      });
    });

    describe('with a file triple stream', function () {
      beforeEach(async() => {
        let moduleStream = fs.createReadStream(__dirname + '/assets/module-hello-world.jsonld').pipe(new JsonLdStreamParser());
        await runner.registerModuleResourcesStream(moduleStream);
      });

      it('should allow module components to be registered', function () {
        expect(runner._componentResources).toHaveProperty(['http://example.org/HelloWorldModule#SayHelloComponent']);
      });

      it('should allow a config resource to be run', async() => {
        let fields: any = { types: [ new Resource('http://example.org/HelloWorldModule#SayHelloComponent') ] };
        fields['http://example.org/hello/hello'] = [ Resource.newString('WORLD') ];
        fields['http://example.org/hello/say'] = [ Resource.newString('HELLO') ];
        fields['http://example.org/hello/bla'] = [ Resource.newString('BLA') ];
        const run = await runner.instantiate(new Resource(null, fields));
        expect(run._params).toEqual({
          'http://example.org/hello/hello': ['WORLD'],
          'http://example.org/hello/say': ['HELLO']
        });
      });

      it('should allow a config stream to be run', async() => {
        let configResourceStream = fs.createReadStream(__dirname + '/assets/config-hello-world.jsonld').pipe(new JsonLdStreamParser());
        const run = await runner.instantiateFromStream('http://example.org/myconfig', configResourceStream);
        expect(run._params).toEqual({
          'http://example.org/hello/hello': ['WORLD'],
          'http://example.org/hello/say': ['HI']
        });
      });

      it('should allow a manual run', async() => {
        let params: any = {};
        params['http://example.org/hello/hello'] = 'WORLD';
        params['http://example.org/hello/say'] = 'BONJOUR';
        params['http://example.org/hello/bla'] = 'BLA';
        const run = await runner.instantiateManually('http://example.org/HelloWorldModule#SayHelloComponent', params);
        expect(run._params).toEqual({
          'http://example.org/hello/hello': ['WORLD'],
          'http://example.org/hello/say': ['BONJOUR']
        });
      });
    });

    it('should get contents from a file', function () {
      return expect(Util.getContentsFromUrlOrPath('assets/dummy.txt', __dirname)
        .then((data) => new Promise((resolve, reject) => {
          let body = '';
          data.on('data', (d) => body += d.toString());
          data.on('end', () => resolve(body));
        })))
        .resolves.toEqual('ABC');
    });

    it('should get contents from an URL', function () {
      return expect(Util.getContentsFromUrlOrPath('http://google.com', __dirname)).resolves.toBeTruthy();
    });

    describe('with a valid JSON file path', function () {
      beforeEach(async() => {
        await runner.registerModuleResourcesUrl('./assets/module-hello-world.jsonld', __dirname);
      });

      it('should allow module components to be registered', function () {
        expect(runner._componentResources).toHaveProperty(['http://example.org/HelloWorldModule#SayHelloComponent']);
      });
    });

    describe('with a valid ttl file path', function () {
      beforeEach(async() => {
        await runner.registerModuleResourcesUrl('assets/module-hello-world.ttl', __dirname);
      });

      it('should allow module components to be registered', function () {
        expect(runner._componentResources).toHaveProperty(['http://example.org/HelloWorldModuleSayHelloComponent']);
      });
    });

    describe('with an invalid file path', function () {
      it('should reject the promise', async() => {
        return expect(runner.registerModuleResourcesUrl('assets/module-hello-world.jsonld.invalid', __dirname))
          .rejects.toThrow();
      });
    });

    describe('with import statements', function () {
      beforeEach(async() => {
        await runner.registerModuleResourcesUrl('assets/module-hello-world-imports.jsonld', __dirname);
      });

      it('should import components', function () {
        expect(runner._componentResources).toHaveProperty(['http://example.org/HelloWorldModule#SayHelloComponent1']);
        expect(runner._componentResources).toHaveProperty(['http://example.org/HelloWorldModule#SayHelloComponent2']);
      });
    });
  });

  describe('constructing an component with constructor mappings', function () {
    beforeEach(async() => {
      let moduleStream = fs.createReadStream(__dirname + '/assets/module-hello-world-mapping.jsonld').pipe(new JsonLdStreamParser());
      await runner.registerModuleResourcesStream(moduleStream);
    });

    it('should produce instances with correct parameter values', async() => {
      let configResourceStream1 = fs.createReadStream(__dirname + '/assets/config-hello-world-mapping.jsonld').pipe(new JsonLdStreamParser());
      let configResourceStream2 = fs.createReadStream(__dirname + '/assets/config-hello-world-mapping.jsonld').pipe(new JsonLdStreamParser());
      const run1 = await runner.instantiateFromStream('http://example.org/myHelloWorld1', configResourceStream1)
      expect(run1._params).toEqual({
        'something1': ['SOMETHING1', 'SOMETHING2'],
      });
      const run2 = await runner.instantiateFromStream('http://example.org/myHelloWorld2', configResourceStream2)
      expect(run2._params).toEqual(['SOMETHING3', 'SOMETHING4']);
    });
  });

  describe('constructing an component with referenced parameters values', function () {
    beforeEach(async() => {
      let moduleStream = fs.createReadStream(__dirname + '/assets/module-hello-world.jsonld').pipe(new JsonLdStreamParser());
      await runner.registerModuleResourcesStream(moduleStream);
    });

    it('should produce instances with equal parameter values', async() => {
      let configResourceStream = fs.createReadStream(__dirname + '/assets/config-hello-world-referenced.jsonld').pipe(new JsonLdStreamParser());
      const run = await runner.instantiateFromStream('http://example.org/myHelloWorld1', configResourceStream);
      expect(run._params).toEqual({
        'http://example.org/hello/hello': [new Hello()],
        'http://example.org/hello/say': [new Hello()]
      });
      expect(run._params['http://example.org/hello/hello'][0]).toEqual(run._params['http://example.org/hello/say'][0]);
    });

    it('should produce instances with different parameter values', async() => {
      let configResourceStream = fs.createReadStream(__dirname + '/assets/config-hello-world-unreferenced.jsonld').pipe(new JsonLdStreamParser());
      const run = await runner.instantiateFromStream('http://example.org/myHelloWorld1', configResourceStream);
      expect(run._params).toEqual({
        'http://example.org/hello/hello': [new Hello()],
        'http://example.org/hello/say': [new Hello()]
      });
      expect(run._params['http://example.org/hello/hello'][0]).not.toBe(run._params['http://example.org/hello/say'][0]);
    });

    it('should produce invalid instances with itself as parameter value when self-referenced', async() => {
      let configResourceStream = fs.createReadStream(__dirname + '/assets/config-hello-world-selfreferenced.jsonld').pipe(new JsonLdStreamParser());
      const run = await runner.instantiateFromStream('http://example.org/myHelloWorld1', configResourceStream);
      expect(run._params).toEqual({
        'http://example.org/hello/hello': [{}]
      });
    });
  });

  describe('constructing an component with inheritable parameter values', function () {
    beforeEach(async() => {
      let moduleStream = fs.createReadStream(__dirname + '/assets/module-hello-world-inheritableparams.jsonld').pipe(new JsonLdStreamParser());
      await runner.registerModuleResourcesStream(moduleStream);
    });

    it('should produce instances with inherited parameter values', async() => {
      let configResourceStream1 = fs.createReadStream(__dirname + '/assets/config-hello-world-inheritableparams.jsonld').pipe(new JsonLdStreamParser());
      let configResourceStream2 = fs.createReadStream(__dirname + '/assets/config-hello-world-inheritableparams.jsonld').pipe(new JsonLdStreamParser());
      const run1 = await runner.instantiateFromStream('http://example.org/myHelloWorld1', configResourceStream1)
      expect(run1._params).toEqual({
        'http://example.org/hello/something': ["SOMETHING"]
      });
      const run2 = await runner.instantiateFromStream('http://example.org/myHelloWorld2', configResourceStream2)
      expect(run2._params).toEqual({
        'http://example.org/hello/something': ["SOMETHING"]
      });
    });
  });

  describe('constructing components from an abstract component', function () {
    beforeEach(async() => {
      let moduleStream = fs.createReadStream(__dirname + '/assets/module-hello-world-subclass.jsonld').pipe(new JsonLdStreamParser());
      await runner.registerModuleResourcesStream(moduleStream);
    });

    it('should allow a config stream with component instances with inherited parameters from the parent to be run', async() => {
      let configResourceStream = fs.createReadStream(__dirname + '/assets/config-hello-world-subclass.jsonld').pipe(new JsonLdStreamParser());
      const run = await runner.instantiateFromStream('http://example.org/myHelloWorld1', configResourceStream);
      expect(run._params).toEqual({
        'http://example.org/hello/something': ["SOMETHING1"]
      });
    });

    it('should allow a config stream with component instances with inherited parameters from the parent\'s parent to be run', async() => {
      let configResourceStream = fs.createReadStream(__dirname + '/assets/config-hello-world-subclass.jsonld').pipe(new JsonLdStreamParser());
      const run = await runner.instantiateFromStream('http://example.org/myHelloWorld2', configResourceStream);
      expect(run._params).toEqual({
        'http://example.org/hello/something': ["SOMETHING2"]
      });
    });
  });

  describe('constructing components from an abstract component with constructor mappings', function () {
    beforeEach(async() => {
      let moduleStream = fs.createReadStream(__dirname + '/assets/module-hello-world-subclassmapping.jsonld').pipe(new JsonLdStreamParser());
      await runner.registerModuleResourcesStream(moduleStream);
    });

    it('should allow a config stream with component instances with inherited parameters from the parent to be run', async() => {
      let configResourceStream = fs.createReadStream(__dirname + '/assets/config-hello-world-subclassmapping.jsonld').pipe(new JsonLdStreamParser());
      const run = await runner.instantiateFromStream('http://example.org/myHelloWorld1', configResourceStream)
      expect(run._params).toEqual({
        'something': ["SOMETHING"],
        'something1': ["SOMETHING1"]
      });
    });

    it('should allow a config stream with component instances with inherited parameters from the parent\'s parent to be run', async() => {
      let configResourceStream = fs.createReadStream(__dirname + '/assets/config-hello-world-subclassmapping.jsonld').pipe(new JsonLdStreamParser());
      const run = await runner.instantiateFromStream('http://example.org/myHelloWorld2', configResourceStream);
      expect(run._params).toEqual({
        'something': ["SOMETHING"],
        'something1': ["SOMETHING1"],
        'something2': ["SOMETHING2"]
      });
    });

    it('should allow a config stream with component instances with inherited parameters from the parent\'s parent\'s parent to be run', async() => {
      let configResourceStream = fs.createReadStream(__dirname + '/assets/config-hello-world-subclassmapping.jsonld').pipe(new JsonLdStreamParser());
      const run = await runner.instantiateFromStream('http://example.org/myHelloWorld3', configResourceStream);
      expect(run._params).toEqual({
        'something': ["SOMETHING"],
        'something1': ["SOMETHING1"],
        'something2': ["SOMETHING2"]
      });
    });
  });

  describe('constructing an component with inheritable parameter values with constructor mappings', function () {
    beforeEach(async() => {
      let moduleStream = fs.createReadStream(__dirname + '/assets/module-hello-world-inheritableparams-subclassmapping.jsonld').pipe(new JsonLdStreamParser());
      await runner.registerModuleResourcesStream(moduleStream);
    });

    it('should produce instances with inherited parameter values', async() => {
      let configResourceStream1 = fs.createReadStream(__dirname + '/assets/config-hello-world-inheritableparams.jsonld').pipe(new JsonLdStreamParser());
      let configResourceStream2 = fs.createReadStream(__dirname + '/assets/config-hello-world-inheritableparams.jsonld').pipe(new JsonLdStreamParser());
      const run1 = await runner.instantiateFromStream('http://example.org/myHelloWorld1', configResourceStream1);
      expect(run1._params).toEqual({
        'something': ["SOMETHING"]
      });
      const run2 = await runner.instantiateFromStream('http://example.org/myHelloWorld2', configResourceStream2);
      expect(run2._params).toEqual({
        'something': ["SOMETHING"]
      });
    });
  });

  describe('constructing components from an abstract component with dynamic entries in constructor mappings', function () {
    beforeEach(async() => {
      let moduleStream = fs.createReadStream(__dirname + '/assets/module-hello-world-dynamicentries.jsonld').pipe(new JsonLdStreamParser());
      await runner.registerModuleResourcesStream(moduleStream);
    });

    it('should allow a config stream with component instances to be run', async() => {
      let configResourceStream = fs.createReadStream(__dirname + '/assets/config-hello-world-dynamicentries.jsonld').pipe(new JsonLdStreamParser());
      const run = await runner.instantiateFromStream('http://example.org/myHelloWorld1', configResourceStream)
      expect(run._params).toEqual({
        'KEY1': 'VALUE1',
        'KEY2': 'VALUE2'
      });
    });

    it('should allow a config stream with component instances to be run', async() => {
      let configResourceStream = fs.createReadStream(__dirname + '/assets/config-hello-world-dynamicentries.jsonld').pipe(new JsonLdStreamParser());
      const run = await runner.instantiateFromStream('http://example.org/myHelloWorld2', configResourceStream)
      expect(run._params).toEqual({
        'KEY3': 'VALUE3',
        'KEY4': 'VALUE4'
      });
    });
  });

  describe('constructing components from an abstract component with constructor mappings with inheritable parameters and dynamic entries', function () {
    beforeEach(async() => {
      let moduleStream = fs.createReadStream(__dirname + '/assets/module-hello-world-subclassmapping-dynamicentries.jsonld').pipe(new JsonLdStreamParser());
      await runner.registerModuleResourcesStream(moduleStream);
    });

    it('should allow a config stream with component instances with inherited parameters from the parent to be run', async() => {
      let configResourceStream = fs.createReadStream(__dirname + '/assets/config-hello-world-subclassmapping-dynamicentries.jsonld').pipe(new JsonLdStreamParser());
      const run = await runner.instantiateFromStream('http://example.org/myHelloWorld1', configResourceStream)
      expect(run._params).toEqual({
        '0KEY1': '0VALUE1',
        '0KEY2': '0VALUE2',
        '1KEY1': '1VALUE1',
        '1KEY2': '1VALUE2'
      });
    });

    it('should allow a config stream with component instances with inherited parameters from the parent\'s parent to be run', async() => {
      let configResourceStream = fs.createReadStream(__dirname + '/assets/config-hello-world-subclassmapping-dynamicentries.jsonld').pipe(new JsonLdStreamParser());
      const run = await runner.instantiateFromStream('http://example.org/myHelloWorld2', configResourceStream)
      expect(run._params).toEqual({
        '0KEY1': '0VALUE1',
        '0KEY2': '0VALUE2',
        '1KEY1': '1VALUE1',
        '1KEY2': '1VALUE2',
        '2KEY1': '2VALUE1',
        '2KEY2': '2VALUE2'
      });
    });
  });

  describe('constructing an component with inheritable parameter values with constructor mappings, inherited parameters and dynamic entries', function () {
    beforeEach(async() => {
      let moduleStream = fs.createReadStream(__dirname + '/assets/module-hello-world-inheritableparams-subclassmapping-dynamicentries.jsonld').pipe(new JsonLdStreamParser());
      await runner.registerModuleResourcesStream(moduleStream);
    });

    it('should produce instances with inherited parameter values', async() => {
      let configResourceStream1 = fs.createReadStream(__dirname + '/assets/config-hello-world-dynamicentries2.jsonld').pipe(new JsonLdStreamParser());
      let configResourceStream2 = fs.createReadStream(__dirname + '/assets/config-hello-world-dynamicentries2.jsonld').pipe(new JsonLdStreamParser());
      const run1 = await runner.instantiateFromStream('http://example.org/myHelloWorld1', configResourceStream1)
      expect(run1._params).toEqual({
        'somethings1': {
          'KEY1': 'VALUE1',
          'KEY2': 'VALUE2'
        }
      });
      const run2 = await runner.instantiateFromStream('http://example.org/myHelloWorld2', configResourceStream2)
      expect(run2._params).toEqual({
        'somethings1': {
          'KEY1': 'VALUE1',
          'KEY2': 'VALUE2'
        },
        'somethings2': {
          'KEY1': 'VALUE1',
          'KEY2': 'VALUE2'
        },
        'somethings3': {
          'KEY3': 'VALUE3',
          'KEY4': 'VALUE4'
        }
      });
    });
  });

  describe('constructing an component with inheritable parameter values and dynamic entries', function () {
    beforeEach(async() => {
      let moduleStream = fs.createReadStream(__dirname + '/assets/module-hello-world-inheritableparams-dynamicentries.jsonld').pipe(new JsonLdStreamParser());
      await runner.registerModuleResourcesStream(moduleStream);
    });

    it('should produce instances with inherited parameter values', async() => {
      let configResourceStream1 = fs.createReadStream(__dirname + '/assets/config-hello-world-inheritableparams-dynamicentries.jsonld').pipe(new JsonLdStreamParser());
      let configResourceStream2 = fs.createReadStream(__dirname + '/assets/config-hello-world-inheritableparams-dynamicentries.jsonld').pipe(new JsonLdStreamParser());
      const run1 = await runner.instantiateFromStream('http://example.org/myHelloWorld1', configResourceStream1)
      expect(run1._params).toEqual({
        'KEY1': 'VALUE1',
        'KEY2': 'VALUE2'
      });
      const run2 = await runner.instantiateFromStream('http://example.org/myHelloWorld2', configResourceStream2)
      expect(run2._params).toEqual({
        'KEY1': 'VALUE1',
        'KEY2': 'VALUE2'
      });
    });
  });

  describe('an empty resource', function () {
    var resource = new Resource('');
    it('must be an invalid component', function () {
      expect(runner._isValidComponent(resource)).toBeFalsy();
    });
  });

  describe('a basic resource', function () {
    var resource = new Resource('http://example.org', { a: 'b', types: [ new Resource('aaa') ] });
    it('must be an invalid component', function () {
      expect(runner._isValidComponent(resource)).toBeFalsy();
    });
  });

  describe('a resource with the abstract class type', function () {
    var resource = new Resource('http://example.org', { a: 'b', types: [ new Resource(Util.PREFIXES['oo'] + 'AbstractClass') ] });
    it('must be a valid component', function () {
      expect(runner._isValidComponent(resource)).toBeTruthy();
    });
  });

  describe('a resource with the class type', function () {
    var resource = new Resource('http://example.org', { a: 'b', types: [ new Resource(Util.PREFIXES['oo'] + 'Class') ] });
    it('must be a valid component', function () {
      expect(runner._isValidComponent(resource)).toBeTruthy();
    });
  });

  describe('constructing an component with typed parameters', function () {
    beforeEach(async() => {
      let moduleStream = fs.createReadStream(__dirname + '/assets/module-hello-world-paramranges.jsonld').pipe(new JsonLdStreamParser());
      await runner.registerModuleResourcesStream(moduleStream);
    });

    it('should produce instances with correct parameter values after an erroring instantiation', async() => {
      let configResourceStream1 = fs.createReadStream(__dirname + '/assets/config-hello-world.jsonld').pipe(new JsonLdStreamParser());
      let configResourceStream2 = fs.createReadStream(__dirname + '/assets/config-hello-world-paramranges.jsonld').pipe(new JsonLdStreamParser());
      await expect(runner.instantiateFromStream('http://example.org/myconfig', configResourceStream1))
        .rejects.toThrow(new Error('HI is not of type http://www.w3.org/2001/XMLSchema#boolean for parameter http://example.org/hello/say'));
      const run2 = await runner.instantiateFromStream('http://example.org/myconfig2', configResourceStream2)
      expect(run2._params).toEqual({
        'http://example.org/hello/hello': ['WORLD'],
        'http://example.org/hello/say': [true]
      });
    });
  });

  describe('constructing components from a component with nested dynamic entries in constructor mappings', function () {
    beforeEach(async() => {
      let moduleStream = fs.createReadStream(__dirname + '/assets/module-hello-world-dynamicentries-nested.jsonld').pipe(new JsonLdStreamParser());
      await runner.registerModuleResourcesStream(moduleStream);
    });

    it('should allow a config stream with component instances to be run with nested array mappings', async() => {
      let configResourceStream = fs.createReadStream(__dirname + '/assets/config-hello-world-dynamicentries-nested.jsonld').pipe(new JsonLdStreamParser());
      const run = await runner.instantiateFromStream('http://example.org/myHelloWorld1', configResourceStream)
      expect(run._params).toEqual({
        'KEY1': {
          'sub-KEY1': ['1', '2'],
          'sub-KEY2': ['a', 'b']
        },
        'KEY2': {
          'sub-KEY1': ['1', '2'],
        }
      });
    });

    it('should allow a config stream with component instances to be run with nested object mappings', async() => {
      let configResourceStream = fs.createReadStream(__dirname + '/assets/config-hello-world-dynamicentries-nested.jsonld').pipe(new JsonLdStreamParser());
      const run = await runner.instantiateFromStream('http://example.org/myHelloWorld2', configResourceStream);
      expect(run._params).toEqual({
        'KEY1': {
          'sub-KEY1': {
            'initial': ['1'],
            'final': ['2']
          },
          'sub-KEY2': {
            'initial': ['a'],
            'final': ['b']
          }
        },
        'KEY2': {
          'sub-KEY1': {
            'initial': ['1'],
            'final': ['2']
          }
        }
      });
    });

    it('should allow a config stream with component instances to be run with double nested array mappings', async() => {
      let configResourceStream = fs.createReadStream(__dirname + '/assets/config-hello-world-dynamicentries-nested.jsonld').pipe(new JsonLdStreamParser());
      const run = await runner.instantiateFromStream('http://example.org/myHelloWorld3', configResourceStream);
      expect(run._params).toEqual({
        'KEY1': [
          ['1', '2'],
          ['a', 'b']
        ],
        'KEY2': [
          ['1', '2'],
        ]
      });
    });
  });

    describe('constructing an component with lazy parameters values', function () {
        beforeEach(async() => {
            let moduleStream = fs.createReadStream(__dirname + '/assets/module-hello-world-lazy.jsonld').pipe(new JsonLdStreamParser());
            await runner.registerModuleResourcesStream(moduleStream);
        });

        it('should produce instances with lazy parameter values', async() => {
            let configResourceStream = fs.createReadStream(__dirname + '/assets/config-hello-world-lazy.jsonld').pipe(new JsonLdStreamParser());
          const run = await runner.instantiateFromStream('http://example.org/myHelloWorldLazy1', configResourceStream)
          const val1 = await run._params.somethingLazy();
          const val2 = await val1._params.somethingLazy();
          expect(val2).toEqual('bla');
        });
    });
});
