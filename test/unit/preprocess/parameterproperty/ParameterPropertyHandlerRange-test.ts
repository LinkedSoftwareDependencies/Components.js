import * as fs from 'fs';
import { DataFactory } from 'rdf-data-factory';
import { RdfObjectLoader } from 'rdf-object/lib/RdfObjectLoader';
import 'jest-rdf';
import {
  ParameterPropertyHandlerRange,
} from '../../../../lib/preprocess/parameterproperty/ParameterPropertyHandlerRange';
import { PREFIXES } from '../../../../lib/Util';

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
      expect((<any> handler.captureType(objectLoader.createCompactedResource('ex:abc'), objectLoader.createCompactedResource({ range: `ex:bla` }))).term)
        .toEqualRdfTerm(DF.namedNode('ex:abc'));
      expect((<any> handler.captureType(objectLoader.createCompactedResource('_:abc'), objectLoader.createCompactedResource({ range: `ex:bla` }))).term)
        .toEqualRdfTerm(DF.blankNode('abc'));
    });

    it('should capture strings', () => {
      expect((<any> handler.captureType(objectLoader.createCompactedResource('"aaa"'), objectLoader.createCompactedResource({ range: `${PREFIXES.xsd}string` }))).term.valueRaw)
        .toBeUndefined();
      expect((<any> handler.captureType(objectLoader.createCompactedResource('"qqseqfqefefù$^"'), objectLoader.createCompactedResource({ range: `${PREFIXES.xsd}string` }))).term.valueRaw)
        .toBeUndefined();
    });

    it('should capture booleans', () => {
      expect((<any> handler.captureType(objectLoader.createCompactedResource('"true"'), objectLoader.createCompactedResource({ range: `${PREFIXES.xsd}boolean` }))).term.valueRaw)
        .toEqual(true);
      expect((<any> handler.captureType(objectLoader.createCompactedResource('"false"'), objectLoader.createCompactedResource({ range: `${PREFIXES.xsd}boolean` }))).term.valueRaw)
        .toEqual(false);
    });
    it('should error on invalid booleans', () => {
      expect(() => handler.captureType(objectLoader.createCompactedResource('"1"'), objectLoader.createCompactedResource({ range: `${PREFIXES.xsd}boolean`, '@id': 'param' })))
        .toThrow(new Error('1 is not of type http://www.w3.org/2001/XMLSchema#boolean for parameter param'));
    });

    it('should capture integers', () => {
      expect((<any> handler.captureType(objectLoader.createCompactedResource('"1"'), objectLoader.createCompactedResource({ range: `${PREFIXES.xsd}integer` }))).term.valueRaw)
        .toEqual(1);
      expect((<any> handler.captureType(objectLoader.createCompactedResource('"1456789876"'), objectLoader.createCompactedResource({ range: `${PREFIXES.xsd}integer` }))).term.valueRaw)
        .toEqual(1_456_789_876);
    });
    it('should error on invalid integers', () => {
      expect(() => handler.captureType(objectLoader.createCompactedResource('"a"'), objectLoader.createCompactedResource({ range: `${PREFIXES.xsd}integer`, '@id': 'param' })))
        .toThrow(new Error('a is not of type http://www.w3.org/2001/XMLSchema#integer for parameter param'));
    });
    it('should error on invalid integers that are numbers', () => {
      expect(() => handler.captureType(objectLoader.createCompactedResource('"1.12"'), objectLoader.createCompactedResource({ range: `${PREFIXES.xsd}integer`, '@id': 'param' })))
        .toThrow(new Error('1.12 is not of type http://www.w3.org/2001/XMLSchema#integer for parameter param'));
    });
    it('should capture numbers', () => {
      expect((<any> handler.captureType(objectLoader.createCompactedResource('"1"'), objectLoader.createCompactedResource({ range: `${PREFIXES.xsd}number` }))).term.valueRaw)
        .toEqual(1);
      expect((<any> handler.captureType(objectLoader.createCompactedResource('"456789876"'), objectLoader.createCompactedResource({ range: `${PREFIXES.xsd}number` }))).term.valueRaw)
        .toEqual(456_789_876);
    });
    it('should capture ints', () => {
      expect((<any> handler.captureType(objectLoader.createCompactedResource('"1"'), objectLoader.createCompactedResource({ range: `${PREFIXES.xsd}int` }))).term.valueRaw)
        .toEqual(1);
      expect((<any> handler.captureType(objectLoader.createCompactedResource('"456789876"'), objectLoader.createCompactedResource({ range: `${PREFIXES.xsd}int` }))).term.valueRaw)
        .toEqual(456_789_876);
    });
    it('should capture bytes', () => {
      expect((<any> handler.captureType(objectLoader.createCompactedResource('"1"'), objectLoader.createCompactedResource({ range: `${PREFIXES.xsd}byte` }))).term.valueRaw)
        .toEqual(1);
      expect((<any> handler.captureType(objectLoader.createCompactedResource('"456789876"'), objectLoader.createCompactedResource({ range: `${PREFIXES.xsd}byte` }))).term.valueRaw)
        .toEqual(456_789_876);
    });
    it('should capture longs', () => {
      expect((<any> handler.captureType(objectLoader.createCompactedResource('"1"'), objectLoader.createCompactedResource({ range: `${PREFIXES.xsd}long` }))).term.valueRaw)
        .toEqual(1);
      expect((<any> handler.captureType(objectLoader.createCompactedResource('"456789876"'), objectLoader.createCompactedResource({ range: `${PREFIXES.xsd}long` }))).term.valueRaw)
        .toEqual(456_789_876);
    });

    it('should capture floats', () => {
      expect((<any> handler.captureType(objectLoader.createCompactedResource('"1"'), objectLoader.createCompactedResource({ range: `${PREFIXES.xsd}float` }))).term.valueRaw)
        .toEqual(1);
      expect((<any> handler.captureType(objectLoader.createCompactedResource('"256.36"'), objectLoader.createCompactedResource({ range: `${PREFIXES.xsd}float` }))).term.valueRaw)
        .toEqual(256.36);
    });
    it('should error on invalid floats', () => {
      expect(() => handler.captureType(objectLoader.createCompactedResource('"a"'), objectLoader.createCompactedResource({ range: `${PREFIXES.xsd}float`, '@id': 'param' })))
        .toThrow(new Error('a is not of type http://www.w3.org/2001/XMLSchema#float for parameter param'));
    });
    it('should capture decimals', () => {
      expect((<any> handler.captureType(objectLoader.createCompactedResource('"1"'), objectLoader.createCompactedResource({ range: `${PREFIXES.xsd}decimal` }))).term.valueRaw)
        .toEqual(1);
      expect((<any> handler.captureType(objectLoader.createCompactedResource('"256.36"'), objectLoader.createCompactedResource({ range: `${PREFIXES.xsd}decimal` }))).term.valueRaw)
        .toEqual(256.36);
    });
    it('should capture doubles', () => {
      expect((<any> handler.captureType(objectLoader.createCompactedResource('"1"'), objectLoader.createCompactedResource({ range: `${PREFIXES.xsd}double` }))).term.valueRaw)
        .toEqual(1);
      expect((<any> handler.captureType(objectLoader.createCompactedResource('"256.36"'), objectLoader.createCompactedResource({ range: `${PREFIXES.xsd}double` }))).term.valueRaw)
        .toEqual(256.36);
    });
  });
});
