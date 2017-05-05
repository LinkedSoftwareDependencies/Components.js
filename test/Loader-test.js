require('should');
const RdfClassLoader = require("../lib/rdf/RdfClassLoader").RdfClassLoader;
const Resource = require("../lib/rdf/Resource").Resource;
const JsonLdStreamParser = require("../lib/rdf/JsonLdStreamParser").JsonLdStreamParser;
const Loader = require("../lib/Loader").Loader;
const Constants = require("../lib/Util");
const Hello = require("./helloworld").Hello;
const fs = require("fs");
const Readable = require("stream").Readable;

describe('Loader', function () {
  var runner;
  beforeEach(function () {
    runner = new Loader();
  });

  describe('constructing an N3 Parser, unnamed', function () {
    it('should construct a module loader', function () {
      runner._newModuleLoader().should.be.instanceof(RdfClassLoader);
      runner._newModuleLoader()._captureAllProperties.should.be.true();
      runner._newModuleLoader()._captureAllClasses.should.be.false();
    });

    it('should construct a config loader', function () {
      runner._newConfigLoader().should.be.instanceof(RdfClassLoader);
      runner._newConfigLoader()._captureAllProperties.should.be.true();
      runner._newConfigLoader()._captureAllClasses.should.be.true();
    });

    it('should allow components to be registered', function () {
      let component1 = new Resource('mycomponent1');
      let component2 = new Resource('mycomponent2');
      let component3 = new Resource('mycomponent3');
      runner._registerComponentResource(component1);
      runner._registerComponentResource(component2);
      runner._registerComponentResource(component3);
      runner._componentResources.should.have.property('mycomponent1', component1);
      runner._componentResources.should.have.property('mycomponent2', component2);
      runner._componentResources.should.have.property('mycomponent3', component3);
    });

    it('should allow module components to be registered', function () {
      let component1 = new Resource('mycomponent1');
      let component2 = new Resource('mycomponent2');
      let component3 = new Resource('mycomponent3');
      let module = new Resource('mymodule', { hasComponent: [ component1, component2, component3 ] });
      runner.registerModuleResource(module);
      runner._componentResources.should.have.property('mycomponent1', component1);
      runner._componentResources.should.have.property('mycomponent2', component2);
      runner._componentResources.should.have.property('mycomponent3', component3);
    });

    describe('with a manual triple stream', function () {
      let module = 'http://example.org/myModule';
      let component1 = 'http://example.org/myModule#mycomponent1';
      let component2 = 'http://example.org/myModule#mycomponent2';
      let component3 = 'http://example.org/myModule#mycomponent3';

      beforeEach(function (done) {
        let moduleStream = new Readable({ objectMode: true });
        moduleStream.push({ subject: module, predicate: Constants.PREFIXES['rdf'] + 'type', object: Constants.PREFIXES['lsdc'] + 'Module'});
        moduleStream.push({ subject: module, predicate: Constants.PREFIXES['lsdc'] + 'hasComponent', object: component1});
        moduleStream.push({ subject: module, predicate: Constants.PREFIXES['npm'] + 'requireName', object: '"../../test/helloworld"'});
        moduleStream.push({ subject: component1, predicate: Constants.PREFIXES['rdf'] + 'type', object: Constants.PREFIXES['lsdc'] + 'ComponentConstructable'});
        moduleStream.push({ subject: component1, predicate: Constants.PREFIXES['npm'] + 'requireElement', object: '"Hello"'});
        moduleStream.push({ subject: component1, predicate: Constants.PREFIXES['lsdc'] + 'hasParameter', object: 'http://example.org/myModule/params#param1'});
        moduleStream.push({ subject: component1, predicate: Constants.PREFIXES['lsdc'] + 'hasParameter', object: 'http://example.org/myModule/params#param3'});
        moduleStream.push({ subject: module, predicate: Constants.PREFIXES['lsdc'] + 'hasComponent', object: component2});
        moduleStream.push({ subject: component2, predicate: Constants.PREFIXES['rdf'] + 'type', object: Constants.PREFIXES['lsdc'] + 'ComponentConstructable'});
        moduleStream.push({ subject: component2, predicate: Constants.PREFIXES['npm'] + 'requireElement', object: '"Hello"'});
        moduleStream.push({ subject: component2, predicate: Constants.PREFIXES['lsdc'] + 'hasParameter', object: 'http://example.org/myModule/params#param1'});
        moduleStream.push({ subject: module, predicate: Constants.PREFIXES['lsdc'] + 'hasComponent', object: component3});
        moduleStream.push({ subject: component3, predicate: Constants.PREFIXES['rdf'] + 'type', object: Constants.PREFIXES['lsdc'] + 'ComponentConstructable'});
        moduleStream.push({ subject: component3, predicate: Constants.PREFIXES['npm'] + 'requireElement', object: '"Hello"'});
        moduleStream.push({ subject: component3, predicate: Constants.PREFIXES['lsdc'] + 'hasParameter', object: 'http://example.org/myModule/params#param2'});
        moduleStream.push(null);
        runner.registerModuleResourcesStream(moduleStream).then(done);
      });

      it('should allow module components to be registered', function () {
        runner._componentResources.should.have.property(component1);
        runner._componentResources.should.have.property(component2);
        runner._componentResources.should.have.property(component3);
      });

      it('should allow a config resource to be run', function () {
        let fields = { types: [ new Resource(component1) ] };
        fields['http://example.org/myModule/params#param1'] = [ Resource.newString('ABC') ];
        fields['http://example.org/myModule/params#param2'] = [ Resource.newString('DEF') ];
        fields['http://example.org/myModule/params#param3'] = [ Resource.newString('GHI') ];
        var run = runner.instantiate(new Resource(null, fields));
        run._params.should.deepEqual({
          'http://example.org/myModule/params#param1': ['ABC'],
          'http://example.org/myModule/params#param3': ['GHI']
        });
      });

      it('should allow a config stream to be run', function (done) {
        let config1 = 'http://example.org/myModule#myconfig1';
        let configResourceStream = new Readable({ objectMode: true });
        configResourceStream.push({ subject: config1, predicate: Constants.PREFIXES['rdf'] + 'type', object: component1});
        configResourceStream.push({ subject: config1, predicate: 'http://example.org/myModule/params#param1', object: '"ABC"'});
        configResourceStream.push({ subject: config1, predicate: 'http://example.org/myModule/params#param2', object: '"DEF"'});
        configResourceStream.push({ subject: config1, predicate: 'http://example.org/myModule/params#param3', object: '"GHI"'});
        configResourceStream.push(null);

        runner.instantiateFromStream(config1, configResourceStream).then((run) => {
          run._params.should.deepEqual({
            'http://example.org/myModule/params#param1': ['ABC'],
            'http://example.org/myModule/params#param3': ['GHI']
          });
          done();
        }).catch(done);
      });

      it('should allow a manual run', function () {
        let params = {};
        params['http://example.org/myModule/params#param1'] = 'ABC';
        params['http://example.org/myModule/params#param2'] = 'DEF';
        params['http://example.org/myModule/params#param3'] = 'GHI';
        let run = runner.instantiateManually(component1, params);
        run._params.should.deepEqual({
          'http://example.org/myModule/params#param1': ['ABC'],
          'http://example.org/myModule/params#param3': ['GHI']
        });
      });
    });

    describe('with a file triple stream', function () {
      beforeEach(function (done) {
        let moduleStream = fs.createReadStream(__dirname + '/assets/module-hello-world.jsonld').pipe(new JsonLdStreamParser());
        runner.registerModuleResourcesStream(moduleStream).then(done);
      });

      it('should allow module components to be registered', function () {
        runner._componentResources.should.have.property('http://example.org/HelloWorldModule#SayHelloComponent');
      });

      it('should allow a config resource to be run', function () {
        let fields = { types: [ new Resource('http://example.org/HelloWorldModule#SayHelloComponent') ] };
        fields['http://example.org/hello/hello'] = [ Resource.newString('WORLD') ];
        fields['http://example.org/hello/say'] = [ Resource.newString('HELLO') ];
        fields['http://example.org/hello/bla'] = [ Resource.newString('BLA') ];
        var run = runner.instantiate(new Resource(null, fields));
        run._params.should.deepEqual({
          'http://example.org/hello/hello': ['WORLD'],
          'http://example.org/hello/say': ['HELLO']
        });
      });

      it('should allow a config stream to be run', function (done) {
        let configResourceStream = fs.createReadStream(__dirname + '/assets/config-hello-world.jsonld').pipe(new JsonLdStreamParser());
        runner.instantiateFromStream('http://example.org/myconfig', configResourceStream).then((run) => {
          run._params.should.deepEqual({
            'http://example.org/hello/hello': ['WORLD'],
            'http://example.org/hello/say': ['HI']
          });
          done();
        }).catch(done);
      });

      it('should allow a manual run', function () {
        let params = {};
        params['http://example.org/hello/hello'] = 'WORLD';
        params['http://example.org/hello/say'] = 'BONJOUR';
        params['http://example.org/hello/bla'] = 'BLA';
        let run = runner.instantiateManually('http://example.org/HelloWorldModule#SayHelloComponent', params);
        run._params.should.deepEqual({
          'http://example.org/hello/hello': ['WORLD'],
          'http://example.org/hello/say': ['BONJOUR']
        });
      });
    });

    it('should get contents from a file', function () {
      return Constants.getContentsFromUrlOrPath('assets/dummy.txt', __dirname)
        .then((data) => new Promise((resolve, reject) => {
          let body = '';
          data.on('data', (d) => body += d.toString());
          data.on('end', () => resolve(body));
        }))
        .should.eventually.equal('ABC');
    });

    it('should get contents from an URL', function () {
      return Constants.getContentsFromUrlOrPath('http://google.com', __dirname)
        .should.be.fulfilled();
    });

    describe('with a valid JSON file path', function () {
      beforeEach(function (done) {
        runner.registerModuleResourcesUrl('./assets/module-hello-world.jsonld', __dirname).then(done, done);
      });

      it('should allow module components to be registered', function () {
        runner._componentResources.should.have.property('http://example.org/HelloWorldModule#SayHelloComponent');
      });
    });

    describe('with a valid ttl file path', function () {
      beforeEach(function (done) {
        runner.registerModuleResourcesUrl('/assets/module-hello-world.ttl', __dirname).then(done, done);
      });

      it('should allow module components to be registered', function () {
        runner._componentResources.should.have.property('http://example.org/HelloWorldModuleSayHelloComponent');
      });
    });

    describe('with an invalid file path', function () {
      it('should reject the promise', function () {
        return runner.registerModuleResourcesUrl('/assets/module-hello-world.jsonld.invalid', __dirname)
          .should.be.rejected();
      });
    });

    describe('with import statements', function () {
      beforeEach(function (done) {
        runner.registerModuleResourcesUrl('/assets/module-hello-world-imports.jsonld', __dirname).then(done, done);
      });

      it('should import components', function () {
        runner._componentResources.should.have.property('http://example.org/HelloWorldModule#SayHelloComponent1');
        runner._componentResources.should.have.property('http://example.org/HelloWorldModule#SayHelloComponent2');
      });
    });
  });

  describe('constructing an component with constructor mappings', function () {
    beforeEach(function (done) {
      let moduleStream = fs.createReadStream(__dirname + '/assets/module-hello-world-mapping.jsonld').pipe(new JsonLdStreamParser());
      runner.registerModuleResourcesStream(moduleStream).then(done);
    });

    it('should produce instances with correct parameter values', function (done) {
      let configResourceStream1 = fs.createReadStream(__dirname + '/assets/config-hello-world-mapping.jsonld').pipe(new JsonLdStreamParser());
      let configResourceStream2 = fs.createReadStream(__dirname + '/assets/config-hello-world-mapping.jsonld').pipe(new JsonLdStreamParser());
      runner.instantiateFromStream('http://example.org/myHelloWorld1', configResourceStream1).then((run) => {
        run._params.should.deepEqual({
          'something1': [ 'SOMETHING1', 'SOMETHING2' ],
        });
        runner.instantiateFromStream('http://example.org/myHelloWorld2', configResourceStream2).then((run) => {
          run._params.should.deepEqual([ 'SOMETHING3', 'SOMETHING4' ]);
          done();
        }).catch(done);
      }).catch(done);
    });
  });

  describe('constructing an component with referenced parameters values', function () {
    beforeEach(function (done) {
      let moduleStream = fs.createReadStream(__dirname + '/assets/module-hello-world.jsonld').pipe(new JsonLdStreamParser());
      runner.registerModuleResourcesStream(moduleStream).then(done);
    });

    it('should produce instances with equal parameter values', function (done) {
      let configResourceStream = fs.createReadStream(__dirname + '/assets/config-hello-world-referenced.jsonld').pipe(new JsonLdStreamParser());
      runner.instantiateFromStream('http://example.org/myHelloWorld1', configResourceStream).then((run) => {
        run._params.should.deepEqual({
          'http://example.org/hello/hello': [ new Hello() ],
          'http://example.org/hello/say': [ new Hello() ]
        });
        run._params['http://example.org/hello/hello'][0].should.be.equal(run._params['http://example.org/hello/say'][0]);
        done();
      }).catch(done);
    });

    it('should produce instances with different parameter values', function (done) {
      let configResourceStream = fs.createReadStream(__dirname + '/assets/config-hello-world-unreferenced.jsonld').pipe(new JsonLdStreamParser());
      runner.instantiateFromStream('http://example.org/myHelloWorld1', configResourceStream).then((run) => {
        run._params.should.deepEqual({
          'http://example.org/hello/hello': [ new Hello() ],
          'http://example.org/hello/say': [ new Hello() ]
        });
        run._params['http://example.org/hello/hello'][0].should.not.be.equal(run._params['http://example.org/hello/say'][0]);
        done();
      }).catch(done);
    });

    it('should produce invalid instances with itself as parameter value when self-referenced', function (done) {
      let configResourceStream = fs.createReadStream(__dirname + '/assets/config-hello-world-selfreferenced.jsonld').pipe(new JsonLdStreamParser());
      runner.instantiateFromStream('http://example.org/myHelloWorld1', configResourceStream).then((run) => {
        run._params.should.deepEqual({
          'http://example.org/hello/hello': [ {} ]
        });
        done();
      }).catch(done);
    });
  });

  describe('constructing an component with inheritable parameter values', function () {
    beforeEach(function (done) {
      let moduleStream = fs.createReadStream(__dirname + '/assets/module-hello-world-inheritableparams.jsonld').pipe(new JsonLdStreamParser());
      runner.registerModuleResourcesStream(moduleStream).then(done);
    });

    it('should produce instances with inherited parameter values', function (done) {
      let configResourceStream1 = fs.createReadStream(__dirname + '/assets/config-hello-world-inheritableparams.jsonld').pipe(new JsonLdStreamParser());
      let configResourceStream2 = fs.createReadStream(__dirname + '/assets/config-hello-world-inheritableparams.jsonld').pipe(new JsonLdStreamParser());
      runner.instantiateFromStream('http://example.org/myHelloWorld1', configResourceStream1).then((run) => {
        run._params.should.deepEqual({
          'http://example.org/hello/something': [ "SOMETHING" ]
        });
        runner.instantiateFromStream('http://example.org/myHelloWorld2', configResourceStream2).then((run) => {
          run._params.should.deepEqual({
            'http://example.org/hello/something': [ "SOMETHING" ]
          });
          done();
        }).catch(done);
      }).catch(done);
    });
  });

  describe('constructing components from an abstract component', function () {
    beforeEach(function (done) {
      let moduleStream = fs.createReadStream(__dirname + '/assets/module-hello-world-subclass.jsonld').pipe(new JsonLdStreamParser());
      runner.registerModuleResourcesStream(moduleStream).then(done);
    });

    it('should allow a config stream with component instances with inherited parameters from the parent to be run', function (done) {
      let configResourceStream = fs.createReadStream(__dirname + '/assets/config-hello-world-subclass.jsonld').pipe(new JsonLdStreamParser());
      runner.instantiateFromStream('http://example.org/myHelloWorld1', configResourceStream).then((run) => {
        run._params.should.deepEqual({
          'http://example.org/hello/something': [ "SOMETHING1" ]
        });
        done();
      }).catch(done);
    });

    it('should allow a config stream with component instances with inherited parameters from the parent\'s parent to be run', function (done) {
      let configResourceStream = fs.createReadStream(__dirname + '/assets/config-hello-world-subclass.jsonld').pipe(new JsonLdStreamParser());
      runner.instantiateFromStream('http://example.org/myHelloWorld2', configResourceStream).then((run) => {
        run._params.should.deepEqual({
          'http://example.org/hello/something': [ "SOMETHING2" ]
        });
        done();
      }).catch(done);
    });
  });

  describe('constructing components from an abstract component with constructor mappings', function () {
    beforeEach(function (done) {
      let moduleStream = fs.createReadStream(__dirname + '/assets/module-hello-world-subclassmapping.jsonld').pipe(new JsonLdStreamParser());
      runner.registerModuleResourcesStream(moduleStream).then(done);
    });

    it('should allow a config stream with component instances with inherited parameters from the parent to be run', function (done) {
      let configResourceStream = fs.createReadStream(__dirname + '/assets/config-hello-world-subclassmapping.jsonld').pipe(new JsonLdStreamParser());
      runner.instantiateFromStream('http://example.org/myHelloWorld1', configResourceStream).then((run) => {
        run._params.should.deepEqual({
          'something': [ "SOMETHING" ],
          'something1': [ "SOMETHING1" ]
        });
        done();
      }).catch(done);
    });

    it('should allow a config stream with component instances with inherited parameters from the parent\'s parent to be run', function (done) {
      let configResourceStream = fs.createReadStream(__dirname + '/assets/config-hello-world-subclassmapping.jsonld').pipe(new JsonLdStreamParser());
      runner.instantiateFromStream('http://example.org/myHelloWorld2', configResourceStream).then((run) => {
        run._params.should.deepEqual({
          'something': [ "SOMETHING" ],
          'something1': [ "SOMETHING1" ],
          'something2': [ "SOMETHING2" ]
        });
        done();
      }).catch(done);
    });
  });

  describe('constructing an component with inheritable parameter values with constructor mappings', function () {
    beforeEach(function (done) {
      let moduleStream = fs.createReadStream(__dirname + '/assets/module-hello-world-inheritableparams-subclassmapping.jsonld').pipe(new JsonLdStreamParser());
      runner.registerModuleResourcesStream(moduleStream).then(done);
    });

    it('should produce instances with inherited parameter values', function (done) {
      let configResourceStream1 = fs.createReadStream(__dirname + '/assets/config-hello-world-inheritableparams.jsonld').pipe(new JsonLdStreamParser());
      let configResourceStream2 = fs.createReadStream(__dirname + '/assets/config-hello-world-inheritableparams.jsonld').pipe(new JsonLdStreamParser());
      runner.instantiateFromStream('http://example.org/myHelloWorld1', configResourceStream1).then((run) => {
        run._params.should.deepEqual({
          'something': [ "SOMETHING" ]
        });
        runner.instantiateFromStream('http://example.org/myHelloWorld2', configResourceStream2).then((run) => {
          run._params.should.deepEqual({
            'something': [ "SOMETHING" ]
          });
          done();
        }).catch(done);
      }).catch(done);
    });
  });

  describe('constructing components from an abstract component with dynamic entries in constructor mappings', function () {
    beforeEach(function (done) {
      let moduleStream = fs.createReadStream(__dirname + '/assets/module-hello-world-dynamicentries.jsonld').pipe(new JsonLdStreamParser());
      runner.registerModuleResourcesStream(moduleStream).then(done);
    });

    it('should allow a config stream with component instances to be run', function (done) {
      let configResourceStream = fs.createReadStream(__dirname + '/assets/config-hello-world-dynamicentries.jsonld').pipe(new JsonLdStreamParser());
      runner.instantiateFromStream('http://example.org/myHelloWorld1', configResourceStream).then((run) => {
        run._params.should.deepEqual({
          'KEY1': 'VALUE1',
          'KEY2': 'VALUE2'
        });
        done();
      }).catch(done);
    });

    it('should allow a config stream with component instances to be run', function (done) {
      let configResourceStream = fs.createReadStream(__dirname + '/assets/config-hello-world-dynamicentries.jsonld').pipe(new JsonLdStreamParser());
      runner.instantiateFromStream('http://example.org/myHelloWorld2', configResourceStream).then((run) => {
        run._params.should.deepEqual({
          'KEY3': 'VALUE3',
          'KEY4': 'VALUE4'
        });
        done();
      }).catch(done);
    });
  });

  describe('constructing components from an abstract component with constructor mappings with inheritable parameters and dynamic entries', function () {
    beforeEach(function (done) {
      let moduleStream = fs.createReadStream(__dirname + '/assets/module-hello-world-subclassmapping-dynamicentries.jsonld').pipe(new JsonLdStreamParser());
      runner.registerModuleResourcesStream(moduleStream).then(done);
    });

    it('should allow a config stream with component instances with inherited parameters from the parent to be run', function (done) {
      let configResourceStream = fs.createReadStream(__dirname + '/assets/config-hello-world-subclassmapping-dynamicentries.jsonld').pipe(new JsonLdStreamParser());
      runner.instantiateFromStream('http://example.org/myHelloWorld1', configResourceStream).then((run) => {
        run._params.should.deepEqual({
          '0KEY1': '0VALUE1',
          '0KEY2': '0VALUE2',
          '1KEY1': '1VALUE1',
          '1KEY2': '1VALUE2'
        });
        done();
      }).catch(done);
    });

    it('should allow a config stream with component instances with inherited parameters from the parent\'s parent to be run', function (done) {
      let configResourceStream = fs.createReadStream(__dirname + '/assets/config-hello-world-subclassmapping-dynamicentries.jsonld').pipe(new JsonLdStreamParser());
      runner.instantiateFromStream('http://example.org/myHelloWorld2', configResourceStream).then((run) => {
        run._params.should.deepEqual({
          '0KEY1': '0VALUE1',
          '0KEY2': '0VALUE2',
          '1KEY1': '1VALUE1',
          '1KEY2': '1VALUE2',
          '2KEY1': '2VALUE1',
          '2KEY2': '2VALUE2'
        });
        done();
      }).catch(done);
    });
  });

  describe('constructing an component with inheritable parameter values with constructor mappings, inherited parameters and dynamic entries', function () {
    beforeEach(function (done) {
      let moduleStream = fs.createReadStream(__dirname + '/assets/module-hello-world-inheritableparams-subclassmapping-dynamicentries.jsonld').pipe(new JsonLdStreamParser());
      runner.registerModuleResourcesStream(moduleStream).then(done);
    });

    it('should produce instances with inherited parameter values', function (done) {
      let configResourceStream1 = fs.createReadStream(__dirname + '/assets/config-hello-world-dynamicentries2.jsonld').pipe(new JsonLdStreamParser());
      let configResourceStream2 = fs.createReadStream(__dirname + '/assets/config-hello-world-dynamicentries2.jsonld').pipe(new JsonLdStreamParser());
      runner.instantiateFromStream('http://example.org/myHelloWorld1', configResourceStream1).then((run) => {
        run._params.should.deepEqual({
          'somethings1': {
            'KEY1': 'VALUE1',
            'KEY2': 'VALUE2'
          }
        });
        runner.instantiateFromStream('http://example.org/myHelloWorld2', configResourceStream2).then((run) => {
          run._params.should.deepEqual({
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
          done();
        }).catch(done);
      }).catch(done);
    });
  });

  describe('constructing an component with inheritable parameter values and dynamic entries', function () {
    beforeEach(function (done) {
      let moduleStream = fs.createReadStream(__dirname + '/assets/module-hello-world-inheritableparams-dynamicentries.jsonld').pipe(new JsonLdStreamParser());
      runner.registerModuleResourcesStream(moduleStream).then(done);
    });

    it('should produce instances with inherited parameter values', function (done) {
      let configResourceStream1 = fs.createReadStream(__dirname + '/assets/config-hello-world-inheritableparams-dynamicentries.jsonld').pipe(new JsonLdStreamParser());
      let configResourceStream2 = fs.createReadStream(__dirname + '/assets/config-hello-world-inheritableparams-dynamicentries.jsonld').pipe(new JsonLdStreamParser());
      runner.instantiateFromStream('http://example.org/myHelloWorld1', configResourceStream1).then((run) => {
        run._params.should.deepEqual({
          'KEY1': 'VALUE1',
          'KEY2': 'VALUE2'
        });
        runner.instantiateFromStream('http://example.org/myHelloWorld2', configResourceStream2).then((run) => {
          run._params.should.deepEqual({
            'KEY1': 'VALUE1',
            'KEY2': 'VALUE2'
          });
          done();
        }).catch(done);
      }).catch(done);
    });
  });
});
