import * as fs from 'fs';
import { DataFactory } from 'rdf-data-factory';
import { RdfObjectLoader } from 'rdf-object/lib/RdfObjectLoader';
import 'jest-rdf';
import type { Resource } from 'rdf-object/lib/Resource';
import { GenericsContext } from '../../../../lib/preprocess/GenericsContext';
import {
  ParameterPropertyHandlerRange,
} from '../../../../lib/preprocess/parameterproperty/ParameterPropertyHandlerRange';
import { IRIS_RDF, IRIS_XSD } from '../../../../lib/rdf/Iris';

const DF = new DataFactory();

function expectOutputProperties(output: Resource | undefined, expected: Resource | undefined) {
  if (output === undefined) {
    expect(expected).toBeUndefined();
  } else {
    expect(output.toQuads()).toBeRdfIsomorphic(expected!.toQuads());
  }
}

describe('ParameterPropertyHandlerRange', () => {
  let objectLoader: RdfObjectLoader;
  let genericsContext: GenericsContext;
  let handler: ParameterPropertyHandlerRange;
  beforeEach(async() => {
    objectLoader = new RdfObjectLoader({
      context: JSON.parse(fs.readFileSync(`${__dirname}/../../../../components/context.jsonld`, 'utf8')),
    });
    await objectLoader.context;
    genericsContext = new GenericsContext(objectLoader, []);
    handler = new ParameterPropertyHandlerRange(objectLoader);
  });

  describe('captureType', () => {
    describe('for literals', () => {
      it('should capture strings', () => {
        expect((<any>handler.captureType(objectLoader.createCompactedResource('"aaa"'),
          objectLoader.createCompactedResource({ range: IRIS_XSD.string }),
          genericsContext)).term.valueRaw)
          .toBeUndefined();
        expect((<any>handler.captureType(objectLoader.createCompactedResource('"qqseqfqefefù$^"'),
          objectLoader.createCompactedResource({ range: IRIS_XSD.string }),
          genericsContext)).term.valueRaw)
          .toBeUndefined();
      });

      it('should capture booleans', () => {
        expect((<any>handler.captureType(objectLoader.createCompactedResource('"true"'),
          objectLoader.createCompactedResource({ range: IRIS_XSD.boolean }),
          genericsContext)).term.valueRaw)
          .toEqual(true);
        expect((<any>handler.captureType(objectLoader.createCompactedResource('"false"'),
          objectLoader.createCompactedResource({ range: IRIS_XSD.boolean }),
          genericsContext)).term.valueRaw)
          .toEqual(false);
      });
      it('should error on invalid booleans', () => {
        expect(() => handler.captureType(objectLoader.createCompactedResource('"1"'),
          objectLoader.createCompactedResource({ range: IRIS_XSD.boolean, '@id': 'param' }),
          genericsContext))
          // eslint-disable-next-line max-len
          .toThrowError(/^The value "1" for parameter "param" is not of required range type "http:\/\/www.w3.org\/2001\/XMLSchema#boolean"/u);
      });

      it('should capture integers', () => {
        expect((<any>handler.captureType(objectLoader.createCompactedResource('"1"'),
          objectLoader.createCompactedResource({ range: IRIS_XSD.integer }),
          genericsContext)).term.valueRaw)
          .toEqual(1);
        expect((<any>handler.captureType(objectLoader.createCompactedResource('"1456789876"'),
          objectLoader.createCompactedResource({ range: IRIS_XSD.integer }),
          genericsContext)).term.valueRaw)
          .toEqual(1_456_789_876);
      });
      it('should error on invalid integers', () => {
        expect(() => handler.captureType(objectLoader.createCompactedResource('"a"'),
          objectLoader.createCompactedResource({ range: IRIS_XSD.integer, '@id': 'param' }),
          genericsContext))
          // eslint-disable-next-line max-len
          .toThrowError(/^The value "a" for parameter "param" is not of required range type "http:\/\/www.w3.org\/2001\/XMLSchema#integer"/u);
      });
      it('should error on invalid integers that are numbers', () => {
        expect(() => handler.captureType(objectLoader.createCompactedResource('"1.12"'),
          objectLoader.createCompactedResource({ range: IRIS_XSD.integer, '@id': 'param' }),
          genericsContext))
          // eslint-disable-next-line max-len
          .toThrowError(/^The value "1.12" for parameter "param" is not of required range type "http:\/\/www.w3.org\/2001\/XMLSchema#integer"/u);
      });
      it('should capture numbers', () => {
        expect((<any>handler.captureType(objectLoader.createCompactedResource('"1"'),
          objectLoader.createCompactedResource({ range: IRIS_XSD.number }),
          genericsContext)).term.valueRaw)
          .toEqual(1);
        expect((<any>handler.captureType(objectLoader.createCompactedResource('"456789876"'),
          objectLoader.createCompactedResource({ range: IRIS_XSD.number }),
          genericsContext)).term.valueRaw)
          .toEqual(456_789_876);
      });
      it('should capture ints', () => {
        expect((<any>handler.captureType(objectLoader.createCompactedResource('"1"'),
          objectLoader.createCompactedResource({ range: IRIS_XSD.int }),
          genericsContext)).term.valueRaw)
          .toEqual(1);
        expect((<any>handler.captureType(objectLoader.createCompactedResource('"456789876"'),
          objectLoader.createCompactedResource({ range: IRIS_XSD.int }),
          genericsContext)).term.valueRaw)
          .toEqual(456_789_876);
      });
      it('should capture bytes', () => {
        expect((<any>handler.captureType(objectLoader.createCompactedResource('"1"'),
          objectLoader.createCompactedResource({ range: IRIS_XSD.byte }),
          genericsContext)).term.valueRaw)
          .toEqual(1);
        expect((<any>handler.captureType(objectLoader.createCompactedResource('"456789876"'),
          objectLoader.createCompactedResource({ range: IRIS_XSD.byte }),
          genericsContext)).term.valueRaw)
          .toEqual(456_789_876);
      });
      it('should capture longs', () => {
        expect((<any>handler.captureType(objectLoader.createCompactedResource('"1"'),
          objectLoader.createCompactedResource({ range: IRIS_XSD.long }),
          genericsContext)).term.valueRaw)
          .toEqual(1);
        expect((<any>handler.captureType(objectLoader.createCompactedResource('"456789876"'),
          objectLoader.createCompactedResource({ range: IRIS_XSD.long }),
          genericsContext)).term.valueRaw)
          .toEqual(456_789_876);
      });

      it('should capture floats', () => {
        expect((<any>handler.captureType(objectLoader.createCompactedResource('"1"'),
          objectLoader.createCompactedResource({ range: IRIS_XSD.float }),
          genericsContext)).term.valueRaw)
          .toEqual(1);
        expect((<any>handler.captureType(objectLoader.createCompactedResource('"256.36"'),
          objectLoader.createCompactedResource({ range: IRIS_XSD.float }),
          genericsContext)).term.valueRaw)
          .toEqual(256.36);
      });
      it('should error on invalid floats', () => {
        expect(() => handler.captureType(objectLoader.createCompactedResource('"a"'),
          objectLoader.createCompactedResource({ range: IRIS_XSD.float, '@id': 'param' }),
          genericsContext))
          // eslint-disable-next-line max-len
          .toThrowError(/^The value "a" for parameter "param" is not of required range type "http:\/\/www.w3.org\/2001\/XMLSchema#float"/u);
      });
      it('should capture decimals', () => {
        expect((<any>handler.captureType(objectLoader.createCompactedResource('"1"'),
          objectLoader.createCompactedResource({ range: IRIS_XSD.decimal }),
          genericsContext)).term.valueRaw)
          .toEqual(1);
        expect((<any>handler.captureType(objectLoader.createCompactedResource('"256.36"'),
          objectLoader.createCompactedResource({ range: IRIS_XSD.decimal }),
          genericsContext)).term.valueRaw)
          .toEqual(256.36);
      });
      it('should capture doubles', () => {
        expect((<any>handler.captureType(objectLoader.createCompactedResource('"1"'),
          objectLoader.createCompactedResource({ range: IRIS_XSD.double }),
          genericsContext)).term.valueRaw)
          .toEqual(1);
        expect((<any>handler.captureType(objectLoader.createCompactedResource('"256.36"'),
          objectLoader.createCompactedResource({ range: IRIS_XSD.double }),
          genericsContext)).term.valueRaw)
          .toEqual(256.36);
      });

      it('should capture JSON', () => {
        expect((<any>handler.captureType(objectLoader.createCompactedResource('"1"'),
          objectLoader.createCompactedResource({ range: IRIS_RDF.JSON }),
          genericsContext)).term.valueRaw)
          .toEqual(1);
        expect((<any>handler.captureType(objectLoader.createCompactedResource('"{"a":"b"}"'),
          objectLoader.createCompactedResource({ range: IRIS_RDF.JSON }),
          genericsContext)).term.valueRaw)
          .toEqual({ a: 'b' });
      });
      it('should error on invalid JSON', () => {
        expect(() => handler.captureType(objectLoader.createCompactedResource('"{a:\\"b\\"}"'),
          objectLoader.createCompactedResource({ range: IRIS_RDF.JSON, '@id': 'param' }),
          genericsContext))
          .toThrowError(/^The value .* for parameter "param" is not of required range type/u);
      });
    });

    describe('for non-literals', () => {
      it('should always handle variables', () => {
        expect(handler.captureType(
          objectLoader.createCompactedResource({
            '@id': 'ex:abc',
            '@type': 'Variable',
          }),
          objectLoader.createCompactedResource({
            range: IRIS_XSD.string,
          }),
          genericsContext,
        )).toBeTruthy();
      });

      it('should handle IRIs as values for params with string range', () => {
        expect(handler.captureType(
          objectLoader.createCompactedResource({
            '@id': 'ex:abc',
          }),
          objectLoader.createCompactedResource({
            range: IRIS_XSD.string,
          }),
          genericsContext,
        )).toBeTruthy();
      });

      it('should ignore params without range', () => {
        expect(handler.captureType(
          objectLoader.createCompactedResource({
            '@id': 'ex:abc',
          }),
          objectLoader.createCompactedResource({}),
          genericsContext,
        )).toBeTruthy();

        expect(handler.captureType(
          objectLoader.createCompactedResource({
            '@id': 'ex:abc',
            '@type': 'ex:Type',
          }),
          objectLoader.createCompactedResource({}),
          genericsContext,
        )).toBeTruthy();
      });

      it('should throw on param with range and missing value @type', () => {
        expect(() => handler.captureType(
          objectLoader.createCompactedResource({
            '@id': 'ex:abc',
          }),
          objectLoader.createCompactedResource({
            range: 'ex:RangeType',
          }),
          genericsContext,
        )).toThrow(/^The value "ex:abc" for parameter ".*" is not of required range type "ex:RangeType"/u);
      });

      it('should throw on param with range and unequal value @type', () => {
        expect(() => handler.captureType(
          objectLoader.createCompactedResource({
            '@id': 'ex:abc',
            range: 'ex:OtherType',
          }),
          objectLoader.createCompactedResource({
            range: 'ex:RangeType',
          }),
          genericsContext,
        )).toThrow(/The value "ex:abc" for parameter ".*" is not of required range type "ex:RangeType"/u);
      });

      it('should handle param with range and equal value @type', () => {
        expect(handler.captureType(
          objectLoader.createCompactedResource({
            '@id': 'ex:abc',
            '@type': 'ex:RangeType',
          }),
          objectLoader.createCompactedResource({
            range: 'ex:RangeType',
          }),
          genericsContext,
        )).toBeTruthy();
      });

      it('should handle param with range and a value @type that is a sub-type', () => {
        expect(handler.captureType(
          objectLoader.createCompactedResource({
            '@id': 'ex:abc',
            '@type': {
              '@id': 'ex:SubRangeType',
              '@type': 'ex:RangeType',
            },
          }),
          objectLoader.createCompactedResource({
            range: 'ex:RangeType',
          }),
          genericsContext,
        )).toBeTruthy();
      });

      it('should throw on param with range and a value @type that is an incompatible sub-type', () => {
        expect(() => handler.captureType(
          objectLoader.createCompactedResource({
            '@id': 'ex:abc',
            '@type': {
              '@id': 'ex:SubRangeType',
              '@type': 'ex:RangeTypeOther',
            },
          }),
          objectLoader.createCompactedResource({
            range: 'ex:RangeType',
          }),
          genericsContext,
          // eslint-disable-next-line max-len
        )).toThrow(/^The value "ex:abc" with types "ex:SubRangeType" for parameter ".*" is not of required range type "ex:RangeType"/u);
      });

      it('should handle param with range and a value @type that is a sub-sub-type', () => {
        expect(handler.captureType(
          objectLoader.createCompactedResource({
            '@id': 'ex:abc',
            '@type': {
              '@id': 'ex:SubSubRangeType',
              '@type': {
                '@id': 'ex:SubRangeType',
                '@type': 'ex:RangeType',
              },
            },
          }),
          objectLoader.createCompactedResource({
            range: 'ex:RangeType',
          }),
          genericsContext,
        )).toBeTruthy();
      });

      it('should handle param with range and a value @type that is a sub-class', () => {
        expect(handler.captureType(
          objectLoader.createCompactedResource({
            '@id': 'ex:abc',
            'http://www.w3.org/2000/01/rdf-schema#subClassOf': {
              '@id': 'ex:SubRangeType',
              '@type': 'ex:RangeType',
            },
          }),
          objectLoader.createCompactedResource({
            range: 'ex:RangeType',
          }),
          genericsContext,
        )).toBeTruthy();
      });

      it('should throw on param with range and a value @type that is an incompatible sub-class', () => {
        expect(() => handler.captureType(
          objectLoader.createCompactedResource({
            '@id': 'ex:abc',
            'http://www.w3.org/2000/01/rdf-schema#subClassOf': {
              '@id': 'ex:SubRangeType',
              '@type': 'ex:RangeTypeOther',
            },
          }),
          objectLoader.createCompactedResource({
            range: 'ex:RangeType',
          }),
          genericsContext,
          // eslint-disable-next-line max-len
        )).toThrow(/^The value "ex:abc" for parameter ".*" is not of required range type "ex:RangeType"/u);
      });

      it('should handle ignore param with range ParameterRangeCollectEntries', () => {
        expect(handler.captureType(
          objectLoader.createCompactedResource({
            '@id': 'ex:abc',
            '@type': 'ex:SomeType',
          }),
          objectLoader.createCompactedResource({
            range: {
              '@id': 'ex:RangeType',
              '@type': 'ParameterRangeCollectEntries',
            },
          }),
          genericsContext,
        )).toBeTruthy();
      });

      it('should handle union types with all valid types', () => {
        expect(handler.captureType(
          objectLoader.createCompactedResource({
            '@id': 'ex:abc',
            '@type': [ 'ex:SomeType1', 'ex:SomeType2' ],
          }),
          objectLoader.createCompactedResource({
            range: {
              '@type': 'ParameterRangeUnion',
              parameterRangeElements: [
                {
                  '@id': 'ex:SomeType1',
                },
                {
                  '@id': 'ex:SomeType2',
                },
              ],
            },
          }),
          genericsContext,
        )).toBeTruthy();
      });

      it('should handle union types with one valid type', () => {
        expect(handler.captureType(
          objectLoader.createCompactedResource({
            '@id': 'ex:abc',
            '@type': 'ex:SomeType',
          }),
          objectLoader.createCompactedResource({
            range: {
              '@type': 'ParameterRangeUnion',
              parameterRangeElements: [
                {
                  '@id': 'ex:SomeTypeInvalid',
                },
                {
                  '@id': 'ex:SomeType',
                },
              ],
            },
          }),
          genericsContext,
        )).toBeTruthy();
      });

      it('should throw on union types with no valid type', () => {
        expect(() => handler.captureType(
          objectLoader.createCompactedResource({
            '@id': 'ex:abc',
            '@type': 'ex:SomeType',
          }),
          objectLoader.createCompactedResource({
            range: {
              '@type': 'ParameterRangeUnion',
              parameterRangeElements: [
                {
                  '@id': 'ex:SomeTypeInvalid1',
                },
                {
                  '@id': 'ex:SomeTypeInvalid2',
                },
              ],
            },
          }),
          genericsContext,
          // eslint-disable-next-line max-len
        )).toThrow(/^The value "ex:abc" with types "ex:SomeType" for parameter ".*" is not of required range type "ex:SomeTypeInvalid1 \| ex:SomeTypeInvalid2"/u);
      });

      it('should handle intersection types with all valid types', () => {
        expect(handler.captureType(
          objectLoader.createCompactedResource({
            '@id': 'ex:abc',
            '@type': [ 'ex:SomeType1', 'ex:SomeType2' ],
          }),
          objectLoader.createCompactedResource({
            range: {
              '@type': 'ParameterRangeIntersection',
              parameterRangeElements: [
                {
                  '@id': 'ex:SomeType1',
                },
                {
                  '@id': 'ex:SomeType2',
                },
              ],
            },
          }),
          genericsContext,
        )).toBeTruthy();
      });

      it('should throw on intersection types with one valid type', () => {
        expect(() => handler.captureType(
          objectLoader.createCompactedResource({
            '@id': 'ex:abc',
            '@type': 'ex:SomeType',
          }),
          objectLoader.createCompactedResource({
            range: {
              '@type': 'ParameterRangeIntersection',
              parameterRangeElements: [
                {
                  '@id': 'ex:SomeType1',
                },
                {
                  '@id': 'ex:SomeType2',
                },
              ],
            },
          }),
          genericsContext,
          // eslint-disable-next-line max-len
        )).toThrow(/^The value "ex:abc" with types "ex:SomeType" for parameter ".*" is not of required range type "ex:SomeType1 & ex:SomeType2"/u);
      });

      it('should throw on intersection types with no valid type', () => {
        expect(() => handler.captureType(
          objectLoader.createCompactedResource({
            '@id': 'ex:abc',
            '@type': 'ex:SomeType',
          }),
          objectLoader.createCompactedResource({
            range: {
              '@type': 'ParameterRangeIntersection',
              parameterRangeElements: [
                {
                  '@id': 'ex:SomeTypeInvalid1',
                },
                {
                  '@id': 'ex:SomeTypeInvalid2',
                },
              ],
            },
          }),
          genericsContext,
          // eslint-disable-next-line max-len
        )).toThrow(/^The value "ex:abc" with types "ex:SomeType" for parameter ".*" is not of required range type "ex:SomeTypeInvalid1 & ex:SomeTypeInvalid2"/u);
      });

      it('should handle param with undefined range and undefined value', () => {
        expect(handler.captureType(
          undefined,
          objectLoader.createCompactedResource({
            range: { '@type': 'ParameterRangeUndefined' },
          }),
          genericsContext,
        )).toBeUndefined();
      });

      it('should handle param with wildcard range and a value', () => {
        expect(handler.captureType(
          objectLoader.createCompactedResource('"abc"'),
          objectLoader.createCompactedResource({
            range: { '@type': 'ParameterRangeWildcard' },
          }),
          genericsContext,
        )).toBeTruthy();
      });

      it('should handle param with wildcard range and undefined value', () => {
        expect(handler.captureType(
          undefined,
          objectLoader.createCompactedResource({
            range: { '@type': 'ParameterRangeWildcard' },
          }),
          genericsContext,
        )).toBeUndefined();
      });

      it('should handle array type with valid types', () => {
        expect(handler.captureType(
          objectLoader.createCompactedResource({
            list: [
              {
                '@id': 'ex:abc',
                '@type': [ 'ex:SomeType1', 'ex:SomeType2' ],
              },
            ],
          }),
          objectLoader.createCompactedResource({
            range: {
              '@type': 'ParameterRangeArray',
              parameterRangeValue: { '@id': 'ex:SomeType1' },
            },
          }),
          genericsContext,
        )).toBeTruthy();
      });

      it('should throw on array type without list', () => {
        expect(() => handler.captureType(
          objectLoader.createCompactedResource({
            '@id': 'ex:abc',
            '@type': 'ex:SomeType1',
          }),
          objectLoader.createCompactedResource({
            range: {
              '@type': 'ParameterRangeArray',
              parameterRangeValue: { '@id': 'ex:SomeType1' },
            },
          }),
          genericsContext,
          // eslint-disable-next-line max-len
        )).toThrow(/^The value "ex:abc" with types "ex:SomeType1" for parameter ".*" is not of required range type "ex:SomeType1\[\]"/u);
      });

      it('should throw on array type with invalid list element type', () => {
        expect(() => handler.captureType(
          objectLoader.createCompactedResource({
            list: [
              {
                '@id': 'ex:abc',
                '@type': 'ex:SomeType',
              },
            ],
          }),
          objectLoader.createCompactedResource({
            range: {
              '@type': 'ParameterRangeArray',
              parameterRangeValue: { '@id': 'ex:SomeType1' },
            },
          }),
          genericsContext,
          // eslint-disable-next-line max-len
        )).toThrow(/^The value "\[ex:abc\]" for parameter ".*" is not of required range type "ex:SomeType1\[\]"/u);
      });

      it('should handle tuple type with single entry', () => {
        expect(handler.captureType(
          objectLoader.createCompactedResource({
            list: [
              {
                '@id': 'ex:abc',
                '@type': [ 'ex:SomeType1' ],
              },
            ],
          }),
          objectLoader.createCompactedResource({
            range: {
              '@type': 'ParameterRangeTuple',
              parameterRangeElements: [
                { '@id': 'ex:SomeType1' },
              ],
            },
          }),
          genericsContext,
        )).toBeTruthy();
      });

      it('should throw on tuple type with invalid single entry', () => {
        expect(() => handler.captureType(
          objectLoader.createCompactedResource({
            list: [
              {
                '@id': 'ex:abc',
                '@type': [ 'ex:SomeType1' ],
              },
            ],
          }),
          objectLoader.createCompactedResource({
            range: {
              '@type': 'ParameterRangeTuple',
              parameterRangeElements: [
                { '@id': 'ex:SomeType' },
              ],
            },
          }),
          genericsContext,
        )).toThrow(/^The value "\[ex:abc\]" for parameter ".*" is not of required range type "\[ex:SomeType\]"/u);
      });

      it('should throw on tuple type without list', () => {
        expect(() => handler.captureType(
          objectLoader.createCompactedResource({}),
          objectLoader.createCompactedResource({
            range: {
              '@type': 'ParameterRangeTuple',
              parameterRangeElements: [
                { '@id': 'ex:SomeType' },
              ],
            },
          }),
          genericsContext,
        )).toThrow(/^The value ".*" for parameter ".*" is not of required range type "\[ex:SomeType\]"/u);
      });

      it('should handle tuple type with multiple entries', () => {
        expect(handler.captureType(
          objectLoader.createCompactedResource({
            list: [
              {
                '@id': 'ex:abc1',
                '@type': [ 'ex:SomeType1' ],
              },
              {
                '@id': 'ex:abc2',
                '@type': [ 'ex:SomeType2' ],
              },
              {
                '@id': 'ex:abc3',
                '@type': [ 'ex:SomeType3' ],
              },
            ],
          }),
          objectLoader.createCompactedResource({
            range: {
              '@type': 'ParameterRangeTuple',
              parameterRangeElements: [
                { '@id': 'ex:SomeType1' },
                { '@id': 'ex:SomeType2' },
                { '@id': 'ex:SomeType3' },
              ],
            },
          }),
          genericsContext,
        )).toBeTruthy();
      });

      it('should throw on tuple type with invalid multiple entries', () => {
        expect(() => handler.captureType(
          objectLoader.createCompactedResource({
            list: [
              {
                '@id': 'ex:abc1',
                '@type': [ 'ex:SomeType1' ],
              },
              {
                '@id': 'ex:abc2',
                '@type': [ 'ex:SomeType2' ],
              },
              {
                '@id': 'ex:abc3',
                '@type': [ 'ex:SomeType' ],
              },
            ],
          }),
          objectLoader.createCompactedResource({
            range: {
              '@type': 'ParameterRangeTuple',
              parameterRangeElements: [
                { '@id': 'ex:SomeType1' },
                { '@id': 'ex:SomeType2' },
                { '@id': 'ex:SomeType3' },
              ],
            },
          }),
          genericsContext,
          // eslint-disable-next-line max-len
        )).toThrow(/^The value "\[ex:abc1, ex:abc2, ex:abc3\]" for parameter ".*" is not of required range type "\[ex:SomeType1, ex:SomeType2, ex:SomeType3\]"/u);
      });

      it('should handle tuple type with single rest entry', () => {
        expect(handler.captureType(
          objectLoader.createCompactedResource({
            list: [
              {
                '@id': 'ex:abc1',
                '@type': [ 'ex:SomeType1' ],
              },
              {
                '@id': 'ex:abc2',
                '@type': [ 'ex:SomeType1' ],
              },
            ],
          }),
          objectLoader.createCompactedResource({
            range: {
              '@type': 'ParameterRangeTuple',
              parameterRangeElements: [
                {
                  '@type': 'ParameterRangeRest',
                  parameterRangeValue: { '@id': 'ex:SomeType1' },
                },
              ],
            },
          }),
          genericsContext,
        )).toBeTruthy();
      });

      it('should throw on tuple type with invalid single rest entry', () => {
        expect(() => handler.captureType(
          objectLoader.createCompactedResource({
            list: [
              {
                '@id': 'ex:abc1',
                '@type': [ 'ex:SomeType1' ],
              },
              {
                '@id': 'ex:abc2',
                '@type': [ 'ex:SomeType2' ],
              },
            ],
          }),
          objectLoader.createCompactedResource({
            range: {
              '@type': 'ParameterRangeTuple',
              parameterRangeElements: [
                {
                  '@type': 'ParameterRangeRest',
                  parameterRangeValue: { '@id': 'ex:SomeType1' },
                },
              ],
            },
          }),
          genericsContext,
          // eslint-disable-next-line max-len
        )).toThrow(/^The value "\[ex:abc1, ex:abc2\]" for parameter ".*" is not of required range type "\[...ex:SomeType1\]"/u);
      });

      it('should handle tuple type with multiple rest entries', () => {
        expect(handler.captureType(
          objectLoader.createCompactedResource({
            list: [
              {
                '@id': 'ex:abc1',
                '@type': [ 'ex:SomeType1' ],
              },
              {
                '@id': 'ex:abc2',
                '@type': [ 'ex:SomeType1' ],
              },
              {
                '@id': 'ex:abc3',
                '@type': [ 'ex:SomeType2' ],
              },
              {
                '@id': 'ex:abc4',
                '@type': [ 'ex:SomeType2' ],
              },
            ],
          }),
          objectLoader.createCompactedResource({
            range: {
              '@type': 'ParameterRangeTuple',
              parameterRangeElements: [
                {
                  '@type': 'ParameterRangeRest',
                  parameterRangeValue: { '@id': 'ex:SomeType1' },
                },
                {
                  '@type': 'ParameterRangeRest',
                  parameterRangeValue: { '@id': 'ex:SomeType2' },
                },
              ],
            },
          }),
          genericsContext,
        )).toBeTruthy();
      });

      it('should throw on tuple type with invalid multiple rest entries', () => {
        expect(() => handler.captureType(
          objectLoader.createCompactedResource({
            list: [
              {
                '@id': 'ex:abc1',
                '@type': [ 'ex:SomeType1' ],
              },
              {
                '@id': 'ex:abc2',
                '@type': [ 'ex:SomeType1' ],
              },
              {
                '@id': 'ex:abc3',
                '@type': [ 'ex:SomeTypeX' ],
              },
              {
                '@id': 'ex:abc4',
                '@type': [ 'ex:SomeType2' ],
              },
            ],
          }),
          objectLoader.createCompactedResource({
            range: {
              '@type': 'ParameterRangeTuple',
              parameterRangeElements: [
                {
                  '@type': 'ParameterRangeRest',
                  parameterRangeValue: { '@id': 'ex:SomeType1' },
                },
                {
                  '@type': 'ParameterRangeRest',
                  parameterRangeValue: { '@id': 'ex:SomeType2' },
                },
              ],
            },
          }),
          genericsContext,
          // eslint-disable-next-line max-len
        )).toThrow(/^The value "\[ex:abc1, ex:abc2, ex:abc3, ex:abc4\]" for parameter ".*" is not of required range type "\[...ex:SomeType1, ...ex:SomeType2\]"/u);
      });

      it('should handle tuple type with complex entries', () => {
        expect(handler.captureType(
          objectLoader.createCompactedResource({
            list: [
              {
                '@id': 'ex:abc1',
                '@type': [ 'ex:SomeType1' ],
              },
              {
                '@id': 'ex:abc2',
                '@type': [ 'ex:SomeType1' ],
              },
              {
                '@id': 'ex:abc3',
                '@type': [ 'ex:SomeType2' ],
              },
              {
                '@id': 'ex:abc4',
                '@type': [ 'ex:SomeType3' ],
              },
            ],
          }),
          objectLoader.createCompactedResource({
            range: {
              '@type': 'ParameterRangeTuple',
              parameterRangeElements: [
                {
                  '@type': 'ParameterRangeRest',
                  parameterRangeValue: { '@id': 'ex:SomeType1' },
                },
                { '@id': 'ex:SomeType2' },
                { '@id': 'ex:SomeType3' },
              ],
            },
          }),
          genericsContext,
        )).toBeTruthy();
      });

      it('should handle a string literal type with valid types', () => {
        expect(handler.captureType(
          objectLoader.createCompactedResource('abc'),
          objectLoader.createCompactedResource({
            range: {
              '@type': 'ParameterRangeLiteral',
              parameterRangeValue: 'abc',
            },
          }),
          genericsContext,
        )).toBeTruthy();
      });

      it('should handle a number literal type with valid types', () => {
        expect(handler.captureType(
          objectLoader.createCompactedResource(DF.literal('123', DF.namedNode(IRIS_XSD.integer))),
          objectLoader.createCompactedResource({
            range: {
              '@type': 'ParameterRangeLiteral',
              parameterRangeValue: DF.literal('123', DF.namedNode(IRIS_XSD.integer)),
            },
          }),
          genericsContext,
        )).toBeTruthy();
      });

      it('should handle a boolean literal type with valid types', () => {
        expect(handler.captureType(
          objectLoader.createCompactedResource(DF.literal('true', DF.namedNode(IRIS_XSD.boolean))),
          objectLoader.createCompactedResource({
            range: {
              '@type': 'ParameterRangeLiteral',
              parameterRangeValue: DF.literal('true', DF.namedNode(IRIS_XSD.boolean)),
            },
          }),
          genericsContext,
        )).toBeTruthy();
      });

      it('should throw on a literal type with incompatible value', () => {
        expect(() => handler.captureType(
          objectLoader.createCompactedResource(DF.literal('123', DF.namedNode(IRIS_XSD.integer))),
          objectLoader.createCompactedResource({
            range: {
              '@type': 'ParameterRangeLiteral',
              parameterRangeValue: DF.literal('true', DF.namedNode(IRIS_XSD.boolean)),
            },
          }),
          genericsContext,
          // eslint-disable-next-line max-len
        )).toThrow(/^The value "123" for parameter ".*" is not of required range type "true"/u);
      });

      it('should handle a union over string literal types with valid types', () => {
        expect(handler.captureType(
          objectLoader.createCompactedResource('"def"'),
          objectLoader.createCompactedResource({
            range: {
              '@type': 'ParameterRangeUnion',
              parameterRangeElements: [
                {
                  '@type': 'ParameterRangeLiteral',
                  parameterRangeValue: '"abc"',
                },
                {
                  '@type': 'ParameterRangeLiteral',
                  parameterRangeValue: '"def"',
                },
              ],
            },
          }),
          genericsContext,
        )).toBeTruthy();
      });

      it('should throw on a union over string literal types with incompatible types', () => {
        expect(() => handler.captureType(
          objectLoader.createCompactedResource('"xyz"'),
          objectLoader.createCompactedResource({
            range: {
              '@type': 'ParameterRangeUnion',
              parameterRangeElements: [
                {
                  '@type': 'ParameterRangeLiteral',
                  parameterRangeValue: '"abc"',
                },
                {
                  '@type': 'ParameterRangeLiteral',
                  parameterRangeValue: '"def"',
                },
              ],
            },
          }),
          genericsContext,
          // eslint-disable-next-line max-len
        )).toThrow(/^The value "xyz" for parameter ".*" is not of required range type "abc \| def"/u);
      });

      it('should handle keyof type with valid value', () => {
        expect(handler.captureType(
          objectLoader.createCompactedResource('"fieldB"'),
          objectLoader.createCompactedResource({
            range: {
              '@type': 'ParameterRangeKeyof',
              parameterRangeValue: {
                '@id': 'ex:SomeType1',
                memberKeys: [ '"fieldA"', '"fieldB"' ],
              },
            },
          }),
          genericsContext,
        )).toBeTruthy();
      });

      it('should throw on keyof type without valid value', () => {
        expect(() => handler.captureType(
          objectLoader.createCompactedResource('"fieldC"'),
          objectLoader.createCompactedResource({
            range: {
              '@type': 'ParameterRangeKeyof',
              parameterRangeValue: {
                '@id': 'ex:SomeType1',
                memberKeys: [ '"fieldA"', '"fieldB"' ],
              },
            },
          }),
          genericsContext,
          // eslint-disable-next-line max-len
        )).toThrow(/^The value "fieldC" for parameter ".*" is not of required range type "keyof ex:SomeType1"/u);
      });

      describe('with generics', () => {
        it('should handle an unbound generic type reference with a literal value', () => {
          genericsContext = new GenericsContext(objectLoader, [
            objectLoader.createCompactedResource('ex:GEN_T'),
          ]);

          expect(handler.captureType(
            objectLoader.createCompactedResource('"def"'),
            objectLoader.createCompactedResource({
              range: {
                '@type': 'ParameterRangeGenericTypeReference',
                parameterRangeGenericType: 'ex:GEN_T',
              },
            }),
            genericsContext,
          )).toBeTruthy();
        });

        it('should throw on an unknown generic type reference', () => {
          expect(() => handler.captureType(
            objectLoader.createCompactedResource('"def"'),
            objectLoader.createCompactedResource({
              range: {
                '@type': 'ParameterRangeGenericTypeReference',
                parameterRangeGenericType: 'ex:GEN_T',
              },
            }),
            genericsContext,
            // eslint-disable-next-line max-len
          )).toThrow(/^The value "def" for parameter ".*" is not of required range type "<UNKNOWN GENERIC: ex:GEN_T>"/u);
        });

        it('should handle a bound generic type reference with a compatible literal value', () => {
          genericsContext = new GenericsContext(objectLoader, [
            objectLoader.createCompactedResource('ex:GEN_T'),
          ]);
          genericsContext.bindings['ex:GEN_T'] = objectLoader.createCompactedResource(IRIS_XSD.number);

          expect(handler.captureType(
            objectLoader.createCompactedResource(`"123"^^${IRIS_XSD.number}`),
            objectLoader.createCompactedResource({
              range: {
                '@type': 'ParameterRangeGenericTypeReference',
                parameterRangeGenericType: 'ex:GEN_T',
              },
            }),
            genericsContext,
          )).toBeTruthy();
        });

        it('should handle a generic type reference with range with a compatible literal value', () => {
          genericsContext = new GenericsContext(objectLoader, [
            objectLoader.createCompactedResource({
              '@id': 'ex:GEN_T',
              range: IRIS_XSD.number,
            }),
          ]);

          expect(handler.captureType(
            objectLoader.createCompactedResource(`"123"^^${IRIS_XSD.number}`),
            objectLoader.createCompactedResource({
              range: {
                '@type': 'ParameterRangeGenericTypeReference',
                parameterRangeGenericType: 'ex:GEN_T',
              },
            }),
            genericsContext,
          )).toBeTruthy();
        });

        it('should throw on a bound generic type reference with an incompatible literal value', () => {
          genericsContext = new GenericsContext(objectLoader, [
            objectLoader.createCompactedResource('ex:GEN_T'),
          ]);
          genericsContext.bindings['ex:GEN_T'] = objectLoader.createCompactedResource(IRIS_XSD.number);

          expect(() => handler.captureType(
            objectLoader.createCompactedResource(`"true"^^${IRIS_XSD.boolean}`),
            objectLoader.createCompactedResource({
              range: {
                '@type': 'ParameterRangeGenericTypeReference',
                parameterRangeGenericType: 'ex:GEN_T',
              },
            }),
            genericsContext,
            // eslint-disable-next-line max-len
          )).toThrow(/^The value "true" for parameter ".*" is not of required range type "<ex:GEN_T>"/u);
        });

        it('should handle an unbound generic type reference with a component value', () => {
          genericsContext = new GenericsContext(objectLoader, [
            objectLoader.createCompactedResource('ex:GEN_T'),
          ]);

          expect(handler.captureType(
            objectLoader.createCompactedResource({
              '@id': 'ex:component',
              '@type': [ 'ex:SomeType1' ],
            }),
            objectLoader.createCompactedResource({
              range: {
                '@type': 'ParameterRangeGenericTypeReference',
                parameterRangeGenericType: 'ex:GEN_T',
              },
            }),
            genericsContext,
          )).toBeTruthy();
        });

        it('should handle a bound generic type reference with a compatible component value', () => {
          genericsContext = new GenericsContext(objectLoader, [
            objectLoader.createCompactedResource('ex:GEN_T'),
          ]);
          genericsContext.bindings['ex:GEN_T'] = objectLoader.createCompactedResource('ex:SomeType1');

          expect(handler.captureType(
            objectLoader.createCompactedResource({
              '@id': 'ex:component',
              '@type': [ 'ex:SomeType1' ],
            }),
            objectLoader.createCompactedResource({
              range: {
                '@type': 'ParameterRangeGenericTypeReference',
                parameterRangeGenericType: 'ex:GEN_T',
              },
            }),
            genericsContext,
          )).toBeTruthy();
        });

        it('should throw on a bound generic type reference with an incompatible component value', () => {
          genericsContext = new GenericsContext(objectLoader, [
            objectLoader.createCompactedResource('ex:GEN_T'),
          ]);
          genericsContext.bindings['ex:GEN_T'] = objectLoader.createCompactedResource('ex:SomeType2');

          expect(() => handler.captureType(
            objectLoader.createCompactedResource({
              '@id': 'ex:component',
              '@type': [ 'ex:SomeType1' ],
            }),
            objectLoader.createCompactedResource({
              range: {
                '@type': 'ParameterRangeGenericTypeReference',
                parameterRangeGenericType: 'ex:GEN_T',
              },
            }),
            genericsContext,
            // eslint-disable-next-line max-len
          )).toThrow(/^The value "ex:component" with types "ex:SomeType1" for parameter ".*" is not of required range type "<ex:GEN_T>"/u);
        });

        it('should handle a bound generic type reference with a compatible undefined value', () => {
          genericsContext = new GenericsContext(objectLoader, [
            objectLoader.createCompactedResource('ex:GEN_T'),
          ]);
          genericsContext.bindings['ex:GEN_T'] = objectLoader
            .createCompactedResource({ '@type': 'ParameterRangeUndefined' });

          expect(handler.captureType(
            undefined,
            objectLoader.createCompactedResource({
              range: {
                '@type': 'ParameterRangeGenericTypeReference',
                parameterRangeGenericType: 'ex:GEN_T',
              },
            }),
            genericsContext,
          )).toBeUndefined();
        });

        it('should throw on a bound generic type reference with an incompatible undefined value', () => {
          genericsContext = new GenericsContext(objectLoader, [
            objectLoader.createCompactedResource('ex:GEN_T'),
          ]);
          genericsContext.bindings['ex:GEN_T'] = objectLoader
            .createCompactedResource({ '@type': 'ParameterRangeUndefined' });

          expect(() => handler.captureType(
            objectLoader.createCompactedResource(`"true"^^${IRIS_XSD.boolean}`),
            objectLoader.createCompactedResource({
              range: {
                '@type': 'ParameterRangeGenericTypeReference',
                parameterRangeGenericType: 'ex:GEN_T',
              },
            }),
            genericsContext,
            // eslint-disable-next-line max-len
          )).toThrow(/^The value "true" for parameter ".*" is not of required range type "<ex:GEN_T>"/u);
        });

        it('should handle a generic component without generic binding', () => {
          const value = handler.captureType(
            objectLoader.createCompactedResource({
              '@type': [ 'ex:SomeType1' ],
            }),
            objectLoader.createCompactedResource({
              range: {
                '@type': 'ParameterRangeGenericComponent',
                component: {
                  '@id': 'ex:SomeType1',
                  genericTypeParameters: [
                    'ex:SomeType1__generic_T',
                  ],
                },
                genericTypeInstances: [
                  {
                    '@type': 'ParameterRangeGenericTypeReference',
                    parameterRangeGenericType: 'ex:GEN_T',
                  },
                ],
              },
            }),
            genericsContext,
          );
          expect(value).toBeTruthy();
          expectOutputProperties(value, objectLoader.createCompactedResource({
            '@type': [ 'ex:SomeType1' ],
            genericTypeInstancesComponentScope: 'ex:SomeType1',
            genericTypeInstances: [
              {
                '@type': 'ParameterRangeGenericTypeReference',
                parameterRangeGenericType: 'ex:GEN_T',
                parameterRangeGenericBindings: undefined,
              },
            ],
          }));
        });

        it('should throw on a generic component without generic binding and undefined value', () => {
          expect(() => handler.captureType(
            undefined,
            objectLoader.createCompactedResource({
              range: {
                '@type': 'ParameterRangeGenericComponent',
                component: {
                  '@id': 'ex:SomeType1',
                  genericTypeParameters: [
                    'ex:SomeType1__generic_T',
                  ],
                },
                genericTypeInstances: [
                  {
                    '@type': 'ParameterRangeGenericTypeReference',
                    parameterRangeGenericType: 'ex:GEN_T',
                  },
                ],
              },
            }),
            genericsContext,
            // eslint-disable-next-line max-len
          )).toThrow(/^The value "undefined" for parameter ".*" is not of required range type "\(ex:SomeType1\)<UNKNOWN GENERIC: ex:GEN_T>"/u);
        });

        it('should handle a generic component with generic binding', () => {
          genericsContext = new GenericsContext(objectLoader, [
            objectLoader.createCompactedResource('ex:GEN_T'),
          ]);
          genericsContext.bindings['ex:GEN_T'] = objectLoader.createCompactedResource('ex:SomeType2');

          const value = handler.captureType(
            objectLoader.createCompactedResource({
              '@type': [ 'ex:SomeType1' ],
            }),
            objectLoader.createCompactedResource({
              range: {
                '@type': 'ParameterRangeGenericComponent',
                component: {
                  '@id': 'ex:SomeType1',
                  genericTypeParameters: [
                    'ex:SomeType1__generic_T',
                  ],
                },
                genericTypeInstances: [
                  {
                    '@type': 'ParameterRangeGenericTypeReference',
                    parameterRangeGenericType: 'ex:GEN_T',
                  },
                ],
              },
            }),
            genericsContext,
          );
          expect(value).toBeTruthy();
          expectOutputProperties(value, objectLoader.createCompactedResource({
            '@type': [ 'ex:SomeType1' ],
            genericTypeInstancesComponentScope: 'ex:SomeType1',
            genericTypeInstances: [
              {
                '@type': 'ParameterRangeGenericTypeReference',
                parameterRangeGenericType: 'ex:GEN_T',
                parameterRangeGenericBindings: [
                  { '@id': 'ex:SomeType2' },
                ],
              },
            ],
          }));
        });

        it('should throw on a generic component with an incompatible value', () => {
          genericsContext = new GenericsContext(objectLoader, [
            objectLoader.createCompactedResource('ex:GEN_T'),
          ]);
          genericsContext.bindings['ex:GEN_T'] = objectLoader.createCompactedResource('ex:SomeType2');

          expect(() => handler.captureType(
            objectLoader.createCompactedResource({
              '@type': [ 'ex:SomeType1' ],
            }),
            objectLoader.createCompactedResource({
              range: {
                '@type': 'ParameterRangeGenericComponent',
                component: {
                  '@id': 'ex:SomeType2',
                  genericTypeParameters: [
                    'ex:SomeType2__generic_T',
                  ],
                },
                genericTypeInstances: [
                  {
                    '@type': 'ParameterRangeGenericTypeReference',
                    parameterRangeGenericType: 'ex:GEN_T',
                  },
                ],
              },
            }),
            genericsContext,
            // eslint-disable-next-line max-len
          )).toThrow(/^The value ".*" with types "ex:SomeType1" for parameter ".*" is not of required range type "\(ex:SomeType2\)<ex:GEN_T>"/u);
        });

        it('should handle a generic component with a direct type value', () => {
          const value = handler.captureType(
            objectLoader.createCompactedResource({
              '@type': [ 'ex:SomeType1' ],
            }),
            objectLoader.createCompactedResource({
              range: {
                '@type': 'ParameterRangeGenericComponent',
                component: {
                  '@id': 'ex:SomeType1',
                  genericTypeParameters: [
                    'ex:SomeType1__generic_T',
                  ],
                },
                genericTypeInstances: [
                  {
                    '@id': 'ex:SomeType2',
                  },
                ],
              },
            }),
            genericsContext,
          );
          expect(value).toBeTruthy();
          expectOutputProperties(value, objectLoader.createCompactedResource({
            '@type': [ 'ex:SomeType1' ],
            genericTypeInstancesComponentScope: 'ex:SomeType1',
            genericTypeInstances: [
              {
                '@id': 'ex:SomeType2',
              },
            ],
          }));
        });

        it('should throw on a generic component with config that already has manual generics set', () => {
          genericsContext = new GenericsContext(objectLoader, [
            objectLoader.createCompactedResource('ex:GEN_T'),
          ]);
          genericsContext.bindings['ex:GEN_T'] = objectLoader.createCompactedResource('ex:SomeType2');

          expect(() => handler.captureType(
            objectLoader.createCompactedResource({
              '@type': [ 'ex:SomeType1' ],
              genericTypeInstances: [
                {
                  type: 'ParameterRangeGenericTypeReference',
                  parameterRangeGenericType: 'ex:GEN_T',
                  parameterRangeGenericBindings: undefined,
                },
              ],
            }),
            objectLoader.createCompactedResource({
              range: {
                '@type': 'ParameterRangeGenericComponent',
                component: 'ex:SomeType1',
                genericTypeInstances: [
                  {
                    '@type': 'ParameterRangeGenericTypeReference',
                    parameterRangeGenericType: 'ex:GEN_T',
                  },
                ],
              },
            }),
            genericsContext,
            // eslint-disable-next-line max-len
          )).toThrow(/^Simultaneous manual generic type passing and generic type inference are not supported yet\./u);
        });

        it('should throw on a generic component without parameterRangeGenericType value', () => {
          genericsContext = new GenericsContext(objectLoader, [
            objectLoader.createCompactedResource('ex:GEN_T'),
          ]);
          genericsContext.bindings['ex:GEN_T'] = objectLoader.createCompactedResource('ex:SomeType2');

          expect(() => handler.captureType(
            objectLoader.createCompactedResource({
              '@type': [ 'ex:SomeType1' ],
            }),
            objectLoader.createCompactedResource({
              range: {
                '@type': 'ParameterRangeGenericComponent',
                component: 'ex:SomeType1',
                genericTypeInstances: [
                  {
                    '@type': 'ParameterRangeGenericTypeReference',
                  },
                ],
              },
            }),
            genericsContext,
          )).toThrow(`Invalid generic type instance in a ParameterRangeGenericComponent was detected: missing parameterRangeGenericType property.`);
        });

        it('should handle a generic component with value a sub-type with fixed generic', () => {
          genericsContext = new GenericsContext(objectLoader, [
            objectLoader.createCompactedResource('ex:GEN_T'),
          ]);
          genericsContext.bindings['ex:GEN_T'] = objectLoader.createCompactedResource('xsd:integer');

          const value = handler.captureType(
            objectLoader.createCompactedResource({
              '@type': {
                '@id': 'ex:SomeType1',
                extends: {
                  '@type': 'ParameterRangeGenericComponent',
                  component: {
                    '@id': 'ex:SomeType2',
                    genericTypeParameters: [
                      'ex:SomeType2__generic_T',
                    ],
                  },
                  genericTypeInstances: [
                    'xsd:integer',
                  ],
                },
              },
            }),
            objectLoader.createCompactedResource({
              range: {
                '@type': 'ParameterRangeGenericComponent',
                component: 'ex:SomeType2',
                genericTypeInstances: [
                  {
                    '@type': 'ParameterRangeGenericTypeReference',
                    parameterRangeGenericType: 'ex:GEN_T',
                  },
                ],
              },
            }),
            genericsContext,
          );
          expect(value).toBeTruthy();
          expectOutputProperties(value, objectLoader.createCompactedResource({
            '@type': [ 'ex:SomeType1' ],
            genericTypeInstancesComponentScope: 'ex:SomeType2',
            genericTypeInstances: [
              {
                '@type': 'ParameterRangeGenericTypeReference',
                parameterRangeGenericType: 'ex:GEN_T',
                parameterRangeGenericBindings: 'xsd:integer',
              },
            ],
          }));
        });

        it('should handle a generic component with value a sub-type with compatible fixed generic', () => {
          genericsContext = new GenericsContext(objectLoader, [
            objectLoader.createCompactedResource('ex:GEN_T'),
          ]);
          genericsContext.bindings['ex:GEN_T'] = objectLoader.createCompactedResource('xsd:integer');

          const value = handler.captureType(
            objectLoader.createCompactedResource({
              '@type': {
                '@id': 'ex:SomeType1',
                extends: {
                  '@type': 'ParameterRangeGenericComponent',
                  component: {
                    '@id': 'ex:SomeType2',
                    genericTypeParameters: [
                      'ex:SomeType2__generic_T',
                    ],
                  },
                  genericTypeInstances: [
                    'xsd:number',
                  ],
                },
              },
            }),
            objectLoader.createCompactedResource({
              range: {
                '@type': 'ParameterRangeGenericComponent',
                component: 'ex:SomeType2',
                genericTypeInstances: [
                  {
                    '@type': 'ParameterRangeGenericTypeReference',
                    parameterRangeGenericType: 'ex:GEN_T',
                  },
                ],
              },
            }),
            genericsContext,
          );
          expect(value).toBeTruthy();
          expectOutputProperties(value, objectLoader.createCompactedResource({
            '@type': [ 'ex:SomeType1' ],
            genericTypeInstancesComponentScope: 'ex:SomeType2',
            genericTypeInstances: [
              {
                '@type': 'ParameterRangeGenericTypeReference',
                parameterRangeGenericType: 'ex:GEN_T',
                parameterRangeGenericBindings: 'xsd:integer',
              },
            ],
          }));
        });

        it('should throw on a generic component with value a sub-type with incompat fixed generic', () => {
          genericsContext = new GenericsContext(objectLoader, [
            objectLoader.createCompactedResource('ex:GEN_T'),
          ]);
          genericsContext.bindings['ex:GEN_T'] = objectLoader.createCompactedResource('xsd:integer');

          expect(() => handler.captureType(
            objectLoader.createCompactedResource({
              '@type': {
                '@id': 'ex:SomeType1',
                extends: {
                  '@type': 'ParameterRangeGenericComponent',
                  component: {
                    '@id': 'ex:SomeType2',
                    genericTypeParameters: [
                      'ex:SomeType2__generic_T',
                    ],
                  },
                  genericTypeInstances: [
                    'xsd:boolean',
                  ],
                },
              },
            }),
            objectLoader.createCompactedResource({
              range: {
                '@type': 'ParameterRangeGenericComponent',
                component: 'ex:SomeType2',
                genericTypeInstances: [
                  {
                    '@type': 'ParameterRangeGenericTypeReference',
                    parameterRangeGenericType: 'ex:GEN_T',
                  },
                ],
              },
            }),
            genericsContext,
            // eslint-disable-next-line max-len
          )).toThrow(/The value ".*" with types "ex:SomeType1" for parameter ".*" is not of required range type "\(ex:SomeType2\)<ex:GEN_T>"/u);
        });

        it('should handle a generic component with value a sub-type with unbound generic', () => {
          genericsContext = new GenericsContext(objectLoader, [
            objectLoader.createCompactedResource('ex:GEN_T'),
          ]);
          genericsContext.bindings['ex:GEN_T'] = objectLoader.createCompactedResource('xsd:integer');

          const value = handler.captureType(
            objectLoader.createCompactedResource({
              '@type': {
                '@type': 'ParameterRangeGenericComponent',
                component: {
                  '@id': 'ex:SomeType1',
                  genericTypeParameters: [
                    'ex:SomeType1__generic_T',
                  ],
                  extends: {
                    '@type': 'ParameterRangeGenericComponent',
                    component: {
                      '@id': 'ex:SomeType2',
                      genericTypeParameters: [
                        'ex:SomeType2__generic_T',
                      ],
                    },
                    genericTypeInstances: [
                      {
                        '@type': 'ParameterRangeGenericTypeReference',
                        parameterRangeGenericType: 'ex:SomeType1__generic_T',
                      },
                    ],
                  },
                },
                genericTypeInstances: [
                  {
                    '@type': 'ParameterRangeGenericTypeReference',
                    parameterRangeGenericType: 'ex:GEN_T',
                  },
                ],
              },
            }),
            objectLoader.createCompactedResource({
              range: {
                '@type': 'ParameterRangeGenericComponent',
                component: 'ex:SomeType2',
                genericTypeInstances: [
                  {
                    '@type': 'ParameterRangeGenericTypeReference',
                    parameterRangeGenericType: 'ex:GEN_T',
                  },
                ],
              },
            }),
            genericsContext,
          );
          expect(value).toBeTruthy();
          expectOutputProperties(value, objectLoader.createCompactedResource({
            '@type': {
              '@type': 'ParameterRangeGenericComponent',
              component: 'ex:SomeType1',
              genericTypeInstances: [
                {
                  '@type': 'ParameterRangeGenericTypeReference',
                  parameterRangeGenericType: 'ex:GEN_T',
                },
              ],
            },
            genericTypeInstancesComponentScope: 'ex:SomeType2',
            genericTypeInstances: [
              {
                '@type': 'ParameterRangeGenericTypeReference',
                parameterRangeGenericType: 'ex:GEN_T',
                parameterRangeGenericBindings: 'xsd:integer',
              },
            ],
          }));
        });

        it('should throw on a generic component with value a sub-type with invalid fixed generic', () => {
          genericsContext = new GenericsContext(objectLoader, [
            objectLoader.createCompactedResource('ex:GEN_T'),
          ]);
          genericsContext.bindings['ex:GEN_T'] = objectLoader.createCompactedResource('xsd:integer');

          expect(() => handler.captureType(
            objectLoader.createCompactedResource({
              '@type': {
                '@id': 'ex:SomeType1',
                extends: {
                  '@type': 'ParameterRangeGenericComponent',
                  component: {
                    '@id': 'ex:SomeType2',
                    genericTypeParameters: [
                      {
                        '@id': 'ex:SomeType2__generic_T',
                        range: 'xsd:boolean',
                      },
                    ],
                  },
                  genericTypeInstances: [
                    'xsd:integer',
                  ],
                },
              },
            }),
            objectLoader.createCompactedResource({
              range: {
                '@type': 'ParameterRangeGenericComponent',
                component: 'ex:SomeType2',
                genericTypeInstances: [
                  {
                    '@type': 'ParameterRangeGenericTypeReference',
                    parameterRangeGenericType: 'ex:GEN_T',
                  },
                ],
              },
            }),
            genericsContext,
            // eslint-disable-next-line max-len
          )).toThrow(/The value ".*" with types "ex:SomeType1" for parameter ".*" is not of required range type "\(ex:SomeType2\)<ex:GEN_T>"/u);
        });

        it(`should handle a generic component with value a sub-type with fixed generic with fixed param generic`, () => {
          genericsContext = new GenericsContext(objectLoader, []);

          const value = handler.captureType(
            objectLoader.createCompactedResource({
              '@type': {
                '@id': 'ex:SomeType1',
                extends: {
                  '@type': 'ParameterRangeGenericComponent',
                  component: {
                    '@id': 'ex:SomeType2',
                    genericTypeParameters: [
                      'ex:SomeType2__generic_T',
                    ],
                  },
                  genericTypeInstances: [
                    'xsd:integer',
                  ],
                },
              },
            }),
            objectLoader.createCompactedResource({
              range: {
                '@type': 'ParameterRangeGenericComponent',
                component: 'ex:SomeType2',
                genericTypeInstances: [
                  'xsd:integer',
                ],
              },
            }),
            genericsContext,
          );
          expect(value).toBeTruthy();
          expectOutputProperties(value, objectLoader.createCompactedResource({
            '@type': [ 'ex:SomeType1' ],
            genericTypeInstancesComponentScope: 'ex:SomeType2',
            genericTypeInstances: [
              'xsd:integer',
            ],
          }));
        });

        it(`should throw on a generic component with value a sub-type with fixed generic with incompatible fixed param generic`, () => {
          genericsContext = new GenericsContext(objectLoader, []);

          expect(() => handler.captureType(
            objectLoader.createCompactedResource({
              '@type': {
                '@id': 'ex:SomeType1',
                extends: {
                  '@type': 'ParameterRangeGenericComponent',
                  component: {
                    '@id': 'ex:SomeType2',
                    genericTypeParameters: [
                      'ex:SomeType2__generic_T',
                    ],
                  },
                  genericTypeInstances: [
                    'xsd:integer',
                  ],
                },
              },
            }),
            objectLoader.createCompactedResource({
              range: {
                '@type': 'ParameterRangeGenericComponent',
                component: 'ex:SomeType2',
                genericTypeInstances: [
                  'xsd:boolean',
                ],
              },
            }),
            genericsContext,
            // eslint-disable-next-line max-len
          )).toThrow(/The value ".*" with types "ex:SomeType1" for parameter ".*" is not of required range type "\(ex:SomeType2\).*#boolean"/u);
        });
      });
    });
  });

  describe('rangeToDisplayString', () => {
    it('handles undefined range', () => {
      // eslint-disable-next-line unicorn/no-useless-undefined
      expect(handler.rangeToDisplayString(undefined, genericsContext)).toEqual('any');
    });

    it('handles ParameterRangeUndefined range', () => {
      expect(handler.rangeToDisplayString(objectLoader.createCompactedResource({
        '@type': 'ParameterRangeUndefined',
      }), genericsContext)).toEqual('undefined');
    });
  });
});
