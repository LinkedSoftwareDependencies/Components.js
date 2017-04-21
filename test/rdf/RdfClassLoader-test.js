require('should');
const RdfClassLoader = require("../../lib/rdf/RdfClassLoader").RdfClassLoader;
const N3 = require("n3");
const fs = require("fs");

describe('RdfClassLoader', function () {
  describe('for triples.ttl', function () {
    var tripleStream;
    beforeEach(function () {
      tripleStream = new N3.StreamParser();
      var fileStream = fs.createReadStream(__dirname + '/../assets/triples.ttl');
      fileStream.pipe(tripleStream);
    });

    describe('without bound properties and classes', function () {
      var loader;
      beforeEach(function () {
        loader = new RdfClassLoader();
      });

      it('should have no properties', function () {
        loader._properties.should.be.empty;
      });

      it('should have no classes', function () {
        loader._classes.should.be.empty;
      });

      describe('with triple stream piping', function () {
        beforeEach(function (done) {
          tripleStream.pipe(loader);
          loader.on('finish', done);
        });

        it('should have 2 resources', function () {
          Object.keys(loader.resources).length.should.equal(2);
          loader.resources.should.have.property('a');
          loader.resources.should.have.property('b');
        });

        it('should have no types', function () {
          Object.keys(loader.typedResources).length.should.equal(0);
        });
      });
    });

    describe('with bound properties and classes', function () {
      var loader;
      beforeEach(function () {
        loader = new RdfClassLoader();

        loader.bindProperty('field0', 'http://example.org/p0');
        loader.bindProperty('field1', 'http://example.org/p1');
        loader.bindProperty('field2', 'http://example.org/p2');

        loader.bindClass('a', 'http://example.org/A');
        loader.bindClass('b', 'http://example.org/B');
      });

      it('should allow property binding', function () {
        loader._properties.should.have.property('http://example.org/p0', 'field0');
        loader._properties.should.have.property('http://example.org/p1', 'field1');
        loader._properties.should.have.property('http://example.org/p2', 'field2');
      });

      it('should allow triple stream transformation', function () {
        tripleStream.pipe(loader);
      });

      describe('with triple stream piping', function () {
        beforeEach(function (done) {
          tripleStream.pipe(loader);
          loader.on('finish', done);
        });

        it('should have 9 resources', function () {
          Object.keys(loader.resources).length.should.equal(9);
          loader.resources.should.have.property('a');
          loader.resources.should.have.property('b');
          loader.resources.should.have.property('"a0a"');
          loader.resources.should.have.property('"a0b"');
          loader.resources.should.have.property('"a0c"');
          loader.resources.should.have.property('"a1a"');
          loader.resources.should.have.property('"b0a"');
          loader.resources.should.have.property('"b2a"');
          loader.resources.should.have.property('"b2b"');
        });

        it('should have 2 typed resources', function () {
          Object.keys(loader.typedResources).length.should.equal(2);
          loader.typedResources.should.have.property('a');
          loader.typedResources.should.have.property('b');
        });

        it('resource "a" should have fields', function () {
          let field0 = loader.resources['a'].field0;
          Object.keys(field0).length.should.equal(3);
          field0.should.have.containEql(loader.resources['"a0a"']);
          field0.should.have.containEql(loader.resources['"a0b"']);
          field0.should.have.containEql(loader.resources['"a0c"']);

          let field1 = loader.resources['a'].field1;
          Object.keys(field1).length.should.equal(1);
          field1.should.have.containEql(loader.resources['"a1a"']);

          let field2 = loader.resources['a'].field2;
          Object.keys(field2).length.should.equal(1);
          field2.should.have.containEql(loader.resources['b']);
        });

        it('resource "b" should have fields', function () {
          let field0 = loader.resources['b'].field0;
          Object.keys(field0).length.should.equal(1);
          field0.should.have.containEql(loader.resources['"b0a"']);

          let field1 = loader.resources['b'].field1;
          Object.keys(field1).length.should.equal(1);
          field1.should.have.containEql(loader.resources['a']);

          let field2 = loader.resources['b'].field2;
          Object.keys(field2).length.should.equal(2);
          field2.should.have.containEql(loader.resources['"b2a"']);
          field2.should.have.containEql(loader.resources['"b2b"']);
        });

        it('should have 2 type "a" resources', function () {
          loader.typedResources['a'].length.should.equal(2);
          loader.typedResources['a'].should.have.containEql(loader.resources['a']);
          loader.typedResources['a'].should.have.containEql(loader.resources['b']);
        });

        it('should have 1 type "b" resource', function () {
          loader.typedResources['b'].length.should.equal(1);
          loader.typedResources['b'].should.have.containEql(loader.resources['b']);
        });
      });
    });
  });

  describe('for list.ttl', function () {
    var tripleStream;
    beforeEach(function () {
      tripleStream = new N3.StreamParser();
      var fileStream = fs.createReadStream(__dirname + '/../assets/list.ttl');
      fileStream.pipe(tripleStream);
    });

    describe('with bound properties and classes', function () {
      var loader;
      beforeEach(function () {
        loader = new RdfClassLoader();

        loader.bindProperty('withList', 'http://example.org/withList');
        loader.bindClass('a', 'http://example.org/A');
      });

      describe('with triple stream piping', function () {
        beforeEach(function (done) {
          tripleStream.pipe(loader);
          loader.on('finish', done);
        });

        it('should have 1 resource', function () {
          Object.keys(loader.resources).length.should.equal(4);
          loader.resources.should.have.property('a');
          loader.resources.should.have.property('1');
          loader.resources.should.have.property('2');
          loader.resources.should.have.property('3');
        });

        it('"a" should have a list', function () {
          let list = loader.resources['a'].withList[0];
          list.should.have.property('list');
          list.list.length.should.equal(3);
          list.list.should.have.containEql(loader.resources['1']);
          list.list.should.have.containEql(loader.resources['2']);
          list.list.should.have.containEql(loader.resources['3']);
        });
      });
    });
  });

  describe('for triples-unique.ttl', function () {
    var tripleStream;
    beforeEach(function () {
      tripleStream = new N3.StreamParser();
      var fileStream = fs.createReadStream(__dirname + '/../assets/triples-unique.ttl');
      fileStream.pipe(tripleStream);
    });

    describe('with bound unique properties', function () {
      var loader;
      beforeEach(function () {
        loader = new RdfClassLoader();

        loader.bindProperty('field0', 'http://example.org/p0');
        loader.bindProperty('field1', 'http://example.org/p1');
        loader.bindProperty('field2', 'http://example.org/p2');

        loader.setUniqueProperty('field0');
        loader.setUniqueProperty('field1');
        loader.setUniqueProperty('field2');
      });

      it('should have set unique properties', function () {
        loader._uniqueProperties.should.have.property('field0', true);
        loader._uniqueProperties.should.have.property('field1', true);
        loader._uniqueProperties.should.have.property('field2', true);
      });

      it('should allow triple stream transformation', function () {
        tripleStream.pipe(loader);
      });

      describe('with triple stream piping', function () {
        beforeEach(function (done) {
          tripleStream.pipe(loader);
          loader.on('finish', done);
        });

        it('resource "a" should have unique fields', function () {
          loader.resources['a'].field0.should.equal(loader.resources['"a0a"']);
          loader.resources['a'].field1.should.equal(loader.resources['"a1a"']);
          loader.resources['a'].field2.should.equal(loader.resources['b']);
        });
      });
    });
  });

  describe('for triples-nonunique.ttl', function () {
    var tripleStream;
    beforeEach(function () {
      tripleStream = new N3.StreamParser();
      var fileStream = fs.createReadStream(__dirname + '/../assets/triples-nonunique.ttl');
      fileStream.pipe(tripleStream);
    });

    describe('with bound unique properties', function () {
      var loader;
      beforeEach(function () {
        loader = new RdfClassLoader();

        loader.bindProperty('field0', 'http://example.org/p0');
        loader.bindProperty('field1', 'http://example.org/p1');
        loader.bindProperty('field2', 'http://example.org/p2');

        loader.setUniqueProperty('field0');
        loader.setUniqueProperty('field1');
        loader.setUniqueProperty('field2');
      });

      it('should not allow triple stream transformation', function (done) {
        tripleStream.pipe(loader);
        loader.on('error', (e) => done());
      });
    });
  });
});
