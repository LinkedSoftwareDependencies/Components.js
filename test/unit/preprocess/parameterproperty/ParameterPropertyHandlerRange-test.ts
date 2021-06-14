import * as fs from 'fs';
import { DataFactory } from 'rdf-data-factory';
import { RdfObjectLoader } from 'rdf-object/lib/RdfObjectLoader';
import 'jest-rdf';
import {
  ParameterPropertyHandlerRange,
} from '../../../../lib/preprocess/parameterproperty/ParameterPropertyHandlerRange';
import { IRIS_RDF, IRIS_XSD } from '../../../../lib/rdf/Iris';

const DF = new DataFactory();

describe('ParameterPropertyHandlerRange', () => {
  let objectLoader: RdfObjectLoader;
  let handler: ParameterPropertyHandlerRange;
  beforeEach(async() => {
    objectLoader = new RdfObjectLoader({
      context: JSON.parse(fs.readFileSync(`${__dirname}/../../../../components/context.jsonld`, 'utf8')),
    });
    await objectLoader.context;
    handler = new ParameterPropertyHandlerRange(objectLoader);
  });

  describe('captureType', () => {
    it('should ignore non-literals', () => {
      expect((<any> handler.captureType(objectLoader.createCompactedResource('ex:abc'),
        objectLoader.createCompactedResource({ range: `ex:bla` }))).term)
        .toEqualRdfTerm(DF.namedNode('ex:abc'));
      expect((<any> handler.captureType(objectLoader.createCompactedResource('_:abc'),
        objectLoader.createCompactedResource({ range: `ex:bla` }))).term)
        .toEqualRdfTerm(DF.blankNode('abc'));
    });

    it('should capture strings', () => {
      expect((<any> handler.captureType(objectLoader.createCompactedResource('"aaa"'),
        objectLoader.createCompactedResource({ range: IRIS_XSD.string }))).term.valueRaw)
        .toBeUndefined();
      expect((<any> handler.captureType(objectLoader.createCompactedResource('"qqseqfqefefù$^"'),
        objectLoader.createCompactedResource({ range: IRIS_XSD.string }))).term.valueRaw)
        .toBeUndefined();
    });

    it('should capture booleans', () => {
      expect((<any> handler.captureType(objectLoader.createCompactedResource('"true"'),
        objectLoader.createCompactedResource({ range: IRIS_XSD.boolean }))).term.valueRaw)
        .toEqual(true);
      expect((<any> handler.captureType(objectLoader.createCompactedResource('"false"'),
        objectLoader.createCompactedResource({ range: IRIS_XSD.boolean }))).term.valueRaw)
        .toEqual(false);
    });
    it('should error on invalid booleans', () => {
      expect(() => handler.captureType(objectLoader.createCompactedResource('"1"'),
        objectLoader.createCompactedResource({ range: IRIS_XSD.boolean, '@id': 'param' })))
        // eslint-disable-next-line max-len
        .toThrowError(/^Parameter value "1" is not of required range type "http:\/\/www.w3.org\/2001\/XMLSchema#boolean"/u);
    });

    it('should capture integers', () => {
      expect((<any> handler.captureType(objectLoader.createCompactedResource('"1"'),
        objectLoader.createCompactedResource({ range: IRIS_XSD.integer }))).term.valueRaw)
        .toEqual(1);
      expect((<any> handler.captureType(objectLoader.createCompactedResource('"1456789876"'),
        objectLoader.createCompactedResource({ range: IRIS_XSD.integer }))).term.valueRaw)
        .toEqual(1_456_789_876);
    });
    it('should error on invalid integers', () => {
      expect(() => handler.captureType(objectLoader.createCompactedResource('"a"'),
        objectLoader.createCompactedResource({ range: IRIS_XSD.integer, '@id': 'param' })))
        // eslint-disable-next-line max-len
        .toThrowError(/^Parameter value "a" is not of required range type "http:\/\/www.w3.org\/2001\/XMLSchema#integer"/u);
    });
    it('should error on invalid integers that are numbers', () => {
      expect(() => handler.captureType(objectLoader.createCompactedResource('"1.12"'),
        objectLoader.createCompactedResource({ range: IRIS_XSD.integer, '@id': 'param' })))
        // eslint-disable-next-line max-len
        .toThrowError(/^Parameter value "1.12" is not of required range type "http:\/\/www.w3.org\/2001\/XMLSchema#integer"/u);
    });
    it('should capture numbers', () => {
      expect((<any> handler.captureType(objectLoader.createCompactedResource('"1"'),
        objectLoader.createCompactedResource({ range: IRIS_XSD.number }))).term.valueRaw)
        .toEqual(1);
      expect((<any> handler.captureType(objectLoader.createCompactedResource('"456789876"'),
        objectLoader.createCompactedResource({ range: IRIS_XSD.number }))).term.valueRaw)
        .toEqual(456_789_876);
    });
    it('should capture ints', () => {
      expect((<any> handler.captureType(objectLoader.createCompactedResource('"1"'),
        objectLoader.createCompactedResource({ range: IRIS_XSD.int }))).term.valueRaw)
        .toEqual(1);
      expect((<any> handler.captureType(objectLoader.createCompactedResource('"456789876"'),
        objectLoader.createCompactedResource({ range: IRIS_XSD.int }))).term.valueRaw)
        .toEqual(456_789_876);
    });
    it('should capture bytes', () => {
      expect((<any> handler.captureType(objectLoader.createCompactedResource('"1"'),
        objectLoader.createCompactedResource({ range: IRIS_XSD.byte }))).term.valueRaw)
        .toEqual(1);
      expect((<any> handler.captureType(objectLoader.createCompactedResource('"456789876"'),
        objectLoader.createCompactedResource({ range: IRIS_XSD.byte }))).term.valueRaw)
        .toEqual(456_789_876);
    });
    it('should capture longs', () => {
      expect((<any> handler.captureType(objectLoader.createCompactedResource('"1"'),
        objectLoader.createCompactedResource({ range: IRIS_XSD.long }))).term.valueRaw)
        .toEqual(1);
      expect((<any> handler.captureType(objectLoader.createCompactedResource('"456789876"'),
        objectLoader.createCompactedResource({ range: IRIS_XSD.long }))).term.valueRaw)
        .toEqual(456_789_876);
    });

    it('should capture floats', () => {
      expect((<any> handler.captureType(objectLoader.createCompactedResource('"1"'),
        objectLoader.createCompactedResource({ range: IRIS_XSD.float }))).term.valueRaw)
        .toEqual(1);
      expect((<any> handler.captureType(objectLoader.createCompactedResource('"256.36"'),
        objectLoader.createCompactedResource({ range: IRIS_XSD.float }))).term.valueRaw)
        .toEqual(256.36);
    });
    it('should error on invalid floats', () => {
      expect(() => handler.captureType(objectLoader.createCompactedResource('"a"'),
        objectLoader.createCompactedResource({ range: IRIS_XSD.float, '@id': 'param' })))
        // eslint-disable-next-line max-len
        .toThrowError(/^Parameter value "a" is not of required range type "http:\/\/www.w3.org\/2001\/XMLSchema#float"/u);
    });
    it('should capture decimals', () => {
      expect((<any> handler.captureType(objectLoader.createCompactedResource('"1"'),
        objectLoader.createCompactedResource({ range: IRIS_XSD.decimal }))).term.valueRaw)
        .toEqual(1);
      expect((<any> handler.captureType(objectLoader.createCompactedResource('"256.36"'),
        objectLoader.createCompactedResource({ range: IRIS_XSD.decimal }))).term.valueRaw)
        .toEqual(256.36);
    });
    it('should capture doubles', () => {
      expect((<any> handler.captureType(objectLoader.createCompactedResource('"1"'),
        objectLoader.createCompactedResource({ range: IRIS_XSD.double }))).term.valueRaw)
        .toEqual(1);
      expect((<any> handler.captureType(objectLoader.createCompactedResource('"256.36"'),
        objectLoader.createCompactedResource({ range: IRIS_XSD.double }))).term.valueRaw)
        .toEqual(256.36);
    });

    it('should capture JSON', () => {
      expect((<any> handler.captureType(objectLoader.createCompactedResource('"1"'),
        objectLoader.createCompactedResource({ range: IRIS_RDF.JSON }))).term.valueRaw)
        .toEqual(1);
      expect((<any> handler.captureType(objectLoader.createCompactedResource('"{"a":"b"}"'),
        objectLoader.createCompactedResource({ range: IRIS_RDF.JSON }))).term.valueRaw)
        .toEqual({ a: 'b' });
    });
    it('should error on invalid JSON', () => {
      expect(() => handler.captureType(objectLoader.createCompactedResource('"{a:\\"b\\"}"'),
        objectLoader.createCompactedResource({ range: IRIS_RDF.JSON, '@id': 'param' })))
        .toThrowError(/^Parameter value .* is not of required range type/u);
    });
  });
});
