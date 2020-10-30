import Util = require('../lib/Util');
import { Loader } from '../lib/Loader';
import { RdfObjectLoader } from 'rdf-object/lib/RdfObjectLoader';

describe('Util', function () {

  let objectLoader: RdfObjectLoader;
  beforeEach(() => {
    objectLoader = new Loader().objectLoader;
  });

  describe('#captureType', function () {

    it('should capture strings', function () {
      expect((<any> Util.captureType(objectLoader.createCompactedResource('"aaa"'), objectLoader.createCompactedResource({ range: Util.PREFIXES['xsd'] + 'string' }))).term.valueRaw)
        .toBeUndefined();
      expect((<any> Util.captureType(objectLoader.createCompactedResource('"qqseqfqefefù$^"'), objectLoader.createCompactedResource({ range: Util.PREFIXES['xsd'] + 'string' }))).term.valueRaw)
        .toBeUndefined();
    });

    it('should capture booleans', function () {
      expect((<any> Util.captureType(objectLoader.createCompactedResource('"true"'), objectLoader.createCompactedResource({ range: Util.PREFIXES['xsd'] + 'boolean' }))).term.valueRaw)
        .toEqual(true);
      expect((<any> Util.captureType(objectLoader.createCompactedResource('"false"'), objectLoader.createCompactedResource({ range: Util.PREFIXES['xsd'] + 'boolean' }))).term.valueRaw)
        .toEqual(false);
    });
    it('should error on invalid booleans', function () {
      expect(() => Util.captureType(objectLoader.createCompactedResource('"1"'), objectLoader.createCompactedResource({ range: Util.PREFIXES['xsd'] + 'boolean', '@id': 'param' })))
        .toThrow(new Error('1 is not of type http://www.w3.org/2001/XMLSchema#boolean for parameter param'));
    });

    it('should capture integers', function () {
      expect((<any> Util.captureType(objectLoader.createCompactedResource('"1"'), objectLoader.createCompactedResource({ range: Util.PREFIXES['xsd'] + 'integer' }))).term.valueRaw)
        .toEqual(1);
      expect((<any> Util.captureType(objectLoader.createCompactedResource('"1456789876"'), objectLoader.createCompactedResource({ range: Util.PREFIXES['xsd'] + 'integer' }))).term.valueRaw)
        .toEqual(1456789876);
    });
    it('should error on invalid integers', function () {
      expect(() => Util.captureType(objectLoader.createCompactedResource('"a"'), objectLoader.createCompactedResource({ range: Util.PREFIXES['xsd'] + 'integer', '@id': 'param' })))
        .toThrow(new Error('a is not of type http://www.w3.org/2001/XMLSchema#integer for parameter param'));
    });
    it('should error on invalid integers that are numbers', function () {
      expect(() => Util.captureType(objectLoader.createCompactedResource('"1.12"'), objectLoader.createCompactedResource({ range: Util.PREFIXES['xsd'] + 'integer', '@id': 'param' })))
        .toThrow(new Error('1.12 is not of type http://www.w3.org/2001/XMLSchema#integer for parameter param'));
    });
    it('should capture numbers', function () {
      expect((<any> Util.captureType(objectLoader.createCompactedResource('"1"'), objectLoader.createCompactedResource({ range: Util.PREFIXES['xsd'] + 'number' }))).term.valueRaw)
        .toEqual(1);
      expect((<any> Util.captureType(objectLoader.createCompactedResource('"456789876"'), objectLoader.createCompactedResource({ range: Util.PREFIXES['xsd'] + 'number' }))).term.valueRaw)
        .toEqual(456789876);
    });
    it('should capture ints', function () {
      expect((<any> Util.captureType(objectLoader.createCompactedResource('"1"'), objectLoader.createCompactedResource({ range: Util.PREFIXES['xsd'] + 'int' }))).term.valueRaw)
        .toEqual(1);
      expect((<any> Util.captureType(objectLoader.createCompactedResource('"456789876"'), objectLoader.createCompactedResource({ range: Util.PREFIXES['xsd'] + 'int' }))).term.valueRaw)
        .toEqual(456789876);
    });
    it('should capture bytes', function () {
      expect((<any> Util.captureType(objectLoader.createCompactedResource('"1"'), objectLoader.createCompactedResource({ range: Util.PREFIXES['xsd'] + 'byte' }))).term.valueRaw)
        .toEqual(1);
      expect((<any> Util.captureType(objectLoader.createCompactedResource('"456789876"'), objectLoader.createCompactedResource({ range: Util.PREFIXES['xsd'] + 'byte' }))).term.valueRaw)
        .toEqual(456789876);
    });
    it('should capture longs', function () {
      expect((<any> Util.captureType(objectLoader.createCompactedResource('"1"'), objectLoader.createCompactedResource({ range: Util.PREFIXES['xsd'] + 'long' }))).term.valueRaw)
        .toEqual(1);
      expect((<any> Util.captureType(objectLoader.createCompactedResource('"456789876"'), objectLoader.createCompactedResource({ range: Util.PREFIXES['xsd'] + 'long' }))).term.valueRaw)
        .toEqual(456789876);
    });

    it('should capture floats', function () {
      expect((<any> Util.captureType(objectLoader.createCompactedResource('"1"'), objectLoader.createCompactedResource({ range: Util.PREFIXES['xsd'] + 'float' }))).term.valueRaw)
        .toEqual(1);
      expect((<any> Util.captureType(objectLoader.createCompactedResource('"256.36"'), objectLoader.createCompactedResource({ range: Util.PREFIXES['xsd'] + 'float' }))).term.valueRaw)
        .toEqual(256.36);
    });
    it('should error on invalid floats', function () {
      expect(() => Util.captureType(objectLoader.createCompactedResource('"a"'), objectLoader.createCompactedResource({ range: Util.PREFIXES['xsd'] + 'float', '@id': 'param' })))
        .toThrow(new Error('a is not of type http://www.w3.org/2001/XMLSchema#float for parameter param'));
    });
    it('should capture decimals', function () {
      expect((<any> Util.captureType(objectLoader.createCompactedResource('"1"'), objectLoader.createCompactedResource({ range: Util.PREFIXES['xsd'] + 'decimal' }))).term.valueRaw)
        .toEqual(1);
      expect((<any> Util.captureType(objectLoader.createCompactedResource('"256.36"'), objectLoader.createCompactedResource({ range: Util.PREFIXES['xsd'] + 'decimal' }))).term.valueRaw)
        .toEqual(256.36);
    });
    it('should capture doubles', function () {
      expect((<any> Util.captureType(objectLoader.createCompactedResource('"1"'), objectLoader.createCompactedResource({ range: Util.PREFIXES['xsd'] + 'double' }))).term.valueRaw)
        .toEqual(1);
      expect((<any> Util.captureType(objectLoader.createCompactedResource('"256.36"'), objectLoader.createCompactedResource({ range: Util.PREFIXES['xsd'] + 'double' }))).term.valueRaw)
        .toEqual(256.36);
    });

  });
});
