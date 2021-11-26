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
    describe('for literals', () => {
      it('should capture strings', () => {
        expect((<any>handler.captureType(objectLoader.createCompactedResource('"aaa"'),
          objectLoader.createCompactedResource({ range: IRIS_XSD.string }))).term.valueRaw)
          .toBeUndefined();
        expect((<any>handler.captureType(objectLoader.createCompactedResource('"qqseqfqefefù$^"'),
          objectLoader.createCompactedResource({ range: IRIS_XSD.string }))).term.valueRaw)
          .toBeUndefined();
      });

      it('should capture booleans', () => {
        expect((<any>handler.captureType(objectLoader.createCompactedResource('"true"'),
          objectLoader.createCompactedResource({ range: IRIS_XSD.boolean }))).term.valueRaw)
          .toEqual(true);
        expect((<any>handler.captureType(objectLoader.createCompactedResource('"false"'),
          objectLoader.createCompactedResource({ range: IRIS_XSD.boolean }))).term.valueRaw)
          .toEqual(false);
      });
      it('should error on invalid booleans', () => {
        expect(() => handler.captureType(objectLoader.createCompactedResource('"1"'),
          objectLoader.createCompactedResource({ range: IRIS_XSD.boolean, '@id': 'param' })))
          // eslint-disable-next-line max-len
          .toThrowError(/^The value "1" for parameter "param" is not of required range type "http:\/\/www.w3.org\/2001\/XMLSchema#boolean"/u);
      });

      it('should capture integers', () => {
        expect((<any>handler.captureType(objectLoader.createCompactedResource('"1"'),
          objectLoader.createCompactedResource({ range: IRIS_XSD.integer }))).term.valueRaw)
          .toEqual(1);
        expect((<any>handler.captureType(objectLoader.createCompactedResource('"1456789876"'),
          objectLoader.createCompactedResource({ range: IRIS_XSD.integer }))).term.valueRaw)
          .toEqual(1_456_789_876);
      });
      it('should error on invalid integers', () => {
        expect(() => handler.captureType(objectLoader.createCompactedResource('"a"'),
          objectLoader.createCompactedResource({ range: IRIS_XSD.integer, '@id': 'param' })))
          // eslint-disable-next-line max-len
          .toThrowError(/^The value "a" for parameter "param" is not of required range type "http:\/\/www.w3.org\/2001\/XMLSchema#integer"/u);
      });
      it('should error on invalid integers that are numbers', () => {
        expect(() => handler.captureType(objectLoader.createCompactedResource('"1.12"'),
          objectLoader.createCompactedResource({ range: IRIS_XSD.integer, '@id': 'param' })))
          // eslint-disable-next-line max-len
          .toThrowError(/^The value "1.12" for parameter "param" is not of required range type "http:\/\/www.w3.org\/2001\/XMLSchema#integer"/u);
      });
      it('should capture numbers', () => {
        expect((<any>handler.captureType(objectLoader.createCompactedResource('"1"'),
          objectLoader.createCompactedResource({ range: IRIS_XSD.number }))).term.valueRaw)
          .toEqual(1);
        expect((<any>handler.captureType(objectLoader.createCompactedResource('"456789876"'),
          objectLoader.createCompactedResource({ range: IRIS_XSD.number }))).term.valueRaw)
          .toEqual(456_789_876);
      });
      it('should capture ints', () => {
        expect((<any>handler.captureType(objectLoader.createCompactedResource('"1"'),
          objectLoader.createCompactedResource({ range: IRIS_XSD.int }))).term.valueRaw)
          .toEqual(1);
        expect((<any>handler.captureType(objectLoader.createCompactedResource('"456789876"'),
          objectLoader.createCompactedResource({ range: IRIS_XSD.int }))).term.valueRaw)
          .toEqual(456_789_876);
      });
      it('should capture bytes', () => {
        expect((<any>handler.captureType(objectLoader.createCompactedResource('"1"'),
          objectLoader.createCompactedResource({ range: IRIS_XSD.byte }))).term.valueRaw)
          .toEqual(1);
        expect((<any>handler.captureType(objectLoader.createCompactedResource('"456789876"'),
          objectLoader.createCompactedResource({ range: IRIS_XSD.byte }))).term.valueRaw)
          .toEqual(456_789_876);
      });
      it('should capture longs', () => {
        expect((<any>handler.captureType(objectLoader.createCompactedResource('"1"'),
          objectLoader.createCompactedResource({ range: IRIS_XSD.long }))).term.valueRaw)
          .toEqual(1);
        expect((<any>handler.captureType(objectLoader.createCompactedResource('"456789876"'),
          objectLoader.createCompactedResource({ range: IRIS_XSD.long }))).term.valueRaw)
          .toEqual(456_789_876);
      });

      it('should capture floats', () => {
        expect((<any>handler.captureType(objectLoader.createCompactedResource('"1"'),
          objectLoader.createCompactedResource({ range: IRIS_XSD.float }))).term.valueRaw)
          .toEqual(1);
        expect((<any>handler.captureType(objectLoader.createCompactedResource('"256.36"'),
          objectLoader.createCompactedResource({ range: IRIS_XSD.float }))).term.valueRaw)
          .toEqual(256.36);
      });
      it('should error on invalid floats', () => {
        expect(() => handler.captureType(objectLoader.createCompactedResource('"a"'),
          objectLoader.createCompactedResource({ range: IRIS_XSD.float, '@id': 'param' })))
          // eslint-disable-next-line max-len
          .toThrowError(/^The value "a" for parameter "param" is not of required range type "http:\/\/www.w3.org\/2001\/XMLSchema#float"/u);
      });
      it('should capture decimals', () => {
        expect((<any>handler.captureType(objectLoader.createCompactedResource('"1"'),
          objectLoader.createCompactedResource({ range: IRIS_XSD.decimal }))).term.valueRaw)
          .toEqual(1);
        expect((<any>handler.captureType(objectLoader.createCompactedResource('"256.36"'),
          objectLoader.createCompactedResource({ range: IRIS_XSD.decimal }))).term.valueRaw)
          .toEqual(256.36);
      });
      it('should capture doubles', () => {
        expect((<any>handler.captureType(objectLoader.createCompactedResource('"1"'),
          objectLoader.createCompactedResource({ range: IRIS_XSD.double }))).term.valueRaw)
          .toEqual(1);
        expect((<any>handler.captureType(objectLoader.createCompactedResource('"256.36"'),
          objectLoader.createCompactedResource({ range: IRIS_XSD.double }))).term.valueRaw)
          .toEqual(256.36);
      });

      it('should capture JSON', () => {
        expect((<any>handler.captureType(objectLoader.createCompactedResource('"1"'),
          objectLoader.createCompactedResource({ range: IRIS_RDF.JSON }))).term.valueRaw)
          .toEqual(1);
        expect((<any>handler.captureType(objectLoader.createCompactedResource('"{"a":"b"}"'),
          objectLoader.createCompactedResource({ range: IRIS_RDF.JSON }))).term.valueRaw)
          .toEqual({ a: 'b' });
      });
      it('should error on invalid JSON', () => {
        expect(() => handler.captureType(objectLoader.createCompactedResource('"{a:\\"b\\"}"'),
          objectLoader.createCompactedResource({ range: IRIS_RDF.JSON, '@id': 'param' })))
          .toThrowError(/^The value .* for parameter "param" is not of required range type/u);
      });
    });

    describe('for non-literals', () => {
      it('should handle IRIs as values for params with string range', () => {
        expect(handler.captureType(
          objectLoader.createCompactedResource({
            '@id': 'ex:abc',
          }),
          objectLoader.createCompactedResource({
            range: IRIS_XSD.string,
          }),
        )).toBeTruthy();
      });

      it('should ignore params without range', () => {
        expect(handler.captureType(
          objectLoader.createCompactedResource({
            '@id': 'ex:abc',
          }),
          objectLoader.createCompactedResource({}),
        )).toBeTruthy();

        expect(handler.captureType(
          objectLoader.createCompactedResource({
            '@id': 'ex:abc',
            '@type': 'ex:Type',
          }),
          objectLoader.createCompactedResource({}),
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
          // eslint-disable-next-line max-len
        )).toThrow(/^The value "ex:abc" with types "ex:SomeType" for parameter ".*" is not of required range type "ex:SomeTypeInvalid1 & ex:SomeTypeInvalid2"/u);
      });

      it('should handle param with undefined range and undefined value', () => {
        expect(handler.captureType(
          undefined,
          objectLoader.createCompactedResource({
            range: { '@type': 'ParameterRangeUndefined' },
          }),
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
          // eslint-disable-next-line max-len
        )).toThrow(/^The value "123" for parameter ".*" is not of required range type "true"/u);
      });
    });
  });

  describe('rangeToDisplayString', () => {
    it('handles undefined range', () => {
      // eslint-disable-next-line unicorn/no-useless-undefined
      expect(handler.rangeToDisplayString(undefined)).toEqual('any');
    });

    it('handles ParameterRangeUndefined range', () => {
      expect(handler.rangeToDisplayString(objectLoader.createCompactedResource({
        '@type': 'ParameterRangeUndefined',
      }))).toEqual('undefined');
    });
  });
});
