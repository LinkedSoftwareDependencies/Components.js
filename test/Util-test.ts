import type { RdfObjectLoader } from 'rdf-object/lib/RdfObjectLoader';
import { Loader } from '../lib/Loader';
import * as Util from '../lib/Util';

describe('Util', () => {
  let objectLoader: RdfObjectLoader;
  beforeEach(() => {
    objectLoader = (<any> new Loader()).objectLoader;
  });

  describe('captureType', () => {
    it('should capture strings', () => {
      expect((<any> Util.captureType(objectLoader.createCompactedResource('"aaa"'), objectLoader.createCompactedResource({ range: `${Util.PREFIXES.xsd}string` }), objectLoader)).term.valueRaw)
        .toBeUndefined();
      expect((<any> Util.captureType(objectLoader.createCompactedResource('"qqseqfqefefù$^"'), objectLoader.createCompactedResource({ range: `${Util.PREFIXES.xsd}string` }), objectLoader)).term.valueRaw)
        .toBeUndefined();
    });

    it('should capture booleans', () => {
      expect((<any> Util.captureType(objectLoader.createCompactedResource('"true"'), objectLoader.createCompactedResource({ range: `${Util.PREFIXES.xsd}boolean` }), objectLoader)).term.valueRaw)
        .toEqual(true);
      expect((<any> Util.captureType(objectLoader.createCompactedResource('"false"'), objectLoader.createCompactedResource({ range: `${Util.PREFIXES.xsd}boolean` }), objectLoader)).term.valueRaw)
        .toEqual(false);
    });
    it('should error on invalid booleans', () => {
      expect(() => Util.captureType(objectLoader.createCompactedResource('"1"'), objectLoader.createCompactedResource({ range: `${Util.PREFIXES.xsd}boolean`, '@id': 'param' }), objectLoader))
        .toThrow(new Error('1 is not of type http://www.w3.org/2001/XMLSchema#boolean for parameter param'));
    });

    it('should capture integers', () => {
      expect((<any> Util.captureType(objectLoader.createCompactedResource('"1"'), objectLoader.createCompactedResource({ range: `${Util.PREFIXES.xsd}integer` }), objectLoader)).term.valueRaw)
        .toEqual(1);
      expect((<any> Util.captureType(objectLoader.createCompactedResource('"1456789876"'), objectLoader.createCompactedResource({ range: `${Util.PREFIXES.xsd}integer` }), objectLoader)).term.valueRaw)
        .toEqual(1_456_789_876);
    });
    it('should error on invalid integers', () => {
      expect(() => Util.captureType(objectLoader.createCompactedResource('"a"'), objectLoader.createCompactedResource({ range: `${Util.PREFIXES.xsd}integer`, '@id': 'param' }), objectLoader))
        .toThrow(new Error('a is not of type http://www.w3.org/2001/XMLSchema#integer for parameter param'));
    });
    it('should error on invalid integers that are numbers', () => {
      expect(() => Util.captureType(objectLoader.createCompactedResource('"1.12"'), objectLoader.createCompactedResource({ range: `${Util.PREFIXES.xsd}integer`, '@id': 'param' }), objectLoader))
        .toThrow(new Error('1.12 is not of type http://www.w3.org/2001/XMLSchema#integer for parameter param'));
    });
    it('should capture numbers', () => {
      expect((<any> Util.captureType(objectLoader.createCompactedResource('"1"'), objectLoader.createCompactedResource({ range: `${Util.PREFIXES.xsd}number` }), objectLoader)).term.valueRaw)
        .toEqual(1);
      expect((<any> Util.captureType(objectLoader.createCompactedResource('"456789876"'), objectLoader.createCompactedResource({ range: `${Util.PREFIXES.xsd}number` }), objectLoader)).term.valueRaw)
        .toEqual(456_789_876);
    });
    it('should capture ints', () => {
      expect((<any> Util.captureType(objectLoader.createCompactedResource('"1"'), objectLoader.createCompactedResource({ range: `${Util.PREFIXES.xsd}int` }), objectLoader)).term.valueRaw)
        .toEqual(1);
      expect((<any> Util.captureType(objectLoader.createCompactedResource('"456789876"'), objectLoader.createCompactedResource({ range: `${Util.PREFIXES.xsd}int` }), objectLoader)).term.valueRaw)
        .toEqual(456_789_876);
    });
    it('should capture bytes', () => {
      expect((<any> Util.captureType(objectLoader.createCompactedResource('"1"'), objectLoader.createCompactedResource({ range: `${Util.PREFIXES.xsd}byte` }), objectLoader)).term.valueRaw)
        .toEqual(1);
      expect((<any> Util.captureType(objectLoader.createCompactedResource('"456789876"'), objectLoader.createCompactedResource({ range: `${Util.PREFIXES.xsd}byte` }), objectLoader)).term.valueRaw)
        .toEqual(456_789_876);
    });
    it('should capture longs', () => {
      expect((<any> Util.captureType(objectLoader.createCompactedResource('"1"'), objectLoader.createCompactedResource({ range: `${Util.PREFIXES.xsd}long` }), objectLoader)).term.valueRaw)
        .toEqual(1);
      expect((<any> Util.captureType(objectLoader.createCompactedResource('"456789876"'), objectLoader.createCompactedResource({ range: `${Util.PREFIXES.xsd}long` }), objectLoader)).term.valueRaw)
        .toEqual(456_789_876);
    });

    it('should capture floats', () => {
      expect((<any> Util.captureType(objectLoader.createCompactedResource('"1"'), objectLoader.createCompactedResource({ range: `${Util.PREFIXES.xsd}float` }), objectLoader)).term.valueRaw)
        .toEqual(1);
      expect((<any> Util.captureType(objectLoader.createCompactedResource('"256.36"'), objectLoader.createCompactedResource({ range: `${Util.PREFIXES.xsd}float` }), objectLoader)).term.valueRaw)
        .toEqual(256.36);
    });
    it('should error on invalid floats', () => {
      expect(() => Util.captureType(objectLoader.createCompactedResource('"a"'), objectLoader.createCompactedResource({ range: `${Util.PREFIXES.xsd}float`, '@id': 'param' }), objectLoader))
        .toThrow(new Error('a is not of type http://www.w3.org/2001/XMLSchema#float for parameter param'));
    });
    it('should capture decimals', () => {
      expect((<any> Util.captureType(objectLoader.createCompactedResource('"1"'), objectLoader.createCompactedResource({ range: `${Util.PREFIXES.xsd}decimal` }), objectLoader)).term.valueRaw)
        .toEqual(1);
      expect((<any> Util.captureType(objectLoader.createCompactedResource('"256.36"'), objectLoader.createCompactedResource({ range: `${Util.PREFIXES.xsd}decimal` }), objectLoader)).term.valueRaw)
        .toEqual(256.36);
    });
    it('should capture doubles', () => {
      expect((<any> Util.captureType(objectLoader.createCompactedResource('"1"'), objectLoader.createCompactedResource({ range: `${Util.PREFIXES.xsd}double` }), objectLoader)).term.valueRaw)
        .toEqual(1);
      expect((<any> Util.captureType(objectLoader.createCompactedResource('"256.36"'), objectLoader.createCompactedResource({ range: `${Util.PREFIXES.xsd}double` }), objectLoader)).term.valueRaw)
        .toEqual(256.36);
    });
  });
});
