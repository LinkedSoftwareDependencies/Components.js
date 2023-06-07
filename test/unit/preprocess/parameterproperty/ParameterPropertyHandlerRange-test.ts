import * as fs from 'fs';
import type { NamedNode } from '@rdfjs/types';
import { DataFactory } from 'rdf-data-factory';
import { RdfObjectLoader } from 'rdf-object/lib/RdfObjectLoader';
import 'jest-rdf';
import type { Resource } from 'rdf-object/lib/Resource';
import { GenericsContext } from '../../../../lib/preprocess/GenericsContext';
import type {
  ILiteralAsTypeInterpretationResult,
  IParamValueConflict,
} from '../../../../lib/preprocess/parameterproperty/ParameterPropertyHandlerRange';
import {
  ParameterPropertyHandlerRange,
} from '../../../../lib/preprocess/parameterproperty/ParameterPropertyHandlerRange';
import { IRIS_RDF, IRIS_XSD } from '../../../../lib/rdf/Iris';
import type { ErrorResourcesContext, IErrorContext } from '../../../../lib/util/ErrorResourcesContext';

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
  let handler: ParameterPropertyHandlerRange;
  let interpretValueAsType: (
    value: Resource,
    type: Resource | NamedNode,
    errorContext: IErrorContext,
    genericsContext: GenericsContext,
  ) => ILiteralAsTypeInterpretationResult;
  let genericsContext: GenericsContext;
  beforeEach(async() => {
    objectLoader = new RdfObjectLoader({
      uniqueLiterals: true,
      context: JSON.parse(fs.readFileSync(`${__dirname}/../../../../components/context.jsonld`, 'utf8')),
    });
    await objectLoader.context;
    genericsContext = new GenericsContext(objectLoader, []);
    handler = new ParameterPropertyHandlerRange(objectLoader, true);
    // eslint-disable-next-line @typescript-eslint/dot-notation
    interpretValueAsType = handler['interpretValueAsType'];
  });

  describe('canHandle', () => {
    it('returns false for a param without range', () => {
      expect(handler.canHandle(
        undefined,
        objectLoader.createCompactedResource({}),
        objectLoader.createCompactedResource({}),
      )).toBeFalsy();
    });
  });

  describe('handle', () => {
    it('handles a valid value', () => {
      expect(() => handler.handle(
        objectLoader.createCompactedResource('"aaa"'),
        objectLoader.createCompactedResource({}),
        objectLoader.createCompactedResource({ range: IRIS_XSD.string }),
        objectLoader.createCompactedResource({}),
        genericsContext,
      )).not.toThrow();
    });

    it('throw on an invalid value', () => {
      expect(() => handler.handle(
        objectLoader.createCompactedResource('"aaa"'),
        objectLoader.createCompactedResource({}),
        objectLoader.createCompactedResource({ range: IRIS_XSD.integer }),
        objectLoader.createCompactedResource({}),
        genericsContext,
      )).toThrow(/The value "aaa" for parameter ".*" is not of required range type ".*integer"/u);
    });

    it('does not throw on an invalid value when type-checking is disabled', () => {
      handler = new ParameterPropertyHandlerRange(objectLoader, false);
      expect(() => handler.handle(
        objectLoader.createCompactedResource('"aaa"'),
        objectLoader.createCompactedResource({}),
        objectLoader.createCompactedResource({ range: IRIS_XSD.integer }),
        objectLoader.createCompactedResource({}),
        genericsContext,
      )).not.toThrow();
    });
  });

  describe('hasValueType', () => {
    const errorContext = {};

    describe('for literals', () => {
      it('should capture literal types by calling interpretValueAsType.', () => {
        const interpretValueAsTypeSpy = jest.spyOn((<any> handler), 'interpretValueAsType');
        const value = objectLoader.createCompactedResource('"1"');
        const type = objectLoader.createCompactedResource(IRIS_XSD.integer);
        handler.hasValueType(value, type, errorContext, genericsContext);
        expect(interpretValueAsTypeSpy).toHaveBeenCalledTimes(1);
        expect(interpretValueAsTypeSpy)
          .toHaveBeenCalledWith(value, type, { ...errorContext, value, type }, genericsContext);
        interpretValueAsTypeSpy.mockRestore();
      });

      it('should handle literal types within a union, by calling interpretValueAsType multiple times.', () => {
        const interpretValueAsTypeSpy = jest.spyOn((<any> handler), 'interpretValueAsType');
        const value = objectLoader.createCompactedResource('"def"');
        const type = objectLoader.createCompactedResource({
          '@type': 'ParameterRangeUnion',
          parameterRangeElements: [
            {
              '@type': 'ParameterRangeLiteral',
              parameterRangeValue: '"def"',
            },
          ],
        });
        const childType = type.properties.parameterRangeElements[0];
        handler.hasValueType(value, type, errorContext, genericsContext);
        expect(interpretValueAsTypeSpy).toHaveBeenCalledTimes(2);
        expect(interpretValueAsTypeSpy)
          .toHaveBeenNthCalledWith(1, value, type, { ...errorContext, value, type }, genericsContext);
        expect(interpretValueAsTypeSpy)
          .toHaveBeenLastCalledWith(value, childType, { ...errorContext, value, type: childType }, genericsContext);
        interpretValueAsTypeSpy.mockRestore();
      });
    });

    describe('for non-literals', () => {
      it('should always handle variables', () => {
        expect(handler.hasValueType(
          objectLoader.createCompactedResource({
            '@id': 'ex:abc',
            '@type': 'Variable',
          }),
          objectLoader.createCompactedResource(IRIS_XSD.string),
          errorContext,
          genericsContext,
        )).toBeUndefined();
      });

      it('should handle IRIs as values for params with string range', () => {
        expect(handler.hasValueType(
          objectLoader.createCompactedResource({
            '@id': 'ex:abc',
          }),
          objectLoader.createCompactedResource(IRIS_XSD.string),
          errorContext,
          genericsContext,
        )).toBeUndefined();
      });

      it('should ignore params without range', () => {
        expect(handler.hasValueType(
          objectLoader.createCompactedResource({
            '@id': 'ex:abc',
          }),
          undefined,
          errorContext,
          genericsContext,
        )).toBeUndefined();

        expect(handler.hasValueType(
          objectLoader.createCompactedResource({
            '@id': 'ex:abc',
            '@type': 'ex:Type',
          }),
          undefined,
          errorContext,
          genericsContext,
        )).toBeUndefined();
      });

      it('should return an error on param with range and missing value @type', () => {
        expect(handler.hasValueType(
          objectLoader.createCompactedResource({
            '@id': 'ex:abc',
          }),
          objectLoader.createCompactedResource('ex:RangeType'),
          errorContext,
          genericsContext,
        )).toEqual({
          description: `value is not a subtype of "ex:RangeType"`,
          context: {
            type: objectLoader.createCompactedResource('ex:RangeType'),
            value: objectLoader.createCompactedResource({
              '@id': 'ex:abc',
            }),
          },
        });
      });

      it('should return an error on param with range and unequal value @type', () => {
        expect(handler.hasValueType(
          objectLoader.createCompactedResource({
            '@id': 'ex:abc',
            range: 'ex:OtherType',
          }),
          objectLoader.createCompactedResource('ex:RangeType'),
          errorContext,
          genericsContext,
        )).toEqual({
          description: `value is not a subtype of "ex:RangeType"`,
          context: {
            type: objectLoader.createCompactedResource('ex:RangeType'),
            value: objectLoader.createCompactedResource({
              '@id': 'ex:abc',
              range: 'ex:OtherType',
            }),
          },
        });
      });

      it('should handle param with range and equal value @type', () => {
        expect(handler.hasValueType(
          objectLoader.createCompactedResource({
            '@id': 'ex:abc',
            '@type': 'ex:RangeType',
          }),
          objectLoader.createCompactedResource('ex:RangeType'),
          errorContext,
          genericsContext,
        )).toBeUndefined();
      });

      it('should handle param with range and a value @type that is a sub-type', () => {
        expect(handler.hasValueType(
          objectLoader.createCompactedResource({
            '@id': 'ex:abc',
            '@type': {
              '@id': 'ex:SubRangeType',
              '@type': 'ex:RangeType',
            },
          }),
          objectLoader.createCompactedResource('ex:RangeType'),
          errorContext,
          genericsContext,
        )).toBeUndefined();
      });

      it('should return an error on param with range and a value @type that is an incompatible sub-type', () => {
        expect(handler.hasValueType(
          objectLoader.createCompactedResource({
            '@id': 'ex:abc',
            '@type': {
              '@id': 'ex:SubRangeType',
              '@type': 'ex:RangeTypeOther',
            },
          }),
          objectLoader.createCompactedResource('ex:RangeType'),
          errorContext,
          genericsContext,
        )).toEqual({
          description: `value is not a subtype of "ex:RangeType"`,
          context: {
            type: objectLoader.createCompactedResource('ex:RangeType'),
            value: objectLoader.createCompactedResource({
              '@id': 'ex:abc',
              '@type': {
                '@id': 'ex:SubRangeType',
                '@type': 'ex:RangeTypeOther',
              },
            }),
          },
          causes: [
            {
              description: `value is not a subtype of "ex:RangeType"`,
              context: {
                type: objectLoader.createCompactedResource('ex:RangeType'),
                value: objectLoader.createCompactedResource({
                  '@id': 'ex:SubRangeType',
                  '@type': 'ex:RangeTypeOther',
                }),
              },
              causes: [
                {
                  description: `value is not a subtype of "ex:RangeType"`,
                  context: {
                    type: objectLoader.createCompactedResource('ex:RangeType'),
                    value: objectLoader.createCompactedResource('ex:RangeTypeOther'),
                  },
                },
              ],
            },
          ],
        });
      });

      it('should handle param with range and a value @type that is a sub-sub-type', () => {
        expect(handler.hasValueType(
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
          objectLoader.createCompactedResource('ex:RangeType'),
          errorContext,
          genericsContext,
        )).toBeUndefined();
      });

      it('should handle param with range and a value @type that is a sub-class', () => {
        expect(handler.hasValueType(
          objectLoader.createCompactedResource({
            '@id': 'ex:abc',
            'http://www.w3.org/2000/01/rdf-schema#subClassOf': {
              '@id': 'ex:SubRangeType',
              '@type': 'ex:RangeType',
            },
          }),
          objectLoader.createCompactedResource('ex:RangeType'),
          errorContext,
          genericsContext,
        )).toBeUndefined();
      });

      it('should return an error on param with range and a value @type that is an incompatible sub-class', () => {
        expect(handler.hasValueType(
          objectLoader.createCompactedResource({
            '@id': 'ex:abc',
            'http://www.w3.org/2000/01/rdf-schema#subClassOf': {
              '@id': 'ex:SubRangeType',
              '@type': 'ex:RangeTypeOther',
            },
          }),
          objectLoader.createCompactedResource('ex:RangeType'),
          errorContext,
          genericsContext,

        )).toEqual({
          description: `value is not a subtype of "ex:RangeType"`,
          context: {
            type: objectLoader.createCompactedResource('ex:RangeType'),
            value: objectLoader.createCompactedResource({
              '@id': 'ex:abc',
              'http://www.w3.org/2000/01/rdf-schema#subClassOf': {
                '@id': 'ex:SubRangeType',
                '@type': 'ex:RangeTypeOther',
              },
            }),
          },
          causes: [
            {
              description: `value is not a subtype of "ex:RangeType"`,
              context: {
                type: objectLoader.createCompactedResource('ex:RangeType'),
                value: objectLoader.createCompactedResource({
                  '@id': 'ex:SubRangeType',
                  '@type': 'ex:RangeTypeOther',
                }),
              },
              causes: [
                {
                  description: `value is not a subtype of "ex:RangeType"`,
                  context: {
                    type: objectLoader.createCompactedResource('ex:RangeType'),
                    value: objectLoader.createCompactedResource('ex:RangeTypeOther'),
                  },
                },
              ],
            },
          ],
        });
      });

      it('should handle ignore param with range ParameterRangeCollectEntries', () => {
        expect(handler.hasValueType(
          objectLoader.createCompactedResource({
            '@id': 'ex:abc',
            '@type': 'ex:SomeType',
          }),
          objectLoader.createCompactedResource({
            '@id': 'ex:RangeType',
            '@type': 'ParameterRangeCollectEntries',
          }),
          errorContext,
          genericsContext,
        )).toBeUndefined();
      });

      it('should handle union types with all valid types', () => {
        expect(handler.hasValueType(
          objectLoader.createCompactedResource({
            '@id': 'ex:abc',
            '@type': [ 'ex:SomeType1', 'ex:SomeType2' ],
          }),
          objectLoader.createCompactedResource({
            '@type': 'ParameterRangeUnion',
            parameterRangeElements: [
              {
                '@id': 'ex:SomeType1',
              },
              {
                '@id': 'ex:SomeType2',
              },
            ],
          }),
          errorContext,
          genericsContext,
        )).toBeUndefined();
      });

      it('should handle union types with one valid type', () => {
        expect(handler.hasValueType(
          objectLoader.createCompactedResource({
            '@id': 'ex:abc',
            '@type': 'ex:SomeType',
          }),
          objectLoader.createCompactedResource({
            '@type': 'ParameterRangeUnion',
            parameterRangeElements: [
              {
                '@id': 'ex:SomeTypeInvalid',
              },
              {
                '@id': 'ex:SomeType',
              },
            ],
          }),
          errorContext,
          genericsContext,
        )).toBeUndefined();
      });

      it('should return an error on union types with no valid type', () => {
        expect(handler.hasValueType(
          objectLoader.createCompactedResource({
            '@id': 'ex:abc',
            '@type': 'ex:SomeType',
          }),
          objectLoader.createCompactedResource({
            '@id': 'ex:type',
            '@type': 'ParameterRangeUnion',
            parameterRangeElements: [
              {
                '@id': 'ex:SomeTypeInvalid1',
              },
              {
                '@id': 'ex:SomeTypeInvalid2',
              },
            ],
          }),
          errorContext,
          genericsContext,
        )).toEqual({
          description: `no union values are valid`,
          context: {
            type: objectLoader.createCompactedResource({
              '@id': 'ex:type',
              '@type': 'ParameterRangeUnion',
              parameterRangeElements: [
                {
                  '@id': 'ex:SomeTypeInvalid1',
                },
                {
                  '@id': 'ex:SomeTypeInvalid2',
                },
              ],
            }),
            value: objectLoader.createCompactedResource({
              '@id': 'ex:abc',
              '@type': 'ex:SomeType',
            }),
          },
          causes: [
            {
              description: `value is not a subtype of "ex:SomeTypeInvalid1"`,
              context: {
                type: objectLoader.createCompactedResource('ex:SomeTypeInvalid1'),
                value: objectLoader.createCompactedResource({
                  '@id': 'ex:abc',
                  '@type': 'ex:SomeType',
                }),
              },
              causes: [
                {
                  description: `value is not a subtype of "ex:SomeTypeInvalid1"`,
                  context: {
                    type: objectLoader.createCompactedResource('ex:SomeTypeInvalid1'),
                    value: objectLoader.createCompactedResource('ex:SomeType'),
                  },
                },
              ],
            },
            {
              description: `value is not a subtype of "ex:SomeTypeInvalid2"`,
              context: {
                type: objectLoader.createCompactedResource('ex:SomeTypeInvalid2'),
                value: objectLoader.createCompactedResource({
                  '@id': 'ex:abc',
                  '@type': 'ex:SomeType',
                }),
              },
              causes: [
                {
                  description: `value is not a subtype of "ex:SomeTypeInvalid2"`,
                  context: {
                    type: objectLoader.createCompactedResource('ex:SomeTypeInvalid2'),
                    value: objectLoader.createCompactedResource('ex:SomeType'),
                  },
                },
              ],
            },
          ],
        });
      });

      it('should handle intersection types with all valid types', () => {
        expect(handler.hasValueType(
          objectLoader.createCompactedResource({
            '@id': 'ex:abc',
            '@type': [ 'ex:SomeType1', 'ex:SomeType2' ],
          }),
          objectLoader.createCompactedResource({
            '@type': 'ParameterRangeIntersection',
            parameterRangeElements: [
              {
                '@id': 'ex:SomeType1',
              },
              {
                '@id': 'ex:SomeType2',
              },
            ],
          }),
          errorContext,
          genericsContext,
        )).toBeUndefined();
      });

      it('should return an error on intersection types with one valid type', () => {
        expect(handler.hasValueType(
          objectLoader.createCompactedResource({
            '@id': 'ex:abc',
            '@type': 'ex:SomeType',
          }),
          objectLoader.createCompactedResource({
            '@type': 'ParameterRangeIntersection',
            parameterRangeElements: [
              {
                '@id': 'ex:SomeType',
              },
              {
                '@id': 'ex:SomeType2',
              },
            ],
          }),
          errorContext,
          genericsContext,
        )).toEqual({
          description: `not all intersection values are valid`,
          context: expect.anything(),
          causes: [
            {
              description: `value is not a subtype of "ex:SomeType2"`,
              context: expect.anything(),
              causes: [
                {
                  description: `value is not a subtype of "ex:SomeType2"`,
                  context: expect.anything(),
                },
              ],
            },
          ],
        });
      });

      it('should return an error on intersection types with no valid type', () => {
        expect(handler.hasValueType(
          objectLoader.createCompactedResource({
            '@id': 'ex:abc',
            '@type': 'ex:SomeType',
          }),
          objectLoader.createCompactedResource({
            '@type': 'ParameterRangeIntersection',
            parameterRangeElements: [
              {
                '@id': 'ex:SomeTypeInvalid1',
              },
              {
                '@id': 'ex:SomeTypeInvalid2',
              },
            ],
          }),
          errorContext,
          genericsContext,
        )).toEqual({
          description: `not all intersection values are valid`,
          context: expect.anything(),
          causes: [
            {
              description: `value is not a subtype of "ex:SomeTypeInvalid1"`,
              context: expect.anything(),
              causes: [
                {
                  description: `value is not a subtype of "ex:SomeTypeInvalid1"`,
                  context: expect.anything(),
                },
              ],
            },
            {
              description: `value is not a subtype of "ex:SomeTypeInvalid2"`,
              context: expect.anything(),
              causes: [
                {
                  description: `value is not a subtype of "ex:SomeTypeInvalid2"`,
                  context: expect.anything(),
                },
              ],
            },
          ],
        });
      });

      it('should handle param with undefined range and undefined value', () => {
        expect(handler.hasValueType(
          undefined,
          objectLoader.createCompactedResource({ '@type': 'ParameterRangeUndefined' }),
          errorContext,
          genericsContext,
        )).toBeUndefined();
      });

      it('should handle param with wildcard range and a value', () => {
        expect(handler.hasValueType(
          objectLoader.createCompactedResource('"abc"'),
          objectLoader.createCompactedResource({ '@type': 'ParameterRangeWildcard' }),
          errorContext,
          genericsContext,
        )).toBeUndefined();
      });

      it('should handle param with wildcard range and undefined value', () => {
        expect(handler.hasValueType(
          undefined,
          objectLoader.createCompactedResource({ '@type': 'ParameterRangeWildcard' }),
          errorContext,
          genericsContext,
        )).toBeUndefined();
      });

      it('should handle array type with valid types', () => {
        expect(handler.hasValueType(
          objectLoader.createCompactedResource({
            list: [
              {
                '@id': 'ex:abc',
                '@type': [ 'ex:SomeType1', 'ex:SomeType2' ],
              },
            ],
          }),
          objectLoader.createCompactedResource({
            '@type': 'ParameterRangeArray',
            parameterRangeValue: { '@id': 'ex:SomeType1' },
          }),
          errorContext,
          genericsContext,
        )).toBeUndefined();
      });

      it('should return an error on array type without list', () => {
        expect(handler.hasValueType(
          objectLoader.createCompactedResource({
            '@id': 'ex:abc',
            '@type': 'ex:SomeType1',
          }),
          objectLoader.createCompactedResource({
            '@type': 'ParameterRangeArray',
            parameterRangeValue: { '@id': 'ex:SomeType1' },
          }),
          errorContext,
          genericsContext,
        )).toEqual({
          description: `value is not an RDF list`,
          context: expect.anything(),
        });
      });

      it('should return an error on array type with invalid list element type', () => {
        expect(handler.hasValueType(
          objectLoader.createCompactedResource({
            list: [
              {
                '@id': 'ex:abc',
                '@type': 'ex:SomeType',
              },
            ],
          }),
          objectLoader.createCompactedResource({
            '@type': 'ParameterRangeArray',
            parameterRangeValue: { '@id': 'ex:SomeType1' },
          }),
          errorContext,
          genericsContext,
        )).toEqual({
          description: `one or more array values are invalid`,
          context: expect.anything(),
          causes: [
            {
              description: `value is not a subtype of "ex:SomeType1"`,
              context: expect.anything(),
              causes: [
                {
                  description: `value is not a subtype of "ex:SomeType1"`,
                  context: expect.anything(),
                },
              ],
            },
          ],
        });
      });

      it('should handle tuple type with single entry', () => {
        expect(handler.hasValueType(
          objectLoader.createCompactedResource({
            list: [
              {
                '@id': 'ex:abc',
                '@type': [ 'ex:SomeType1' ],
              },
            ],
          }),
          objectLoader.createCompactedResource({
            '@type': 'ParameterRangeTuple',
            parameterRangeElements: [
              { '@id': 'ex:SomeType1' },
            ],
          }),
          errorContext,
          genericsContext,
        )).toBeUndefined();
      });

      it('should return an error on tuple type with invalid single entry', () => {
        expect(handler.hasValueType(
          objectLoader.createCompactedResource({
            list: [
              {
                '@id': 'ex:abc',
                '@type': [ 'ex:SomeType1' ],
              },
            ],
          }),
          objectLoader.createCompactedResource({
            '@type': 'ParameterRangeTuple',
            parameterRangeElements: [
              { '@id': 'ex:SomeType' },
            ],
          }),
          errorContext,
          genericsContext,
        )).toEqual({
          description: `tuple element is invalid`,
          context: expect.anything(),
          causes: [
            {
              description: `value is not a subtype of "ex:SomeType"`,
              context: expect.anything(),
              causes: [
                {
                  description: `value is not a subtype of "ex:SomeType"`,
                  context: expect.anything(),
                },
              ],
            },
          ],
        });
      });

      it('should return an error on tuple type without value', () => {
        expect(handler.hasValueType(
          undefined,
          objectLoader.createCompactedResource({
            '@type': 'ParameterRangeTuple',
            parameterRangeElements: [
              { '@id': 'ex:SomeType' },
            ],
          }),
          errorContext,
          genericsContext,
        )).toEqual({
          description: `undefined value is not an RDF list`,
          context: expect.anything(),
        });
      });

      it('should return an error on tuple type without list', () => {
        expect(handler.hasValueType(
          objectLoader.createCompactedResource({}),
          objectLoader.createCompactedResource({
            '@type': 'ParameterRangeTuple',
            parameterRangeElements: [
              { '@id': 'ex:SomeType' },
            ],
          }),
          errorContext,
          genericsContext,
        )).toEqual({
          description: `value is not an RDF list`,
          context: expect.anything(),
        });
      });

      it('should handle tuple type with multiple entries', () => {
        expect(handler.hasValueType(
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
            '@type': 'ParameterRangeTuple',
            parameterRangeElements: [
              { '@id': 'ex:SomeType1' },
              { '@id': 'ex:SomeType2' },
              { '@id': 'ex:SomeType3' },
            ],
          }),
          errorContext,
          genericsContext,
        )).toBeUndefined();
      });

      it('should return an error on tuple type with invalid multiple entries', () => {
        expect(handler.hasValueType(
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
            '@type': 'ParameterRangeTuple',
            parameterRangeElements: [
              { '@id': 'ex:SomeType1' },
              { '@id': 'ex:SomeType2' },
              { '@id': 'ex:SomeType3' },
            ],
          }),
          errorContext,
          genericsContext,
        )).toEqual({
          description: `tuple element is invalid`,
          context: expect.anything(),
          causes: [
            {
              description: `value is not a subtype of "ex:SomeType3"`,
              context: expect.anything(),
              causes: [
                {
                  description: `value is not a subtype of "ex:SomeType3"`,
                  context: expect.anything(),
                },
              ],
            },
          ],
        });
      });

      it('should handle tuple type with single rest entry', () => {
        expect(handler.hasValueType(
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
            '@type': 'ParameterRangeTuple',
            parameterRangeElements: [
              {
                '@type': 'ParameterRangeRest',
                parameterRangeValue: { '@id': 'ex:SomeType1' },
              },
            ],
          }),
          errorContext,
          genericsContext,
        )).toBeUndefined();
      });

      it('should return an error on tuple type with invalid single rest entry', () => {
        expect(handler.hasValueType(
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
            '@type': 'ParameterRangeTuple',
            parameterRangeElements: [
              {
                '@type': 'ParameterRangeRest',
                parameterRangeValue: { '@id': 'ex:SomeType1' },
              },
            ],
          }),
          errorContext,
          genericsContext,
        )).toEqual({
          description: `tuple does not contain the expected number of elements`,
          context: expect.anything(),
        });
      });

      it('should handle tuple type with multiple rest entries', () => {
        expect(handler.hasValueType(
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
          }),
          errorContext,
          genericsContext,
        )).toBeUndefined();
      });

      it('should return an error on tuple type with invalid multiple rest entries', () => {
        expect(handler.hasValueType(
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
          }),
          errorContext,
          genericsContext,
        )).toEqual({
          description: `tuple does not contain the expected number of elements`,
          context: expect.anything(),
        });
      });

      it('should handle tuple type with complex entries', () => {
        expect(handler.hasValueType(
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
            '@type': 'ParameterRangeTuple',
            parameterRangeElements: [
              {
                '@type': 'ParameterRangeRest',
                parameterRangeValue: { '@id': 'ex:SomeType1' },
              },
              { '@id': 'ex:SomeType2' },
              { '@id': 'ex:SomeType3' },
            ],
          }),
          errorContext,
          genericsContext,
        )).toBeUndefined();
      });

      it('should handle a string literal type with valid types', () => {
        expect(handler.hasValueType(
          objectLoader.createCompactedResource('abc'),
          objectLoader.createCompactedResource({
            '@type': 'ParameterRangeLiteral',
            parameterRangeValue: 'abc',
          }),
          errorContext,
          genericsContext,
        )).toBeUndefined();
      });

      it('should handle a number literal type with valid types', () => {
        expect(handler.hasValueType(
          objectLoader.createCompactedResource(DF.literal('123', DF.namedNode(IRIS_XSD.integer))),
          objectLoader.createCompactedResource({
            '@type': 'ParameterRangeLiteral',
            parameterRangeValue: DF.literal('123', DF.namedNode(IRIS_XSD.integer)),
          }),
          errorContext,
          genericsContext,
        )).toBeUndefined();
      });

      it('should handle a boolean literal type with valid types', () => {
        expect(handler.hasValueType(
          objectLoader.createCompactedResource(DF.literal('true', DF.namedNode(IRIS_XSD.boolean))),
          objectLoader.createCompactedResource({
            '@type': 'ParameterRangeLiteral',
            parameterRangeValue: DF.literal('true', DF.namedNode(IRIS_XSD.boolean)),
          }),
          errorContext,
          genericsContext,
        )).toBeUndefined();
      });

      it('should return an error on a literal type with incompatible value', () => {
        expect(handler.hasValueType(
          objectLoader.createCompactedResource(DF.literal('123', DF.namedNode(IRIS_XSD.integer))),
          objectLoader.createCompactedResource({
            '@type': 'ParameterRangeLiteral',
            parameterRangeValue: DF.literal('true', DF.namedNode(IRIS_XSD.boolean)),
          }),
          errorContext,
          genericsContext,
        )).toEqual({
          description: `literal value is unequal`,
          context: expect.anything(),
        });
      });

      it('should handle a union over string literal types with valid types', () => {
        expect(handler.hasValueType(
          objectLoader.createCompactedResource('"def"'),
          objectLoader.createCompactedResource({
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
          }),
          errorContext,
          genericsContext,
        )).toBeUndefined();
      });

      it('should return an error on a union over string literal types with incompatible types', () => {
        expect(handler.hasValueType(
          objectLoader.createCompactedResource('"xyz"'),
          objectLoader.createCompactedResource({
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
          }),
          errorContext,
          genericsContext,
        )).toEqual({
          description: `no union values are valid`,
          context: expect.anything(),
          causes: [
            {
              description: `literal value is unequal`,
              context: expect.anything(),
            },
            {
              description: `literal value is unequal`,
              context: expect.anything(),
            },
          ],
        });
      });

      it('should handle keyof type with valid value', () => {
        expect(handler.hasValueType(
          objectLoader.createCompactedResource('"fieldB"'),
          objectLoader.createCompactedResource({
            '@type': 'ParameterRangeKeyof',
            parameterRangeValue: {
              '@id': 'ex:SomeType1',
              memberFields: [
                {
                  memberFieldName: '"fieldA"',
                  memberFieldRange: 'xsd:boolean',
                },
                {
                  memberFieldName: '"fieldB"',
                  memberFieldRange: 'xsd:boolean',
                },
              ],
            },
          }),
          errorContext,
          genericsContext,
        )).toBeUndefined();
      });

      it('should return an error on keyof type without valid value', () => {
        expect(handler.hasValueType(
          objectLoader.createCompactedResource('"fieldC"'),
          objectLoader.createCompactedResource({
            '@type': 'ParameterRangeKeyof',
            parameterRangeValue: {
              '@id': 'ex:SomeType1',
              memberFields: [
                {
                  memberFieldName: '"fieldA"',
                  range: 'xsd:boolean',
                },
                {
                  memberFieldName: '"fieldB"',
                  range: 'xsd:boolean',
                },
              ],
            },
          }),
          errorContext,
          genericsContext,
        )).toEqual({
          description: `keyof value is invalid`,
          context: expect.anything(),
          causes: [
            {
              description: `no union values are valid`,
              context: expect.anything(),
              causes: [
                {
                  description: `literal value is unequal`,
                  context: expect.anything(),
                },
                {
                  description: `literal value is unequal`,
                  context: expect.anything(),
                },
              ],
            },
          ],
        });
      });

      it('should handle indexed type with valid value', () => {
        expect(handler.hasValueType(
          objectLoader.createCompactedResource('"abc"'),
          objectLoader.createCompactedResource({
            '@type': 'ParameterRangeIndexed',
            parameterRangeIndexedObject: {
              '@id': 'ex:SomeType1',
              memberFields: [
                {
                  memberFieldName: '"fieldA"',
                  range: 'xsd:string',
                },
                {
                  memberFieldName: '"fieldB"',
                  range: 'xsd:boolean',
                },
              ],
            },
            parameterRangeIndexedIndex: {
              '@type': 'ParameterRangeLiteral',
              parameterRangeValue: '"fieldA"',
            },
          }),
          errorContext,
          genericsContext,
        )).toBeUndefined();
      });

      it('should handle indexed type with valid value for field without range', () => {
        expect(handler.hasValueType(
          objectLoader.createCompactedResource('"abc"'),
          objectLoader.createCompactedResource({
            '@type': 'ParameterRangeIndexed',
            parameterRangeIndexedObject: {
              '@id': 'ex:SomeType1',
              memberFields: [
                {
                  memberFieldName: '"fieldA"',
                },
                {
                  memberFieldName: '"fieldB"',
                  range: 'xsd:boolean',
                },
              ],
            },
            parameterRangeIndexedIndex: {
              '@type': 'ParameterRangeLiteral',
              parameterRangeValue: '"fieldA"',
            },
          }),
          errorContext,
          genericsContext,
        )).toBeUndefined();
      });

      it('should return an error on indexed type with invalid value', () => {
        expect(handler.hasValueType(
          objectLoader.createCompactedResource('"abc"'),
          objectLoader.createCompactedResource({
            '@type': 'ParameterRangeIndexed',
            parameterRangeIndexedObject: {
              '@id': 'ex:SomeType1',
              memberFields: [
                {
                  memberFieldName: '"fieldA"',
                  range: 'xsd:number',
                },
                {
                  memberFieldName: '"fieldB"',
                  range: 'xsd:boolean',
                },
              ],
            },
            parameterRangeIndexedIndex: {
              '@type': 'ParameterRangeLiteral',
              parameterRangeValue: '"fieldA"',
            },
          }),
          errorContext,
          genericsContext,
        )).toEqual({
          description: `indexed value is invalid`,
          context: expect.anything(),
          causes: [
            {
              description: `value is not a number`,
              context: expect.anything(),
            },
          ],
        });
      });

      it('should return an error on indexed type for an invalid field', () => {
        expect(handler.hasValueType(
          objectLoader.createCompactedResource('"abc"'),
          objectLoader.createCompactedResource({
            '@type': 'ParameterRangeIndexed',
            parameterRangeIndexedObject: {
              '@id': 'ex:SomeType1',
              memberFields: [
                {
                  memberFieldName: '"fieldA"',
                  range: 'xsd:number',
                },
                {
                  memberFieldName: '"fieldB"',
                  range: 'xsd:boolean',
                },
              ],
            },
            parameterRangeIndexedIndex: {
              '@type': 'ParameterRangeLiteral',
              parameterRangeValue: '"fieldC"',
            },
          }),
          errorContext,
          genericsContext,
        )).toEqual({
          description: `indexed index does not refer to a known field`,
          context: expect.anything(),
        });
      });

      it('should return an error on indexed type with unknown index type', () => {
        expect(handler.hasValueType(
          objectLoader.createCompactedResource('"abc"'),
          objectLoader.createCompactedResource({
            '@type': 'ParameterRangeIndexed',
            parameterRangeIndexedObject: {
              '@id': 'ex:SomeType1',
              memberFields: [
                {
                  memberFieldName: '"fieldA"',
                  range: 'xsd:number',
                },
                {
                  memberFieldName: '"fieldB"',
                  range: 'xsd:boolean',
                },
              ],
            },
            parameterRangeIndexedIndex: {
              '@type': 'ParameterRangeUnknown',
            },
          }),
          errorContext,
          genericsContext,
        )).toEqual({
          description: `indexed index type can not be understood`,
          context: expect.anything(),
        });
      });

      describe('with generics', () => {
        it('should handle an unbound generic type reference with a literal value', () => {
          genericsContext = new GenericsContext(objectLoader, [
            objectLoader.createCompactedResource('ex:GEN_T'),
          ]);

          expect(handler.hasValueType(
            objectLoader.createCompactedResource('"def"'),
            objectLoader.createCompactedResource({
              '@type': 'ParameterRangeGenericTypeReference',
              parameterRangeGenericType: 'ex:GEN_T',
            }),
            errorContext,
            genericsContext,
          )).toBeUndefined();
        });

        it('should return an error on an unknown generic type reference', () => {
          expect(handler.hasValueType(
            objectLoader.createCompactedResource('"def"'),
            objectLoader.createCompactedResource({
              '@type': 'ParameterRangeGenericTypeReference',
              parameterRangeGenericType: 'ex:GEN_T',
            }),
            errorContext,
            genericsContext,
          )).toEqual({
            description: `unknown generic <ex:GEN_T> is being referenced`,
            context: expect.anything(),
          });
        });

        it('should handle a bound generic type reference with a compatible literal value', () => {
          genericsContext = new GenericsContext(objectLoader, [
            objectLoader.createCompactedResource('ex:GEN_T'),
          ]);
          genericsContext.bindings['ex:GEN_T'] = objectLoader.createCompactedResource(IRIS_XSD.number);

          expect(handler.hasValueType(
            objectLoader.createCompactedResource(`"123"^^${IRIS_XSD.number}`),
            objectLoader.createCompactedResource({
              '@type': 'ParameterRangeGenericTypeReference',
              parameterRangeGenericType: 'ex:GEN_T',
            }),
            errorContext,
            genericsContext,
          )).toBeUndefined();
        });

        it('should handle a generic type reference with range with a compatible literal value', () => {
          genericsContext = new GenericsContext(objectLoader, [
            objectLoader.createCompactedResource({
              '@id': 'ex:GEN_T',
              range: IRIS_XSD.number,
            }),
          ]);

          expect(handler.hasValueType(
            objectLoader.createCompactedResource(`"123"^^${IRIS_XSD.number}`),
            objectLoader.createCompactedResource({
              '@type': 'ParameterRangeGenericTypeReference',
              parameterRangeGenericType: 'ex:GEN_T',
            }),
            errorContext,
            genericsContext,
          )).toBeUndefined();
        });

        it('should return an error on a bound generic type reference with an incompatible literal value', () => {
          genericsContext = new GenericsContext(objectLoader, [
            objectLoader.createCompactedResource('ex:GEN_T'),
          ]);
          genericsContext.bindings['ex:GEN_T'] = objectLoader.createCompactedResource(IRIS_XSD.number);

          expect(handler.hasValueType(
            objectLoader.createCompactedResource(`"true"^^${IRIS_XSD.boolean}`),
            objectLoader.createCompactedResource({
              '@type': 'ParameterRangeGenericTypeReference',
              parameterRangeGenericType: 'ex:GEN_T',
            }),
            errorContext,
            genericsContext,
          )).toEqual({
            description: `generic <ex:GEN_T> with existing range "http://www.w3.org/2001/XMLSchema#number" can not contain the given value`,
            context: expect.anything(),
            causes: [
              {
                description: `value is not a number`,
                context: expect.anything(),
              },
            ],
          });
        });

        it('should handle an unbound generic type reference with a component value', () => {
          genericsContext = new GenericsContext(objectLoader, [
            objectLoader.createCompactedResource('ex:GEN_T'),
          ]);

          expect(handler.hasValueType(
            objectLoader.createCompactedResource({
              '@id': 'ex:component',
              '@type': [ 'ex:SomeType1' ],
            }),
            objectLoader.createCompactedResource({
              '@type': 'ParameterRangeGenericTypeReference',
              parameterRangeGenericType: 'ex:GEN_T',
            }),
            errorContext,
            genericsContext,
          )).toBeUndefined();
        });

        it('should handle a bound generic type reference with a compatible component value', () => {
          genericsContext = new GenericsContext(objectLoader, [
            objectLoader.createCompactedResource('ex:GEN_T'),
          ]);
          genericsContext.bindings['ex:GEN_T'] = objectLoader.createCompactedResource('ex:SomeType1');

          expect(handler.hasValueType(
            objectLoader.createCompactedResource({
              '@id': 'ex:component',
              '@type': [ 'ex:SomeType1' ],
            }),
            objectLoader.createCompactedResource({
              '@type': 'ParameterRangeGenericTypeReference',
              parameterRangeGenericType: 'ex:GEN_T',
            }),
            errorContext,
            genericsContext,
          )).toBeUndefined();
        });

        it('should return an error on a bound generic type reference with an incompatible component value', () => {
          genericsContext = new GenericsContext(objectLoader, [
            objectLoader.createCompactedResource('ex:GEN_T'),
          ]);
          genericsContext.bindings['ex:GEN_T'] = objectLoader.createCompactedResource('ex:SomeType2');

          expect(handler.hasValueType(
            objectLoader.createCompactedResource({
              '@id': 'ex:component',
              '@type': [ 'ex:SomeType1' ],
            }),
            objectLoader.createCompactedResource({
              '@type': 'ParameterRangeGenericTypeReference',
              parameterRangeGenericType: 'ex:GEN_T',
            }),
            errorContext,
            genericsContext,
          )).toEqual({
            description: `generic <ex:GEN_T> with existing range "ex:SomeType2" can not contain the given value`,
            context: expect.anything(),
            causes: [
              {
                description: `value is not a subtype of "ex:SomeType2"`,
                context: expect.anything(),
                causes: [
                  {
                    description: `value is not a subtype of "ex:SomeType2"`,
                    context: expect.anything(),
                  },
                ],
              },
            ],
          });
        });

        it('should handle a bound generic type reference with a compatible undefined value', () => {
          genericsContext = new GenericsContext(objectLoader, [
            objectLoader.createCompactedResource('ex:GEN_T'),
          ]);
          genericsContext.bindings['ex:GEN_T'] = objectLoader
            .createCompactedResource({ '@type': 'ParameterRangeUndefined' });

          expect(handler.hasValueType(
            undefined,
            objectLoader.createCompactedResource({
              '@type': 'ParameterRangeGenericTypeReference',
              parameterRangeGenericType: 'ex:GEN_T',
            }),
            errorContext,
            genericsContext,
          )).toBeUndefined();
        });

        it('should return an error on a bound generic type reference with an incompatible undefined value', () => {
          genericsContext = new GenericsContext(objectLoader, [
            objectLoader.createCompactedResource('ex:GEN_T'),
          ]);
          genericsContext.bindings['ex:GEN_T'] = objectLoader
            .createCompactedResource({ '@type': 'ParameterRangeUndefined' });

          expect(handler.hasValueType(
            objectLoader.createCompactedResource(`"true"^^${IRIS_XSD.boolean}`),
            objectLoader.createCompactedResource({
              '@type': 'ParameterRangeGenericTypeReference',
              parameterRangeGenericType: 'ex:GEN_T',
            }),
            errorContext,
            genericsContext,
          )).toEqual({
            description: `generic <ex:GEN_T> with existing range "undefined" can not contain the given value`,
            context: expect.anything(),
            causes: [
              {
                description: expect.anything(),
                context: expect.anything(),
              },
            ],
          });
        });

        it('should handle a generic component without generic binding', () => {
          const value = objectLoader.createCompactedResource({
            '@type': [ 'ex:SomeType1' ],
          });
          const conflict = handler.hasValueType(
            value,
            objectLoader.createCompactedResource({
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
            }),
            errorContext,
            genericsContext,
          );
          expect(conflict).toBeUndefined();
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

        it('should return an error on a generic component without generic binding and undefined value', () => {
          expect(handler.hasValueType(
            undefined,
            objectLoader.createCompactedResource({
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
            }),
            errorContext,
            genericsContext,
          )).toEqual({
            description: `generic component is invalid`,
            context: expect.anything(),
            causes: [
              {
                description: `unknown parameter type`,
                context: expect.anything(),
              },
            ],
          });
        });

        it('should handle a generic component with generic binding', () => {
          genericsContext = new GenericsContext(objectLoader, [
            objectLoader.createCompactedResource('ex:GEN_T'),
          ]);
          genericsContext.bindings['ex:GEN_T'] = objectLoader.createCompactedResource('ex:SomeType2');

          const value = objectLoader.createCompactedResource({
            '@type': [ 'ex:SomeType1' ],
          });
          const conflict = handler.hasValueType(
            value,
            objectLoader.createCompactedResource({
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
            }),
            errorContext,
            genericsContext,
          );
          expect(conflict).toBeUndefined();
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

        it('should return an error on a generic component with an incompatible value', () => {
          genericsContext = new GenericsContext(objectLoader, [
            objectLoader.createCompactedResource('ex:GEN_T'),
          ]);
          genericsContext.bindings['ex:GEN_T'] = objectLoader.createCompactedResource('ex:SomeType2');

          expect(handler.hasValueType(
            objectLoader.createCompactedResource({
              '@type': [ 'ex:SomeType1' ],
            }),
            objectLoader.createCompactedResource({
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
            }),
            errorContext,
            genericsContext,
          )).toEqual({
            description: `generic component is invalid`,
            context: expect.anything(),
            causes: [
              {
                description: `value is not a subtype of "ex:SomeType2"`,
                context: expect.anything(),
                causes: [
                  {
                    description: `value is not a subtype of "ex:SomeType2"`,
                    context: expect.anything(),
                  },
                ],
              },
            ],
          });
        });

        it('should return an error on a generic component with an incompatible values', () => {
          genericsContext = new GenericsContext(objectLoader, [
            objectLoader.createCompactedResource('ex:GEN_T'),
            objectLoader.createCompactedResource('ex:GEN_U'),
          ]);
          genericsContext.bindings['ex:GEN_T'] = objectLoader.createCompactedResource('ex:SomeType2');
          genericsContext.bindings['ex:GEN_U'] = objectLoader.createCompactedResource('ex:SomeType2');

          expect(handler.hasValueType(
            objectLoader.createCompactedResource({
              '@type': [ 'ex:SomeType1' ],
            }),
            objectLoader.createCompactedResource({
              '@type': 'ParameterRangeGenericComponent',
              component: {
                '@id': 'ex:SomeType2',
                genericTypeParameters: [
                  'ex:SomeType2__generic_T',
                  'ex:SomeType2__generic_U',
                ],
              },
              genericTypeInstances: [
                {
                  '@type': 'ParameterRangeGenericTypeReference',
                  parameterRangeGenericType: 'ex:GEN_T',
                },
                {
                  '@type': 'ParameterRangeGenericTypeReference',
                  parameterRangeGenericType: 'ex:GEN_U',
                },
              ],
            }),
            errorContext,
            genericsContext,
          )).toEqual({
            description: `generic component is invalid`,
            context: expect.anything(),
            causes: [
              {
                description: `value is not a subtype of "ex:SomeType2"`,
                context: expect.anything(),
                causes: [
                  {
                    description: `value is not a subtype of "ex:SomeType2"`,
                    context: expect.anything(),
                  },
                ],
              },
            ],
          });
        });

        it('should handle a generic component with a direct type value', () => {
          const value = objectLoader.createCompactedResource({
            '@type': [ 'ex:SomeType1' ],
          });
          const conflict = handler.hasValueType(
            value,
            objectLoader.createCompactedResource({
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
            }),
            errorContext,
            genericsContext,
          );
          expect(conflict).toBeUndefined();
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

        it('should use manual generics on a generic component with config that already has manual generics set', () => {
          genericsContext = new GenericsContext(objectLoader, [
            objectLoader.createCompactedResource('ex:GEN_T'),
          ]);
          genericsContext.bindings['ex:GEN_T'] = objectLoader.createCompactedResource('ex:SomeType2');

          const value = objectLoader.createCompactedResource({
            '@type': [ 'ex:SomeType1' ],
            genericTypeInstances: [
              {
                type: 'ParameterRangeGenericTypeReference',
                parameterRangeGenericType: 'ex:GEN_T',
                parameterRangeGenericBindings: undefined,
              },
            ],
          });
          const conflict = handler.hasValueType(
            value,
            objectLoader.createCompactedResource({
              '@type': 'ParameterRangeGenericComponent',
              component: 'ex:SomeType1',
              genericTypeInstances: [
                {
                  '@type': 'ParameterRangeGenericTypeReference',
                  parameterRangeGenericType: 'ex:GEN_T',
                },
              ],
            }),
            errorContext,
            genericsContext,
          );
          expect(conflict).toBeUndefined();
          expectOutputProperties(value, objectLoader.createCompactedResource({
            '@type': [ 'ex:SomeType1' ],
            genericTypeInstances: [
              {
                type: 'ParameterRangeGenericTypeReference',
                parameterRangeGenericType: 'ex:GEN_T',
                parameterRangeGenericBindings: undefined,
              },
            ],
          }));
        });

        it('should return an error on a generic component without parameterRangeGenericType value', () => {
          genericsContext = new GenericsContext(objectLoader, [
            objectLoader.createCompactedResource('ex:GEN_T'),
          ]);
          genericsContext.bindings['ex:GEN_T'] = objectLoader.createCompactedResource('ex:SomeType2');

          expect(() => handler.hasValueType(
            objectLoader.createCompactedResource({
              '@type': [ 'ex:SomeType1' ],
            }),
            objectLoader.createCompactedResource({
              '@type': 'ParameterRangeGenericComponent',
              component: 'ex:SomeType1',
              genericTypeInstances: [
                {
                  '@type': 'ParameterRangeGenericTypeReference',
                },
              ],
            }),
            errorContext,
            genericsContext,
          )).toThrow(`Invalid generic type instance in a ParameterRangeGenericComponent was detected: missing parameterRangeGenericType property.`);
        });

        it('should handle a generic component with value a sub-type with fixed generic', () => {
          genericsContext = new GenericsContext(objectLoader, [
            objectLoader.createCompactedResource('ex:GEN_T'),
          ]);
          genericsContext.bindings['ex:GEN_T'] = objectLoader.createCompactedResource('xsd:integer');

          const value = objectLoader.createCompactedResource({
            '@type': {
              '@id': 'ex:SomeType1',
              extends: {
                '@type': 'GenericComponentExtension',
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
          });
          const conflict = handler.hasValueType(
            value,
            objectLoader.createCompactedResource({
              '@type': 'ParameterRangeGenericComponent',
              component: 'ex:SomeType2',
              genericTypeInstances: [
                {
                  '@type': 'ParameterRangeGenericTypeReference',
                  parameterRangeGenericType: 'ex:GEN_T',
                },
              ],
            }),
            errorContext,
            genericsContext,
          );
          expect(conflict).toBeUndefined();
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

          const value = objectLoader.createCompactedResource({
            '@type': {
              '@id': 'ex:SomeType1',
              extends: {
                '@type': 'GenericComponentExtension',
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
          });
          const conflict = handler.hasValueType(
            value,
            objectLoader.createCompactedResource({
              '@type': 'ParameterRangeGenericComponent',
              component: 'ex:SomeType2',
              genericTypeInstances: [
                {
                  '@type': 'ParameterRangeGenericTypeReference',
                  parameterRangeGenericType: 'ex:GEN_T',
                },
              ],
            }),
            errorContext,
            genericsContext,
          );
          expect(conflict).toBeUndefined();
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

        it('should return an error on a generic component with value a sub-type with incompat fixed generic', () => {
          genericsContext = new GenericsContext(objectLoader, [
            objectLoader.createCompactedResource('ex:GEN_T'),
          ]);
          genericsContext.bindings['ex:GEN_T'] = objectLoader.createCompactedResource('xsd:integer');

          expect(handler.hasValueType(
            objectLoader.createCompactedResource({
              '@type': {
                '@id': 'ex:SomeType1',
                extends: {
                  '@type': 'GenericComponentExtension',
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
              '@type': 'ParameterRangeGenericComponent',
              component: 'ex:SomeType2',
              genericTypeInstances: [
                {
                  '@type': 'ParameterRangeGenericTypeReference',
                  parameterRangeGenericType: 'ex:GEN_T',
                },
              ],
            }),
            errorContext,
            genericsContext,
          )).toEqual({
            description: `generic component is invalid`,
            context: expect.anything(),
            causes: [
              {
                description: `value is not a subtype of "ex:SomeType2"`,
                context: expect.anything(),
                causes: [
                  {
                    description: `invalid parameter bindings for generic type instances for generic component extension of "ex:SomeType2"`,
                    context: expect.anything(),
                    causes: [
                      {
                        description: `invalid binding for generic <ex:SomeType2__generic_T>`,
                        context: expect.anything(),
                        causes: [
                          {
                            description: `generic <ex:SomeType2__generic_T> with existing range "http://www.w3.org/2001/XMLSchema#boolean" can not be bound to range "http://www.w3.org/2001/XMLSchema#integer"`,
                            context: expect.anything(),
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          });
        });

        it('should handle a generic component with value a sub-type with unbound generic', () => {
          genericsContext = new GenericsContext(objectLoader, [
            objectLoader.createCompactedResource('ex:GEN_T'),
          ]);
          genericsContext.bindings['ex:GEN_T'] = objectLoader.createCompactedResource('xsd:integer');

          const value = objectLoader.createCompactedResource({
            '@type': {
              '@type': 'GenericComponentExtension',
              component: {
                '@id': 'ex:SomeType1',
                genericTypeParameters: [
                  'ex:SomeType1__generic_T',
                ],
                extends: {
                  '@type': 'GenericComponentExtension',
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
          });
          const conflict = handler.hasValueType(
            value,
            objectLoader.createCompactedResource({
              '@type': 'ParameterRangeGenericComponent',
              component: 'ex:SomeType2',
              genericTypeInstances: [
                {
                  '@type': 'ParameterRangeGenericTypeReference',
                  parameterRangeGenericType: 'ex:GEN_T',
                },
              ],
            }),
            errorContext,
            genericsContext,
          );
          expect(conflict).toBeUndefined();
          expectOutputProperties(value, objectLoader.createCompactedResource({
            '@type': {
              '@type': 'GenericComponentExtension',
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

        it('should return an error on a generic component with value a sub-type with invalid fixed generic', () => {
          genericsContext = new GenericsContext(objectLoader, [
            objectLoader.createCompactedResource('ex:GEN_T'),
          ]);
          genericsContext.bindings['ex:GEN_T'] = objectLoader.createCompactedResource('xsd:integer');

          expect(handler.hasValueType(
            objectLoader.createCompactedResource({
              '@type': {
                '@id': 'ex:SomeType1',
                extends: {
                  '@type': 'GenericComponentExtension',
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
              '@type': 'ParameterRangeGenericComponent',
              component: 'ex:SomeType2',
              genericTypeInstances: [
                {
                  '@type': 'ParameterRangeGenericTypeReference',
                  parameterRangeGenericType: 'ex:GEN_T',
                },
              ],
            }),
            errorContext,
            genericsContext,
          )).toEqual({
            description: `generic component is invalid`,
            context: expect.anything(),
            causes: [
              {
                description: `value is not a subtype of "ex:SomeType2"`,
                context: expect.anything(),
                causes: [
                  {
                    description: `invalid wrapped bindings for generic type instances for generic component extension of "ex:SomeType2"`,
                    context: expect.anything(),
                    causes: [
                      {
                        description: `invalid binding for generic <ex:SomeType2__generic_T>`,
                        context: expect.anything(),
                        causes: [
                          {
                            description: `generic <ex:SomeType2__generic_T> with existing range "http://www.w3.org/2001/XMLSchema#boolean" can not be bound to range "http://www.w3.org/2001/XMLSchema#integer"`,
                            context: expect.anything(),
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          });
        });

        it(`should handle a generic component with value a sub-type with fixed generic with fixed param generic`, () => {
          genericsContext = new GenericsContext(objectLoader, []);

          const value = objectLoader.createCompactedResource({
            '@type': {
              '@id': 'ex:SomeType1',
              extends: {
                '@type': 'GenericComponentExtension',
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
          });
          const conflict = handler.hasValueType(
            value,
            objectLoader.createCompactedResource({
              '@type': 'ParameterRangeGenericComponent',
              component: 'ex:SomeType2',
              genericTypeInstances: [
                'xsd:integer',
              ],
            }),
            errorContext,
            genericsContext,
          );
          expect(conflict).toBeUndefined();
          expectOutputProperties(value, objectLoader.createCompactedResource({
            '@type': [ 'ex:SomeType1' ],
            genericTypeInstancesComponentScope: 'ex:SomeType2',
            genericTypeInstances: [
              'xsd:integer',
            ],
          }));
        });

        it(`should handle a generic component with value a sub-type with fixed generic with wildcard param generic`, () => {
          genericsContext = new GenericsContext(objectLoader, []);

          const value = objectLoader.createCompactedResource({
            '@type': {
              '@id': 'ex:SomeType1',
              extends: {
                '@type': 'GenericComponentExtension',
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
          });
          const conflict = handler.hasValueType(
            value,
            objectLoader.createCompactedResource({
              '@type': 'ParameterRangeGenericComponent',
              component: 'ex:SomeType2',
              genericTypeInstances: [
                {
                  '@type': 'ParameterRangeWildcard',
                },
              ],
            }),
            errorContext,
            genericsContext,
          );
          expect(conflict).toBeUndefined();
          expectOutputProperties(value, objectLoader.createCompactedResource({
            '@type': [ 'ex:SomeType1' ],
            genericTypeInstancesComponentScope: 'ex:SomeType2',
            genericTypeInstances: [
              {
                '@type': 'ParameterRangeWildcard',
              },
            ],
          }));
        });

        it(`should handle a generic component with value a sub-type with fixed generic with generic component as param generic`, () => {
          genericsContext = new GenericsContext(objectLoader, []);

          const value = objectLoader.createCompactedResource({
            '@type': {
              '@id': 'ex:SomeType1',
              extends: {
                '@type': 'GenericComponentExtension',
                component: {
                  '@id': 'ex:SomeType2',
                  genericTypeParameters: [
                    'ex:SomeType2__generic_T',
                  ],
                },
                genericTypeInstances: [
                  {
                    '@type': 'ParameterRangeGenericComponent',
                    component: 'ex:InnerType',
                    genericTypeInstances: [
                      'xsd:integer',
                    ],
                  },
                ],
              },
            },
          });
          const conflict = handler.hasValueType(
            value,
            objectLoader.createCompactedResource({
              '@type': 'ParameterRangeGenericComponent',
              component: 'ex:SomeType2',
              genericTypeInstances: [
                {
                  '@type': 'ParameterRangeGenericComponent',
                  component: 'ex:InnerType',
                  genericTypeInstances: [
                    'xsd:integer',
                  ],
                },
              ],
            }),
            errorContext,
            genericsContext,
          );
          expect(conflict).toBeUndefined();
          expectOutputProperties(value, objectLoader.createCompactedResource({
            '@type': [ 'ex:SomeType1' ],
            genericTypeInstancesComponentScope: 'ex:SomeType2',
            genericTypeInstances: [
              {
                '@type': 'ParameterRangeGenericComponent',
                component: 'ex:InnerType',
                genericTypeInstances: [
                  'xsd:integer',
                ],
              },
            ],
          }));
        });

        it(`should return an error on a generic component with value a sub-type with fixed generic with incompatible fixed param generic`, () => {
          genericsContext = new GenericsContext(objectLoader, []);

          expect(handler.hasValueType(
            objectLoader.createCompactedResource({
              '@type': {
                '@id': 'ex:SomeType1',
                extends: {
                  '@type': 'GenericComponentExtension',
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
              '@type': 'ParameterRangeGenericComponent',
              component: 'ex:SomeType2',
              genericTypeInstances: [
                'xsd:boolean',
              ],
            }),
            errorContext,
            genericsContext,
          )).toEqual({
            description: `generic component is invalid`,
            context: expect.anything(),
            causes: [
              {
                description: `value is not a subtype of "ex:SomeType2"`,
                context: expect.anything(),
                causes: [
                  {
                    description: `invalid binding for generic type <ex:SomeType2__generic_T> in generic component extension of "ex:SomeType2": existing range "http://www.w3.org/2001/XMLSchema#integer" can not be bound to range "http://www.w3.org/2001/XMLSchema#boolean"`,
                    context: expect.anything(),
                  },
                ],
              },
            ],
          });
        });

        it(`should return an error on a generic component with value a sub-type with fixed generic with incompatible generic components as param generic`, () => {
          genericsContext = new GenericsContext(objectLoader, []);

          expect(handler.hasValueType(
            objectLoader.createCompactedResource({
              '@type': {
                '@id': 'ex:SomeType1',
                extends: {
                  '@type': 'GenericComponentExtension',
                  component: {
                    '@id': 'ex:SomeType2',
                    genericTypeParameters: [
                      'ex:SomeType2__generic_T',
                    ],
                  },
                  genericTypeInstances: [
                    {
                      '@type': 'ParameterRangeGenericComponent',
                      component: 'ex:InnerType',
                      genericTypeInstances: [
                        'xsd:integer',
                      ],
                    },
                  ],
                },
              },
            }),
            objectLoader.createCompactedResource({
              '@type': 'ParameterRangeGenericComponent',
              component: 'ex:SomeType2',
              genericTypeInstances: [
                {
                  '@type': 'ParameterRangeGenericComponent',
                  component: 'ex:InnerType',
                  genericTypeInstances: [
                    'xsd:boolean',
                  ],
                },
              ],
            }),
            errorContext,
            genericsContext,
          )).toEqual({
            description: `generic component is invalid`,
            context: expect.anything(),
            causes: [
              {
                description: `value is not a subtype of "ex:SomeType2"`,
                context: expect.anything(),
                causes: [
                  {
                    description: `invalid binding for generic type <ex:SomeType2__generic_T> in generic component extension of "ex:SomeType2": existing range "(ex:InnerType)<http://www.w3.org/2001/XMLSchema#integer>" can not be bound to range "(ex:InnerType)<http://www.w3.org/2001/XMLSchema#boolean>"`,
                    context: expect.anything(),
                  },
                ],
              },
            ],
          });
        });
      });
    });
  });

  describe('interpretValueAsType', () => {
    const errorContext = {};
    const successResult = { match: true, value: undefined };

    it('should capture strings', () => {
      const value1 = objectLoader.createCompactedResource('"aaa"');
      expect(interpretValueAsType(value1,
        objectLoader.createCompactedResource(IRIS_XSD.string),
        errorContext,
        genericsContext)).toEqual(successResult);
      expect((<any> value1.term).valueRaw).toBeUndefined();

      const value2 = objectLoader.createCompactedResource('"qqseqfqefefù$^"');
      expect(interpretValueAsType(value2,
        objectLoader.createCompactedResource(IRIS_XSD.string),
        errorContext,
        genericsContext)).toEqual(successResult);
      expect((<any> value2.term).valueRaw).toBeUndefined();
    });

    it('should capture booleans', () => {
      const value1 = objectLoader.createCompactedResource('"true"');
      expect(interpretValueAsType(value1,
        objectLoader.createCompactedResource(IRIS_XSD.boolean),
        errorContext,
        genericsContext)).toEqual(successResult);
      expect((<any> value1.term).valueRaw).toEqual(true);

      const value2 = objectLoader.createCompactedResource('"false"');
      expect(interpretValueAsType(value2,
        objectLoader.createCompactedResource(IRIS_XSD.boolean),
        errorContext,
        genericsContext)).toEqual(successResult);
      expect((<any> value2.term).valueRaw).toEqual(false);
    });

    it('should error on invalid booleans', () => {
      expect(interpretValueAsType(objectLoader.createCompactedResource('"1"'),
        objectLoader.createCompactedResource(IRIS_XSD.boolean),
        errorContext,
        genericsContext))
        .toEqual({
          match: true,
          value: {
            description: `value must either be "true" or "false"`,
            context: errorContext,
          },
        });
    });

    it('should capture integers', () => {
      const value1 = objectLoader.createCompactedResource('"1"');
      expect(interpretValueAsType(value1,
        objectLoader.createCompactedResource(IRIS_XSD.integer),
        errorContext,
        genericsContext)).toEqual(successResult);
      expect((<any> value1.term).valueRaw).toEqual(1);

      const value2 = objectLoader.createCompactedResource('"1456789876"');
      expect(interpretValueAsType(value2,
        objectLoader.createCompactedResource(IRIS_XSD.integer),
        errorContext,
        genericsContext)).toEqual(successResult);
      expect((<any> value2.term).valueRaw).toEqual(1_456_789_876);
    });

    it('should error on invalid integers', () => {
      expect(interpretValueAsType(objectLoader.createCompactedResource('"a"'),
        objectLoader.createCompactedResource(IRIS_XSD.integer),
        errorContext,
        genericsContext))
        .toEqual({
          match: true,
          value: {
            description: `value is not a number`,
            context: errorContext,
          },
        });
    });

    it('should error on invalid integers that are numbers', () => {
      expect(interpretValueAsType(objectLoader.createCompactedResource('"1.12"'),
        objectLoader.createCompactedResource(IRIS_XSD.integer),
        errorContext,
        genericsContext))
        .toEqual({
          match: true,
          value: {
            description: `value can not be a float`,
            context: errorContext,
          },
        });
    });
    it('should capture numbers', () => {
      const value1 = objectLoader.createCompactedResource('"1"');
      expect(interpretValueAsType(value1,
        objectLoader.createCompactedResource(IRIS_XSD.number),
        errorContext,
        genericsContext)).toEqual(successResult);
      expect((<any> value1.term).valueRaw).toEqual(1);

      const value2 = objectLoader.createCompactedResource('"1456789876"');
      expect(interpretValueAsType(value2,
        objectLoader.createCompactedResource(IRIS_XSD.number),
        errorContext,
        genericsContext)).toEqual(successResult);
      expect((<any> value2.term).valueRaw).toEqual(1_456_789_876);
    });
    it('should capture ints', () => {
      const value1 = objectLoader.createCompactedResource('"1"');
      expect(interpretValueAsType(value1,
        objectLoader.createCompactedResource(IRIS_XSD.int),
        errorContext,
        genericsContext)).toEqual(successResult);
      expect((<any> value1.term).valueRaw).toEqual(1);

      const value2 = objectLoader.createCompactedResource('"1456789876"');
      expect(interpretValueAsType(value2,
        objectLoader.createCompactedResource(IRIS_XSD.int),
        errorContext,
        genericsContext)).toEqual(successResult);
      expect((<any> value2.term).valueRaw).toEqual(1_456_789_876);
    });
    it('should capture bytes', () => {
      const value1 = objectLoader.createCompactedResource('"1"');
      expect(interpretValueAsType(value1,
        objectLoader.createCompactedResource(IRIS_XSD.byte),
        errorContext,
        genericsContext)).toEqual(successResult);
      expect((<any> value1.term).valueRaw).toEqual(1);

      const value2 = objectLoader.createCompactedResource('"1456789876"');
      expect(interpretValueAsType(value2,
        objectLoader.createCompactedResource(IRIS_XSD.byte),
        errorContext,
        genericsContext)).toEqual(successResult);
      expect((<any> value2.term).valueRaw).toEqual(1_456_789_876);
    });
    it('should capture longs', () => {
      const value1 = objectLoader.createCompactedResource('"1"');
      expect(interpretValueAsType(value1,
        objectLoader.createCompactedResource(IRIS_XSD.long),
        errorContext,
        genericsContext)).toEqual(successResult);
      expect((<any> value1.term).valueRaw).toEqual(1);

      const value2 = objectLoader.createCompactedResource('"1456789876"');
      expect(interpretValueAsType(value2,
        objectLoader.createCompactedResource(IRIS_XSD.long),
        errorContext,
        genericsContext)).toEqual(successResult);
      expect((<any> value2.term).valueRaw).toEqual(1_456_789_876);
    });

    it('should capture floats', () => {
      const value1 = objectLoader.createCompactedResource('"1"');
      expect(interpretValueAsType(value1,
        objectLoader.createCompactedResource(IRIS_XSD.float),
        errorContext,
        genericsContext)).toEqual(successResult);
      expect((<any> value1.term).valueRaw).toEqual(1);

      const value2 = objectLoader.createCompactedResource('"256.36"');
      expect(interpretValueAsType(value2,
        objectLoader.createCompactedResource(IRIS_XSD.float),
        errorContext,
        genericsContext)).toEqual(successResult);
      expect((<any> value2.term).valueRaw).toEqual(256.36);
    });

    it('should error on invalid floats', () => {
      expect(interpretValueAsType(objectLoader.createCompactedResource('"a"'),
        objectLoader.createCompactedResource(IRIS_XSD.float),
        errorContext,
        genericsContext))
        .toEqual({
          match: true,
          value: {
            description: `value is not a number`,
            context: errorContext,
          },
        });
    });
    it('should capture decimals', () => {
      const value1 = objectLoader.createCompactedResource('"1"');
      expect(interpretValueAsType(value1,
        objectLoader.createCompactedResource(IRIS_XSD.decimal),
        errorContext,
        genericsContext)).toEqual(successResult);
      expect((<any> value1.term).valueRaw).toEqual(1);

      const value2 = objectLoader.createCompactedResource('"256.36"');
      expect(interpretValueAsType(value2,
        objectLoader.createCompactedResource(IRIS_XSD.decimal),
        errorContext,
        genericsContext)).toEqual(successResult);
      expect((<any> value2.term).valueRaw).toEqual(256.36);
    });
    it('should capture doubles', () => {
      const value1 = objectLoader.createCompactedResource('"1"');
      expect(interpretValueAsType(value1,
        objectLoader.createCompactedResource(IRIS_XSD.double),
        errorContext,
        genericsContext)).toEqual(successResult);
      expect((<any> value1.term).valueRaw).toEqual(1);

      const value2 = objectLoader.createCompactedResource('"256.36"');
      expect(interpretValueAsType(value2,
        objectLoader.createCompactedResource(IRIS_XSD.double),
        errorContext,
        genericsContext)).toEqual(successResult);
      expect((<any> value2.term).valueRaw).toEqual(256.36);
    });

    it('should capture JSON', () => {
      const value1 = objectLoader.createCompactedResource('"1"');
      expect(interpretValueAsType(value1,
        objectLoader.createCompactedResource(IRIS_RDF.JSON),
        errorContext,
        genericsContext)).toEqual(successResult);
      expect((<any> value1.term).valueRaw).toEqual(1);

      const value2 = objectLoader.createCompactedResource('"{"a":"b"}"');
      expect(interpretValueAsType(value2,
        objectLoader.createCompactedResource(IRIS_RDF.JSON),
        errorContext,
        genericsContext)).toEqual(successResult);
      expect((<any> value2.term).valueRaw).toEqual({ a: 'b' });
    });

    it('should error on invalid JSON', () => {
      expect(interpretValueAsType(objectLoader.createCompactedResource('"{a:\\"b\\"}"'),
        objectLoader.createCompactedResource(IRIS_RDF.JSON),
        errorContext,
        genericsContext))
        .toEqual({
          match: true,
          value: {
            description: `JSON parse exception: Unexpected token a in JSON at position 1`,
            context: errorContext,
          },
        });
    });

    it('should not match Literal values with non-primitive or JSON types.', () => {
      // Test for type ParameterRangeWildcard
      expect(interpretValueAsType(
        objectLoader.createCompactedResource('"abc"'),
        objectLoader.createCompactedResource({ '@type': 'ParameterRangeWildcard' }),
        errorContext,
        genericsContext,
      )).toEqual({
        match: false,
      });
      // Test for type ParameterRangeUnion
      expect(interpretValueAsType(
        objectLoader.createCompactedResource('"def"'),
        objectLoader.createCompactedResource({
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
        }),
        errorContext,
        genericsContext,
      )).toEqual({
        match: false,
      });
    });
  });

  describe('throwIncorrectTypeError', () => {
    const conflict: IParamValueConflict = { description: 'cause', context: {}};

    it('handles an undefined value', () => {
      expect(() => ParameterPropertyHandlerRange.throwIncorrectTypeError(
        undefined,
        objectLoader.createCompactedResource('ex:param'),
        genericsContext,
        conflict,
      )).toThrow('The value "undefined" for parameter "ex:param" is not of required range type "any"');
    });

    it('handles a defined value', () => {
      expect(() => ParameterPropertyHandlerRange.throwIncorrectTypeError(
        objectLoader.createCompactedResource('ex:value'),
        objectLoader.createCompactedResource('ex:param'),
        genericsContext,
        conflict,
      )).toThrow('The value "ex:value" for parameter "ex:param" is not of required range type "any"');
    });

    it('handles a defined value with types', () => {
      expect(() => ParameterPropertyHandlerRange.throwIncorrectTypeError(
        objectLoader.createCompactedResource({
          '@id': 'ex:value',
          '@type': [ 'ex:Type1', 'ex:Type2' ],
        }),
        objectLoader.createCompactedResource('ex:param'),
        genericsContext,
        conflict,
      )).toThrow(`The value "ex:value" with types "ex:Type1,ex:Type2" for parameter "ex:param" is not of required range type "any"`);
    });

    it('handles a defined list value', () => {
      expect(() => ParameterPropertyHandlerRange.throwIncorrectTypeError(
        objectLoader.createCompactedResource({
          list: [
            'ex:value1',
            'ex:value2',
          ],
        }),
        objectLoader.createCompactedResource('ex:param'),
        genericsContext,
        conflict,
      )).toThrow('The value "[ex:value1, ex:value2]" for parameter "ex:param" is not of required range type "any"');
    });

    it('handles generics', () => {
      genericsContext.bindings['ex:T'] = objectLoader.createCompactedResource('ex:A');
      genericsContext.bindings['ex:U'] = objectLoader.createCompactedResource('ex:B');
      try {
        ParameterPropertyHandlerRange.throwIncorrectTypeError(
          objectLoader.createCompactedResource('ex:value'),
          objectLoader.createCompactedResource('ex:param'),
          genericsContext,
          conflict,
        );
        expect(false).toBeTruthy(); // This can't occur
      } catch (error: unknown) {
        const context = (<ErrorResourcesContext> error).exportContext();
        expect(context.generics).toEqual(`[
  <ex:T> => ex:A,
  <ex:U> => ex:B
]`);
      }
    });
  });

  describe('rangeToDisplayString', () => {
    it('handles undefined range', () => {
      // eslint-disable-next-line unicorn/no-useless-undefined
      expect(ParameterPropertyHandlerRange.rangeToDisplayString(undefined, genericsContext)).toEqual('any');
    });

    it('handles wildcard range', () => {
      // eslint-disable-next-line unicorn/no-useless-undefined
      expect(ParameterPropertyHandlerRange.rangeToDisplayString(objectLoader.createCompactedResource({
        '@type': 'ParameterRangeWildcard',
      }), genericsContext)).toEqual('any');
    });

    it('handles ParameterRangeUndefined range', () => {
      expect(ParameterPropertyHandlerRange.rangeToDisplayString(objectLoader.createCompactedResource({
        '@type': 'ParameterRangeUndefined',
      }), genericsContext)).toEqual('undefined');
    });

    it('handles ParameterRangeArray range', () => {
      expect(ParameterPropertyHandlerRange.rangeToDisplayString(objectLoader.createCompactedResource({
        '@type': 'ParameterRangeArray',
        parameterRangeValue: 'ex:Type',
      }), genericsContext)).toEqual('ex:Type[]');
    });

    it('handles ParameterRangeRest range', () => {
      expect(ParameterPropertyHandlerRange.rangeToDisplayString(objectLoader.createCompactedResource({
        '@type': 'ParameterRangeRest',
        parameterRangeValue: 'ex:Type',
      }), genericsContext)).toEqual('...ex:Type');
    });

    it('handles ParameterRangeKeyof range', () => {
      expect(ParameterPropertyHandlerRange.rangeToDisplayString(objectLoader.createCompactedResource({
        '@type': 'ParameterRangeKeyof',
        parameterRangeValue: 'ex:Type',
      }), genericsContext)).toEqual('keyof ex:Type');
    });

    it('handles ParameterRangeUnion range', () => {
      expect(ParameterPropertyHandlerRange.rangeToDisplayString(objectLoader.createCompactedResource({
        '@type': 'ParameterRangeUnion',
        parameterRangeElements: [
          'ex:Type1',
          'ex:Type2',
        ],
      }), genericsContext)).toEqual('ex:Type1 | ex:Type2');
    });

    it('handles ParameterRangeIntersection range', () => {
      expect(ParameterPropertyHandlerRange.rangeToDisplayString(objectLoader.createCompactedResource({
        '@type': 'ParameterRangeIntersection',
        parameterRangeElements: [
          'ex:Type1',
          'ex:Type2',
        ],
      }), genericsContext)).toEqual('ex:Type1 & ex:Type2');
    });

    it('handles ParameterRangeTuple range', () => {
      expect(ParameterPropertyHandlerRange.rangeToDisplayString(objectLoader.createCompactedResource({
        '@type': 'ParameterRangeTuple',
        parameterRangeElements: [
          'ex:Type1',
          'ex:Type2',
        ],
      }), genericsContext)).toEqual('[ex:Type1, ex:Type2]');
    });

    it('handles ParameterRangeLiteral range', () => {
      expect(ParameterPropertyHandlerRange.rangeToDisplayString(objectLoader.createCompactedResource({
        '@type': 'ParameterRangeLiteral',
        parameterRangeValue: '"abc"',
      }), genericsContext)).toEqual('abc');
    });

    it('handles ParameterRangeGenericTypeReference range with an unknown generic', () => {
      expect(ParameterPropertyHandlerRange.rangeToDisplayString(objectLoader.createCompactedResource({
        '@type': 'ParameterRangeGenericTypeReference',
        parameterRangeGenericType: 'ex:GEN_T',
      }), genericsContext)).toEqual('UNKNOWN GENERIC: ex:GEN_T');
    });

    it('handles ParameterRangeGenericTypeReference range with a known generic', () => {
      genericsContext.genericTypeIds['ex:GEN_T'] = true;
      expect(ParameterPropertyHandlerRange.rangeToDisplayString(objectLoader.createCompactedResource({
        '@type': 'ParameterRangeGenericTypeReference',
        parameterRangeGenericType: 'ex:GEN_T',
      }), genericsContext)).toEqual('GENERIC: ex:GEN_T');
    });

    it('handles ParameterRangeGenericComponent range', () => {
      expect(ParameterPropertyHandlerRange.rangeToDisplayString(objectLoader.createCompactedResource({
        '@type': 'ParameterRangeGenericComponent',
        component: 'ex:Component',
        genericTypeInstances: [
          '"A"',
          '"B"',
        ],
      }), genericsContext)).toEqual('(ex:Component)<A, B>');
    });

    it('handles ParameterRangeIndexed range', () => {
      expect(ParameterPropertyHandlerRange.rangeToDisplayString(objectLoader.createCompactedResource({
        '@type': 'ParameterRangeIndexed',
        parameterRangeIndexedObject: 'ex:Component',
        parameterRangeIndexedIndex: {
          '@type': 'ParameterRangeLiteral',
          parameterRangeValue: '"abc"',
        },
      }), genericsContext)).toEqual('ex:Component[abc]');
    });
  });
});
