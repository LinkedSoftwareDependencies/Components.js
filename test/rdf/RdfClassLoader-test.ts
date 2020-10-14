import { RdfClassLoader } from '../../lib/rdf/RdfClassLoader';
import rdfParser from 'rdf-parse';
import { Readable } from "stream";
import * as fs from 'fs';

describe('RdfClassLoader', function () {
  describe('for triples.ttl', function () {
    let tripleStream: Readable;
    beforeEach(function () {
      tripleStream = rdfParser.parse(fs
        .createReadStream(__dirname + '/../assets/triples.ttl'), { contentType: 'text/turtle'});
    });

    describe('without bound properties and classes', function () {
      var loader: RdfClassLoader;
      beforeEach(function () {
        loader = new RdfClassLoader({ normalizeLists: false });
      });

      it('should have no properties', function () {
        expect(loader._properties).toEqual({});
      });

      it('should have no classes', function () {
        expect(loader._classes).toEqual({});
      });

      describe('with triple stream piping', function () {
        beforeEach(function (done) {
          tripleStream.pipe(loader);
          loader.on('finish', done);
        });

        it('should have 2 resources', function () {
          expect(Object.keys(loader.resources).length).toEqual(2);
          expect(loader.resources).toHaveProperty('a');
          expect(loader.resources).toHaveProperty('b');
        });

        it('should have no types', function () {
          expect(Object.keys(loader.typedResources).length).toEqual(0);
        });
      });
    });

    describe('with bound properties and classes', function () {
      var loader: RdfClassLoader;
      beforeEach(function () {
        loader = new RdfClassLoader();

        loader.bindProperty('field0', 'http://example.org/p0');
        loader.bindProperty('field1', 'http://example.org/p1');
        loader.bindProperty('field2', 'http://example.org/p2');

        loader.bindClass('a', 'http://example.org/A');
        loader.bindClass('b', 'http://example.org/B');
      });

      it('should allow property binding', function () {
        expect(loader._properties['http://example.org/p0']).toEqual('field0');
        expect(loader._properties['http://example.org/p1']).toEqual('field1');
        expect(loader._properties['http://example.org/p2']).toEqual('field2');
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
          expect(Object.keys(loader.resources).length).toEqual(9);
          expect(loader.resources).toHaveProperty('a');
          expect(loader.resources).toHaveProperty('b');
          expect(loader.resources).toHaveProperty('"a0a"');
          expect(loader.resources).toHaveProperty('"a0b"');
          expect(loader.resources).toHaveProperty('"a0c"');
          expect(loader.resources).toHaveProperty('"a1a"');
          expect(loader.resources).toHaveProperty('"b0a"');
          expect(loader.resources).toHaveProperty('"b2a"');
          expect(loader.resources).toHaveProperty('"b2b"');
        });

        it('should have 2 typed resources', function () {
          expect(Object.keys(loader.typedResources).length).toEqual(2);
          expect(loader.typedResources).toHaveProperty('a');
          expect(loader.typedResources).toHaveProperty('b');
        });

        it('resource "a" should have fields', function () {
          let field0 = (<any> loader.resources['a']).field0;
          expect(Object.keys(field0).length).toEqual(3);
          expect(field0).toContainEqual(loader.resources['"a0a"']);
          expect(field0).toContainEqual(loader.resources['"a0b"']);
          expect(field0).toContainEqual(loader.resources['"a0c"']);

          let field1 = (<any> loader.resources['a']).field1;
          expect(Object.keys(field1).length).toEqual(1);
          expect(field1).toContainEqual(loader.resources['"a1a"']);

          let field2 = (<any> loader.resources['a']).field2;
          expect(Object.keys(field2).length).toEqual(1);
          expect(field2).toContainEqual(loader.resources['b']);
        });

        it('resource "b" should have fields', function () {
          let field0 = (<any> loader.resources['b']).field0;
          expect(Object.keys(field0).length).toEqual(1);
          expect(field0).toContainEqual(loader.resources['"b0a"']);

          let field1 = (<any> loader.resources['b']).field1;
          expect(Object.keys(field1).length).toEqual(1);
          expect(field1).toContainEqual(loader.resources['a']);

          let field2 = (<any> loader.resources['b']).field2;
          expect(Object.keys(field2).length).toEqual(2);
          expect(field2).toContainEqual(loader.resources['"b2a"']);
          expect(field2).toContainEqual(loader.resources['"b2b"']);
        });

        it('should have 2 type "a" resources', function () {
          expect(loader.typedResources['a'].length).toEqual(2);
          expect(loader.typedResources['a']).toContainEqual(loader.resources['a']);
          expect(loader.typedResources['a']).toContainEqual(loader.resources['b']);
        });

        it('should have 1 type "b" resource', function () {
          expect(loader.typedResources['b'].length).toEqual(1);
          expect(loader.typedResources['b']).toContainEqual(loader.resources['b']);
        });
      });
    });
  });

  describe('for list.ttl', function () {
    var tripleStream: any;
    beforeEach(function () {
      tripleStream = rdfParser.parse(fs
        .createReadStream(__dirname + '/../assets/list.ttl'), { contentType: 'text/turtle'});
    });

    describe('with bound properties and classes', function () {
      var loader: RdfClassLoader;
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
          expect(Object.keys(loader.resources).length).toEqual(4);
          expect(loader.resources).toHaveProperty('a');
          expect(loader.resources).toHaveProperty('1');
          expect(loader.resources).toHaveProperty('2');
          expect(loader.resources).toHaveProperty('3');
        });

        it('"a" should have a list', function () {
          let list = (<any> loader.resources['a']).withList[0];
          expect(list).toHaveProperty('list');
          expect(list.list.length).toEqual(3);
          expect(list.list).toContainEqual(loader.resources['1']);
          expect(list.list).toContainEqual(loader.resources['2']);
          expect(list.list).toContainEqual(loader.resources['3']);
        });
      });
    });
  });

  describe('for list-empty.ttl', function () {
    var tripleStream: any;
    beforeEach(function () {
      tripleStream = rdfParser.parse(fs
        .createReadStream(__dirname + '/../assets/list-empty.ttl'), { contentType: 'text/turtle'});
    });

    describe('with bound properties and classes', function () {
      var loader: RdfClassLoader;
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
          expect(Object.keys(loader.resources).length).toEqual(1);
          expect(loader.resources).toHaveProperty('a');
        });

        it('"a" should have a list', function () {
          let list = (<any> loader.resources['a']).withList[0];
          expect(list).toHaveProperty('list');
          expect(list.list.length).toEqual(0);
        });
      });
    });
  });

  describe('for triples-unique.ttl', function () {
    var tripleStream: any;
    beforeEach(function () {
      tripleStream = rdfParser.parse(fs
        .createReadStream(__dirname + '/../assets/triples-unique.ttl'), { contentType: 'text/turtle'});
    });

    describe('with bound unique properties', function () {
      var loader: RdfClassLoader;
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
        expect(loader._uniqueProperties).toHaveProperty('field0', true);
        expect(loader._uniqueProperties).toHaveProperty('field1', true);
        expect(loader._uniqueProperties).toHaveProperty('field2', true);
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
          expect((<any> loader.resources['a']).field0).toEqual(loader.resources['"a0a"']);
          expect((<any> loader.resources['a']).field1).toEqual(loader.resources['"a1a"']);
          expect((<any> loader.resources['a']).field2).toEqual(loader.resources['b']);
        });
      });
    });
  });

  describe('for triples-nonunique.ttl', function () {
    var tripleStream: any;
    beforeEach(function () {
      tripleStream = rdfParser.parse(fs
        .createReadStream(__dirname + '/../assets/triples-nonunique.ttl'), { contentType: 'text/turtle'});
    });

    describe('with bound unique properties', function () {
      var loader: RdfClassLoader;
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
