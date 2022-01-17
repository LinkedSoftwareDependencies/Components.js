import * as fs from 'fs';
import 'jest-rdf';
import { DataFactory } from 'rdf-data-factory';
import type { Resource } from 'rdf-object';
import { RdfObjectLoader } from 'rdf-object';
import { GenericsContext } from '../../../lib/preprocess/GenericsContext';
import type { IParamValueConflict } from '../../../lib/preprocess/parameterproperty/ParameterPropertyHandlerRange';

const DF = new DataFactory();

function expectOutputProperties(output: Resource | undefined, expected: Resource | undefined) {
  if (output === undefined) {
    expect(expected).toBeUndefined();
  } else {
    expect(output.toQuads()).toBeRdfIsomorphic(expected!.toQuads());
  }
}

describe('GenericsContext', () => {
  let objectLoader: RdfObjectLoader;
  let genericsContext: GenericsContext;

  beforeEach(async() => {
    objectLoader = new RdfObjectLoader({
      context: JSON.parse(fs.readFileSync(`${__dirname}/../../../components/context.jsonld`, 'utf8')),
    });
    await objectLoader.context;
  });

  describe('constructed without genericTypeParameters', () => {
    beforeEach(async() => {
      genericsContext = new GenericsContext(objectLoader, []);
    });

    it('should be empty', () => {
      expect(genericsContext.genericTypeIds).toEqual({});
      expect(genericsContext.bindings).toEqual({});
    });
  });

  describe('constructed with genericTypeParameters', () => {
    beforeEach(async() => {
      genericsContext = new GenericsContext(objectLoader, [
        objectLoader.createCompactedResource({
          '@id': 'ex:T',
        }),
        objectLoader.createCompactedResource({
          '@id': 'ex:U',
          range: 'xsd:string',
        }),
        objectLoader.createCompactedResource({
          '@id': 'ex:V',
          range: 'xsd:number',
        }),
      ]);
    });

    it('should not be empty', () => {
      expect(genericsContext.genericTypeIds).toEqual({
        'ex:T': true,
        'ex:U': true,
        'ex:V': true,
      });
      expect(genericsContext.bindings).toEqual({
        'ex:U': objectLoader.createCompactedResource('xsd:string'),
        'ex:V': objectLoader.createCompactedResource('xsd:number'),
      });
    });

    describe('bindGenericTypeToValue', () => {
      let typeValidator: (subValue: Resource | undefined, subType: Resource) => IParamValueConflict | undefined;

      beforeEach(() => {
        typeValidator = jest.fn();
      });

      it('should not bind undefined generic types', () => {
        expect(genericsContext.bindGenericTypeToValue(
          'ex:UNKNOWN',
          objectLoader.createCompactedResource('"value"^^http://www.w3.org/2001/XMLSchema#string'),
          typeValidator,
        )).toEqual({
          description: 'unknown generic <ex:UNKNOWN> is being referenced',
          context: {
            value: objectLoader.createCompactedResource('"value"^^http://www.w3.org/2001/XMLSchema#string'),
          },
        });

        expect(Object.keys(genericsContext.genericTypeIds)).toEqual([ 'ex:T', 'ex:U', 'ex:V' ]);
        expect(Object.keys(genericsContext.bindings)).toEqual([ 'ex:U', 'ex:V' ]);
      });

      it('should not bind a range that does not match an existing range', () => {
        typeValidator = jest.fn(() => ({ description: 'invalid type', context: {}}));

        expect(genericsContext.bindGenericTypeToValue(
          'ex:U',
          objectLoader.createCompactedResource('"value"^^http://www.w3.org/2001/XMLSchema#not-a-string'),
          typeValidator,
        )).toEqual({
          description: `generic <ex:U> with existing range "http://www.w3.org/2001/XMLSchema#string" can not contain the given value`,
          context: {
            existingRange: objectLoader.createCompactedResource('http://www.w3.org/2001/XMLSchema#string'),
            value: objectLoader.createCompactedResource('"value"^^http://www.w3.org/2001/XMLSchema#not-a-string'),
          },
          causes: [
            { description: 'invalid type', context: {}},
          ],
        });
        expect(typeValidator).toHaveBeenCalledWith(
          objectLoader.createCompactedResource('"value"^^http://www.w3.org/2001/XMLSchema#not-a-string'),
          objectLoader.createCompactedResource('xsd:string'),
        );
        expect(genericsContext.bindings['ex:U']).toEqual(objectLoader.createCompactedResource('xsd:string'));

        expect(Object.keys(genericsContext.genericTypeIds)).toEqual([ 'ex:T', 'ex:U', 'ex:V' ]);
        expect(Object.keys(genericsContext.bindings)).toEqual([ 'ex:U', 'ex:V' ]);
      });

      it('should bind a range that does match an existing range', () => {
        typeValidator = jest.fn();

        expect(genericsContext.bindGenericTypeToValue(
          'ex:U',
          objectLoader.createCompactedResource('"value"^^http://www.w3.org/2001/XMLSchema#string'),
          typeValidator,
        )).toBeUndefined();
        expect(typeValidator).toHaveBeenCalledWith(
          objectLoader.createCompactedResource('"value"^^http://www.w3.org/2001/XMLSchema#string'),
          objectLoader.createCompactedResource('xsd:string'),
        );
        expect(genericsContext.bindings['ex:U']).toEqual(objectLoader.createCompactedResource('xsd:string'));

        expect(Object.keys(genericsContext.genericTypeIds)).toEqual([ 'ex:T', 'ex:U', 'ex:V' ]);
        expect(Object.keys(genericsContext.bindings)).toEqual([ 'ex:U', 'ex:V' ]);
      });

      it('should bind a previously unbound range', () => {
        expect(genericsContext.bindGenericTypeToValue(
          'ex:T',
          objectLoader.createCompactedResource('"value"^^http://www.w3.org/2001/XMLSchema#string'),
          typeValidator,
        )).toBeUndefined();
        expect(genericsContext.bindings['ex:T']).toEqual(objectLoader.createCompactedResource('xsd:string'));

        expect(Object.keys(genericsContext.genericTypeIds)).toEqual([ 'ex:T', 'ex:U', 'ex:V' ]);
        expect(Object.keys(genericsContext.bindings)).toEqual([ 'ex:U', 'ex:V', 'ex:T' ]);
      });

      it('should silently not bind a value without type', () => {
        expect(genericsContext.bindGenericTypeToValue(
          'ex:T',
          objectLoader.createCompactedResource('ex:this-has-no-type'),
          typeValidator,
        )).toBeUndefined();
        expect(genericsContext.bindings['ex:T']).toBeUndefined();

        expect(Object.keys(genericsContext.genericTypeIds)).toEqual([ 'ex:T', 'ex:U', 'ex:V' ]);
        expect(Object.keys(genericsContext.bindings)).toEqual([ 'ex:U', 'ex:V' ]);
      });
    });

    describe('bindGenericTypeToRange', () => {
      it('should not bind undefined generic types', () => {
        expect(genericsContext.bindGenericTypeToRange(
          'ex:UNKNOWN',
          objectLoader.createCompactedResource('xsd:string'),
        )).toEqual({
          description: 'unknown generic <ex:UNKNOWN> is being referenced',
          context: {},
        });

        expect(Object.keys(genericsContext.genericTypeIds)).toEqual([ 'ex:T', 'ex:U', 'ex:V' ]);
        expect(Object.keys(genericsContext.bindings)).toEqual([ 'ex:U', 'ex:V' ]);
      });

      it('should not bind a range that does not match an existing range', () => {
        expect(genericsContext.bindGenericTypeToRange(
          'ex:U',
          objectLoader.createCompactedResource('xsd:not-a-string'),
        )).toEqual({
          description: `generic <ex:U> with existing range "http://www.w3.org/2001/XMLSchema#string" can not be bound to range "http://www.w3.org/2001/XMLSchema#not-a-string"`,
          context: {
            existingRange: objectLoader.createCompactedResource('http://www.w3.org/2001/XMLSchema#string'),
            newRange: objectLoader.createCompactedResource('http://www.w3.org/2001/XMLSchema#not-a-string'),
          },
        });
        expect(genericsContext.bindings['ex:U']).toEqual(objectLoader.createCompactedResource('xsd:string'));

        expect(Object.keys(genericsContext.genericTypeIds)).toEqual([ 'ex:T', 'ex:U', 'ex:V' ]);
        expect(Object.keys(genericsContext.bindings)).toEqual([ 'ex:U', 'ex:V' ]);
      });

      it('should bind a range that is equal to an existing range', () => {
        expect(genericsContext.bindGenericTypeToRange(
          'ex:U',
          objectLoader.createCompactedResource('xsd:string'),
        )).toBeUndefined();
        expect(genericsContext.bindings['ex:U']).toEqual(objectLoader.createCompactedResource('xsd:string'));

        expect(Object.keys(genericsContext.genericTypeIds)).toEqual([ 'ex:T', 'ex:U', 'ex:V' ]);
        expect(Object.keys(genericsContext.bindings)).toEqual([ 'ex:U', 'ex:V' ]);
      });

      it('should bind a range that matches an existing range', () => {
        genericsContext.bindings['ex:U'] = objectLoader.createCompactedResource('xsd:number');

        expect(genericsContext.bindGenericTypeToRange(
          'ex:U',
          objectLoader.createCompactedResource('xsd:integer'),
        )).toBeUndefined();
        expect(genericsContext.bindings['ex:U']).toEqual(objectLoader.createCompactedResource('xsd:integer'));

        expect(Object.keys(genericsContext.genericTypeIds)).toEqual([ 'ex:T', 'ex:U', 'ex:V' ]);
        expect(Object.keys(genericsContext.bindings)).toEqual([ 'ex:U', 'ex:V' ]);
      });
    });

    describe('inferValueRange', () => {
      it('should handle an undefined value', () => {
        expectOutputProperties(
          genericsContext.inferValueRange(<any> undefined),
          objectLoader.createCompactedResource({ '@type': 'ParameterRangeUndefined' }),
        );
      });

      it('should handle a literal value without explicit datatype', () => {
        expect(genericsContext.inferValueRange(objectLoader.createCompactedResource('"string"'))!.term)
          .toEqualRdfTerm(objectLoader.createCompactedResource('xsd:string').term);
      });

      it('should handle a literal value with explicit datatype', () => {
        expect(genericsContext.inferValueRange(objectLoader
          .createCompactedResource('"3"^^http://www.w3.org/2001/XMLSchema#integer'))!.term)
          .toEqualRdfTerm(objectLoader.createCompactedResource('xsd:integer').term);
      });

      it('should handle a resource value without type', () => {
        expect(genericsContext.inferValueRange(objectLoader.createCompactedResource('ex:value')))
          .toBeUndefined();
      });

      it('should handle a resource value with one type', () => {
        expect(genericsContext.inferValueRange(objectLoader
          .createCompactedResource({
            '@id': 'ex:value',
            '@type': 'ex:TYPE1',
          }))!.term)
          .toEqualRdfTerm(objectLoader.createCompactedResource('ex:TYPE1').term);
      });

      it('should handle a resource value with multiple types', () => {
        expectOutputProperties(
          genericsContext.inferValueRange(objectLoader.createCompactedResource({
            '@id': 'ex:value',
            '@type': [ 'ex:TYPE1', 'ex:TYPE2' ],
          })),
          objectLoader.createCompactedResource({
            '@type': 'ParameterRangeUnion',
            parameterRangeElements: [ 'ex:TYPE1', 'ex:TYPE2' ],
          }),
        );
      });
    });

    describe('mergeRanges', () => {
      it('should merge equal ranges', () => {
        expect(genericsContext.mergeRanges(
          objectLoader.createCompactedResource('ex:TYPE1'),
          objectLoader.createCompactedResource('ex:TYPE1'),
        )!.term).toEqualRdfTerm(objectLoader.createCompactedResource('ex:TYPE1').term);
      });

      it('should not merge unequal ranges', () => {
        expect(genericsContext.mergeRanges(
          objectLoader.createCompactedResource('ex:TYPE1'),
          objectLoader.createCompactedResource('ex:TYPE2'),
        )).toBeUndefined();
      });

      it('should merge to the narrowest type if left is xsd subtype of right', () => {
        expect(genericsContext.mergeRanges(
          objectLoader.createCompactedResource('xsd:integer'),
          objectLoader.createCompactedResource('xsd:number'),
        )!.term).toEqualRdfTerm(objectLoader.createCompactedResource('xsd:integer').term);
      });

      it('should merge to the narrowest type if right is xsd subtype of left', () => {
        expect(genericsContext.mergeRanges(
          objectLoader.createCompactedResource('xsd:number'),
          objectLoader.createCompactedResource('xsd:integer'),
        )!.term).toEqualRdfTerm(objectLoader.createCompactedResource('xsd:integer').term);
      });

      it('should return right if left is a wildcard', () => {
        expect(genericsContext.mergeRanges(
          objectLoader.createCompactedResource({ '@type': 'ParameterRangeWildcard' }),
          objectLoader.createCompactedResource('xsd:integer'),
        )!.term).toEqualRdfTerm(objectLoader.createCompactedResource('xsd:integer').term);
      });

      it('should return left if right is a wildcard', () => {
        expect(genericsContext.mergeRanges(
          objectLoader.createCompactedResource('xsd:integer'),
          objectLoader.createCompactedResource({ '@type': 'ParameterRangeWildcard' }),
        )!.term).toEqualRdfTerm(objectLoader.createCompactedResource('xsd:integer').term);
      });

      it('should return right if left is a generic', () => {
        expect(genericsContext.mergeRanges(
          objectLoader.createCompactedResource({ '@type': 'ParameterRangeGenericTypeReference' }),
          objectLoader.createCompactedResource('xsd:integer'),
        )!.term).toEqualRdfTerm(objectLoader.createCompactedResource('xsd:integer').term);
      });

      it('should return left if right is a generic', () => {
        expect(genericsContext.mergeRanges(
          objectLoader.createCompactedResource('xsd:integer'),
          objectLoader.createCompactedResource({ '@type': 'ParameterRangeGenericTypeReference' }),
        )!.term).toEqualRdfTerm(objectLoader.createCompactedResource('xsd:integer').term);
      });

      it('should merge undefined param types', () => {
        expectOutputProperties(
          genericsContext.mergeRanges(
            objectLoader.createCompactedResource({ '@type': 'ParameterRangeUndefined' }),
            objectLoader.createCompactedResource({ '@type': 'ParameterRangeUndefined' }),
          ),
          objectLoader.createCompactedResource({ '@type': 'ParameterRangeUndefined' }),
        );
      });

      it('should not merge unequal param types', () => {
        expect(genericsContext.mergeRanges(
          objectLoader.createCompactedResource({
            '@type': 'ParameterRangeArray',
            parameterRangeValue: 'xsd:string',
          }),
          objectLoader.createCompactedResource('ex:TYPE2'),
        )).toBeUndefined();
      });

      it('should merge equal array param types', () => {
        expectOutputProperties(
          genericsContext.mergeRanges(
            objectLoader.createCompactedResource({
              '@type': 'ParameterRangeArray',
              parameterRangeValue: 'xsd:string',
            }),
            objectLoader.createCompactedResource({
              '@type': 'ParameterRangeArray',
              parameterRangeValue: 'xsd:string',
            }),
          ),
          objectLoader.createCompactedResource({
            '@type': 'ParameterRangeArray',
            parameterRangeValue: 'xsd:string',
          }),
        );
      });

      it('should merge matching array param types', () => {
        expectOutputProperties(
          genericsContext.mergeRanges(
            objectLoader.createCompactedResource({
              '@type': 'ParameterRangeArray',
              parameterRangeValue: 'xsd:integer',
            }),
            objectLoader.createCompactedResource({
              '@type': 'ParameterRangeArray',
              parameterRangeValue: 'xsd:number',
            }),
          ),
          objectLoader.createCompactedResource({
            '@type': 'ParameterRangeArray',
            parameterRangeValue: 'xsd:integer',
          }),
        );
      });

      it('should not merge unequal array param types', () => {
        expect(
          genericsContext.mergeRanges(
            objectLoader.createCompactedResource({
              '@type': 'ParameterRangeArray',
              parameterRangeValue: 'xsd:string',
            }),
            objectLoader.createCompactedResource({
              '@type': 'ParameterRangeArray',
              parameterRangeValue: 'xsd:boolean',
            }),
          ),
        ).toBeUndefined();
      });

      it('should merge equal rest param types', () => {
        expectOutputProperties(
          genericsContext.mergeRanges(
            objectLoader.createCompactedResource({
              '@type': 'ParameterRangeRest',
              parameterRangeValue: 'xsd:string',
            }),
            objectLoader.createCompactedResource({
              '@type': 'ParameterRangeRest',
              parameterRangeValue: 'xsd:string',
            }),
          ),
          objectLoader.createCompactedResource({
            '@type': 'ParameterRangeRest',
            parameterRangeValue: 'xsd:string',
          }),
        );
      });

      it('should merge matching rest param types', () => {
        expectOutputProperties(
          genericsContext.mergeRanges(
            objectLoader.createCompactedResource({
              '@type': 'ParameterRangeRest',
              parameterRangeValue: 'xsd:integer',
            }),
            objectLoader.createCompactedResource({
              '@type': 'ParameterRangeRest',
              parameterRangeValue: 'xsd:number',
            }),
          ),
          objectLoader.createCompactedResource({
            '@type': 'ParameterRangeRest',
            parameterRangeValue: 'xsd:integer',
          }),
        );
      });

      it('should not merge unequal rest param types', () => {
        expect(
          genericsContext.mergeRanges(
            objectLoader.createCompactedResource({
              '@type': 'ParameterRangeRest',
              parameterRangeValue: 'xsd:string',
            }),
            objectLoader.createCompactedResource({
              '@type': 'ParameterRangeRest',
              parameterRangeValue: 'xsd:boolean',
            }),
          ),
        ).toBeUndefined();
      });

      it('should merge equal keyof param types', () => {
        expectOutputProperties(
          genericsContext.mergeRanges(
            objectLoader.createCompactedResource({
              '@type': 'ParameterRangeKeyof',
              parameterRangeValue: 'xsd:string',
            }),
            objectLoader.createCompactedResource({
              '@type': 'ParameterRangeKeyof',
              parameterRangeValue: 'xsd:string',
            }),
          ),
          objectLoader.createCompactedResource({
            '@type': 'ParameterRangeKeyof',
            parameterRangeValue: 'xsd:string',
          }),
        );
      });

      it('should merge matching keyof param types', () => {
        expectOutputProperties(
          genericsContext.mergeRanges(
            objectLoader.createCompactedResource({
              '@type': 'ParameterRangeKeyof',
              parameterRangeValue: 'xsd:integer',
            }),
            objectLoader.createCompactedResource({
              '@type': 'ParameterRangeKeyof',
              parameterRangeValue: 'xsd:number',
            }),
          ),
          objectLoader.createCompactedResource({
            '@type': 'ParameterRangeKeyof',
            parameterRangeValue: 'xsd:integer',
          }),
        );
      });

      it('should not merge unequal keyof param types', () => {
        expect(
          genericsContext.mergeRanges(
            objectLoader.createCompactedResource({
              '@type': 'ParameterRangeKeyof',
              parameterRangeValue: 'xsd:string',
            }),
            objectLoader.createCompactedResource({
              '@type': 'ParameterRangeKeyof',
              parameterRangeValue: 'xsd:boolean',
            }),
          ),
        ).toBeUndefined();
      });

      it('should merge equal union param types', () => {
        expectOutputProperties(
          genericsContext.mergeRanges(
            objectLoader.createCompactedResource({
              '@type': 'ParameterRangeUnion',
              parameterRangeElements: [
                'xsd:string',
                'xsd:boolean',
              ],
            }),
            objectLoader.createCompactedResource({
              '@type': 'ParameterRangeUnion',
              parameterRangeElements: [
                'xsd:string',
                'xsd:boolean',
              ],
            }),
          ),
          objectLoader.createCompactedResource({
            '@type': 'ParameterRangeUnion',
            parameterRangeElements: [
              'xsd:string',
              'xsd:boolean',
            ],
          }),
        );
      });

      it('should merge matching union param types', () => {
        expectOutputProperties(
          genericsContext.mergeRanges(
            objectLoader.createCompactedResource({
              '@type': 'ParameterRangeUnion',
              parameterRangeElements: [
                'xsd:integer',
                'xsd:boolean',
              ],
            }),
            objectLoader.createCompactedResource({
              '@type': 'ParameterRangeUnion',
              parameterRangeElements: [
                'xsd:number',
                'xsd:boolean',
              ],
            }),
          ),
          objectLoader.createCompactedResource({
            '@type': 'ParameterRangeUnion',
            parameterRangeElements: [
              'xsd:integer',
              'xsd:boolean',
            ],
          }),
        );
      });

      it('should not merge unequal union param types', () => {
        expect(
          genericsContext.mergeRanges(
            objectLoader.createCompactedResource({
              '@type': 'ParameterRangeUnion',
              parameterRangeElements: [
                'xsd:string',
                'xsd:integer',
              ],
            }),
            objectLoader.createCompactedResource({
              '@type': 'ParameterRangeUnion',
              parameterRangeElements: [
                'xsd:string',
                'xsd:boolean',
              ],
            }),
          ),
        ).toBeUndefined();
      });

      it('should not merge unequal union param types due to different length', () => {
        expect(
          genericsContext.mergeRanges(
            objectLoader.createCompactedResource({
              '@type': 'ParameterRangeUnion',
              parameterRangeElements: [
                'xsd:string',
                'xsd:boolean',
                'xsd:integer',
              ],
            }),
            objectLoader.createCompactedResource({
              '@type': 'ParameterRangeUnion',
              parameterRangeElements: [
                'xsd:string',
                'xsd:boolean',
              ],
            }),
          ),
        ).toBeUndefined();
      });

      it('should merge equal intersection param types', () => {
        expectOutputProperties(
          genericsContext.mergeRanges(
            objectLoader.createCompactedResource({
              '@type': 'ParameterRangeIntersection',
              parameterRangeElements: [
                'xsd:string',
                'xsd:boolean',
              ],
            }),
            objectLoader.createCompactedResource({
              '@type': 'ParameterRangeIntersection',
              parameterRangeElements: [
                'xsd:string',
                'xsd:boolean',
              ],
            }),
          ),
          objectLoader.createCompactedResource({
            '@type': 'ParameterRangeIntersection',
            parameterRangeElements: [
              'xsd:string',
              'xsd:boolean',
            ],
          }),
        );
      });

      it('should merge matching intersection param types', () => {
        expectOutputProperties(
          genericsContext.mergeRanges(
            objectLoader.createCompactedResource({
              '@type': 'ParameterRangeIntersection',
              parameterRangeElements: [
                'xsd:integer',
                'xsd:boolean',
              ],
            }),
            objectLoader.createCompactedResource({
              '@type': 'ParameterRangeIntersection',
              parameterRangeElements: [
                'xsd:number',
                'xsd:boolean',
              ],
            }),
          ),
          objectLoader.createCompactedResource({
            '@type': 'ParameterRangeIntersection',
            parameterRangeElements: [
              'xsd:integer',
              'xsd:boolean',
            ],
          }),
        );
      });

      it('should not merge unequal intersection param types', () => {
        expect(
          genericsContext.mergeRanges(
            objectLoader.createCompactedResource({
              '@type': 'ParameterRangeIntersection',
              parameterRangeElements: [
                'xsd:string',
                'xsd:integer',
              ],
            }),
            objectLoader.createCompactedResource({
              '@type': 'ParameterRangeIntersection',
              parameterRangeElements: [
                'xsd:string',
                'xsd:boolean',
              ],
            }),
          ),
        ).toBeUndefined();
      });

      it('should merge equal tuple param types', () => {
        expectOutputProperties(
          genericsContext.mergeRanges(
            objectLoader.createCompactedResource({
              '@type': 'ParameterRangeTuple',
              parameterRangeElements: [
                'xsd:string',
                'xsd:boolean',
              ],
            }),
            objectLoader.createCompactedResource({
              '@type': 'ParameterRangeTuple',
              parameterRangeElements: [
                'xsd:string',
                'xsd:boolean',
              ],
            }),
          ),
          objectLoader.createCompactedResource({
            '@type': 'ParameterRangeTuple',
            parameterRangeElements: [
              'xsd:string',
              'xsd:boolean',
            ],
          }),
        );
      });

      it('should merge matching tuple param types', () => {
        expectOutputProperties(
          genericsContext.mergeRanges(
            objectLoader.createCompactedResource({
              '@type': 'ParameterRangeTuple',
              parameterRangeElements: [
                'xsd:integer',
                'xsd:boolean',
              ],
            }),
            objectLoader.createCompactedResource({
              '@type': 'ParameterRangeTuple',
              parameterRangeElements: [
                'xsd:number',
                'xsd:boolean',
              ],
            }),
          ),
          objectLoader.createCompactedResource({
            '@type': 'ParameterRangeTuple',
            parameterRangeElements: [
              'xsd:integer',
              'xsd:boolean',
            ],
          }),
        );
      });

      it('should not merge unequal tuple param types', () => {
        expect(
          genericsContext.mergeRanges(
            objectLoader.createCompactedResource({
              '@type': 'ParameterRangeTuple',
              parameterRangeElements: [
                'xsd:string',
                'xsd:integer',
              ],
            }),
            objectLoader.createCompactedResource({
              '@type': 'ParameterRangeTuple',
              parameterRangeElements: [
                'xsd:string',
                'xsd:boolean',
              ],
            }),
          ),
        ).toBeUndefined();
      });

      it('should return union of matches if left is a union type and right is not', () => {
        expectOutputProperties(
          genericsContext.mergeRanges(
            objectLoader.createCompactedResource({
              '@type': 'ParameterRangeUnion',
              parameterRangeElements: [
                'xsd:integer',
                'xsd:boolean',
                'xsd:integer',
              ],
            }),
            objectLoader.createCompactedResource('xsd:integer'),
          ),
          objectLoader.createCompactedResource({
            '@type': 'ParameterRangeUnion',
            parameterRangeElements: [
              'xsd:integer',
              'xsd:integer',
            ],
          }),
        );
      });

      it('should return union of matches for one match if left is a union type and right is not', () => {
        expect(
          genericsContext.mergeRanges(
            objectLoader.createCompactedResource({
              '@type': 'ParameterRangeUnion',
              parameterRangeElements: [
                'xsd:integer',
                'xsd:boolean',
                'xsd:boolean',
              ],
            }),
            objectLoader.createCompactedResource('xsd:integer'),
          )!.term,
        ).toEqualRdfTerm(objectLoader.createCompactedResource('xsd:integer')!.term);
      });

      it('should not merge if union of matches of left does not match right', () => {
        expect(genericsContext.mergeRanges(
          objectLoader.createCompactedResource({
            '@type': 'ParameterRangeUnion',
            parameterRangeElements: [
              'xsd:boolean',
              'xsd:boolean',
              'xsd:boolean',
            ],
          }),
          objectLoader.createCompactedResource('xsd:integer'),
        )).toBeUndefined();
      });

      it('should return union of matches if right is a union type and left is not', () => {
        expectOutputProperties(
          genericsContext.mergeRanges(
            objectLoader.createCompactedResource('xsd:integer'),
            objectLoader.createCompactedResource({
              '@type': 'ParameterRangeUnion',
              parameterRangeElements: [
                'xsd:integer',
                'xsd:boolean',
                'xsd:integer',
              ],
            }),
          ),
          objectLoader.createCompactedResource({
            '@type': 'ParameterRangeUnion',
            parameterRangeElements: [
              'xsd:integer',
              'xsd:integer',
            ],
          }),
        );
      });

      it('should return union of matches for one match if right is a union type and left is not', () => {
        expect(
          genericsContext.mergeRanges(
            objectLoader.createCompactedResource('xsd:integer'),
            objectLoader.createCompactedResource({
              '@type': 'ParameterRangeUnion',
              parameterRangeElements: [
                'xsd:integer',
                'xsd:boolean',
                'xsd:boolean',
              ],
            }),
          )!.term,
        ).toEqualRdfTerm(objectLoader.createCompactedResource('xsd:integer')!.term);
      });

      it('should not merge if union of matches of right does not match left', () => {
        expect(genericsContext.mergeRanges(
          objectLoader.createCompactedResource('xsd:integer'),
          objectLoader.createCompactedResource({
            '@type': 'ParameterRangeUnion',
            parameterRangeElements: [
              'xsd:boolean',
              'xsd:boolean',
              'xsd:boolean',
            ],
          }),
        )).toBeUndefined();
      });
    });

    describe('isXsdSubType', () => {
      it('with xsd:number as super', () => {
        expect(genericsContext.isXsdSubType(
          DF.namedNode('http://www.w3.org/2001/XMLSchema#integer'),
          DF.namedNode('http://www.w3.org/2001/XMLSchema#number'),
        )).toBeTruthy();
        expect(genericsContext.isXsdSubType(
          DF.namedNode('http://www.w3.org/2001/XMLSchema#long'),
          DF.namedNode('http://www.w3.org/2001/XMLSchema#number'),
        )).toBeTruthy();
        expect(genericsContext.isXsdSubType(
          DF.namedNode('http://www.w3.org/2001/XMLSchema#int'),
          DF.namedNode('http://www.w3.org/2001/XMLSchema#number'),
        )).toBeTruthy();
        expect(genericsContext.isXsdSubType(
          DF.namedNode('http://www.w3.org/2001/XMLSchema#byte'),
          DF.namedNode('http://www.w3.org/2001/XMLSchema#number'),
        )).toBeTruthy();
        expect(genericsContext.isXsdSubType(
          DF.namedNode('http://www.w3.org/2001/XMLSchema#short'),
          DF.namedNode('http://www.w3.org/2001/XMLSchema#number'),
        )).toBeTruthy();
        expect(genericsContext.isXsdSubType(
          DF.namedNode('http://www.w3.org/2001/XMLSchema#negativeInteger'),
          DF.namedNode('http://www.w3.org/2001/XMLSchema#number'),
        )).toBeTruthy();
        expect(genericsContext.isXsdSubType(
          DF.namedNode('http://www.w3.org/2001/XMLSchema#nonNegativeInteger'),
          DF.namedNode('http://www.w3.org/2001/XMLSchema#number'),
        )).toBeTruthy();
        expect(genericsContext.isXsdSubType(
          DF.namedNode('http://www.w3.org/2001/XMLSchema#nonPositiveInteger'),
          DF.namedNode('http://www.w3.org/2001/XMLSchema#number'),
        )).toBeTruthy();
        expect(genericsContext.isXsdSubType(
          DF.namedNode('http://www.w3.org/2001/XMLSchema#positiveInteger'),
          DF.namedNode('http://www.w3.org/2001/XMLSchema#number'),
        )).toBeTruthy();
        expect(genericsContext.isXsdSubType(
          DF.namedNode('http://www.w3.org/2001/XMLSchema#unsignedByte'),
          DF.namedNode('http://www.w3.org/2001/XMLSchema#number'),
        )).toBeTruthy();
        expect(genericsContext.isXsdSubType(
          DF.namedNode('http://www.w3.org/2001/XMLSchema#unsignedInt'),
          DF.namedNode('http://www.w3.org/2001/XMLSchema#number'),
        )).toBeTruthy();
        expect(genericsContext.isXsdSubType(
          DF.namedNode('http://www.w3.org/2001/XMLSchema#unsignedLong'),
          DF.namedNode('http://www.w3.org/2001/XMLSchema#number'),
        )).toBeTruthy();
        expect(genericsContext.isXsdSubType(
          DF.namedNode('http://www.w3.org/2001/XMLSchema#unsignedShort'),
          DF.namedNode('http://www.w3.org/2001/XMLSchema#number'),
        )).toBeTruthy();
        expect(genericsContext.isXsdSubType(
          DF.namedNode('http://www.w3.org/2001/XMLSchema#double'),
          DF.namedNode('http://www.w3.org/2001/XMLSchema#number'),
        )).toBeTruthy();
        expect(genericsContext.isXsdSubType(
          DF.namedNode('http://www.w3.org/2001/XMLSchema#decimal'),
          DF.namedNode('http://www.w3.org/2001/XMLSchema#number'),
        )).toBeTruthy();
        expect(genericsContext.isXsdSubType(
          DF.namedNode('http://www.w3.org/2001/XMLSchema#float'),
          DF.namedNode('http://www.w3.org/2001/XMLSchema#number'),
        )).toBeTruthy();

        expect(genericsContext.isXsdSubType(
          DF.namedNode('http://www.w3.org/2001/XMLSchema#string'),
          DF.namedNode('http://www.w3.org/2001/XMLSchema#number'),
        )).toBeFalsy();
      });

      it('with xsd:string as super', () => {
        expect(genericsContext.isXsdSubType(
          DF.namedNode('http://www.w3.org/2001/XMLSchema#normalizedString'),
          DF.namedNode('http://www.w3.org/2001/XMLSchema#string'),
        )).toBeTruthy();
        expect(genericsContext.isXsdSubType(
          DF.namedNode('http://www.w3.org/2001/XMLSchema#anyURI'),
          DF.namedNode('http://www.w3.org/2001/XMLSchema#string'),
        )).toBeTruthy();
        expect(genericsContext.isXsdSubType(
          DF.namedNode('http://www.w3.org/2001/XMLSchema#base64Binary'),
          DF.namedNode('http://www.w3.org/2001/XMLSchema#string'),
        )).toBeTruthy();
        expect(genericsContext.isXsdSubType(
          DF.namedNode('http://www.w3.org/2001/XMLSchema#language'),
          DF.namedNode('http://www.w3.org/2001/XMLSchema#string'),
        )).toBeTruthy();
        expect(genericsContext.isXsdSubType(
          DF.namedNode('http://www.w3.org/2001/XMLSchema#Name'),
          DF.namedNode('http://www.w3.org/2001/XMLSchema#string'),
        )).toBeTruthy();
        expect(genericsContext.isXsdSubType(
          DF.namedNode('http://www.w3.org/2001/XMLSchema#NCName'),
          DF.namedNode('http://www.w3.org/2001/XMLSchema#string'),
        )).toBeTruthy();
        expect(genericsContext.isXsdSubType(
          DF.namedNode('http://www.w3.org/2001/XMLSchema#NMTOKEN'),
          DF.namedNode('http://www.w3.org/2001/XMLSchema#string'),
        )).toBeTruthy();
        expect(genericsContext.isXsdSubType(
          DF.namedNode('http://www.w3.org/2001/XMLSchema#token'),
          DF.namedNode('http://www.w3.org/2001/XMLSchema#string'),
        )).toBeTruthy();
        expect(genericsContext.isXsdSubType(
          DF.namedNode('http://www.w3.org/2001/XMLSchema#hexBinary'),
          DF.namedNode('http://www.w3.org/2001/XMLSchema#string'),
        )).toBeTruthy();
        expect(genericsContext.isXsdSubType(
          DF.namedNode('http://www.w3.org/2001/XMLSchema#langString'),
          DF.namedNode('http://www.w3.org/2001/XMLSchema#string'),
        )).toBeTruthy();
      });
    });

    describe('bindComponentGenericTypes', () => {
      beforeEach(() => {
        genericsContext = new GenericsContext(objectLoader, [
          objectLoader.createCompactedResource('ex:Component__generic_T'),
          objectLoader.createCompactedResource('ex:Component__generic_U'),
        ]);
      });

      it('should not handle empty instances', () => {
        expect(genericsContext.bindComponentGenericTypes(
          objectLoader.createCompactedResource({
            '@id': 'ex:Component',
          }),
          [],
          {},
        )).toEqual({
          description: 'no generic type instances are passed',
          context: {},
        });
      });

      it('should throw when a different amount instances and generic params are passed', () => {
        expect(() => genericsContext.bindComponentGenericTypes(
          objectLoader.createCompactedResource({
            '@id': 'ex:Component',
            genericTypeParameters: [
              'ex:Component__generic_T',
              'ex:Component__generic_U',
            ],
          }),
          [
            objectLoader.createCompactedResource({
              parameterRangeGenericBindings: 'xsd:string',
            }),
          ],
          {},
        )).toThrow(`Invalid generic type instantiation: a different amount of generic types are passed (1) than are defined on the component (2).`);
      });

      it('should handle valid instances', () => {
        expect(genericsContext.bindComponentGenericTypes(
          objectLoader.createCompactedResource({
            '@id': 'ex:Component',
            genericTypeParameters: [
              'ex:Component__generic_T',
              'ex:Component__generic_U',
            ],
          }),
          [
            objectLoader.createCompactedResource({
              parameterRangeGenericBindings: 'xsd:string',
            }),
            objectLoader.createCompactedResource({
              parameterRangeGenericBindings: 'xsd:number',
            }),
          ],
          {},
        )).toBeUndefined();

        expect(genericsContext.bindings['ex:Component__generic_T'])
          .toEqual(objectLoader.createCompactedResource('xsd:string'));
        expect(genericsContext.bindings['ex:Component__generic_U'])
          .toEqual(objectLoader.createCompactedResource('xsd:number'));
      });

      it('should handle valid instances without bindings', () => {
        expect(genericsContext.bindComponentGenericTypes(
          objectLoader.createCompactedResource({
            '@id': 'ex:Component',
            genericTypeParameters: [
              'ex:Component__generic_T',
              'ex:Component__generic_U',
            ],
          }),
          [
            objectLoader.createCompactedResource({
              parameterRangeGenericBindings: 'xsd:string',
            }),
            objectLoader.createCompactedResource({}),
          ],
          {},
        )).toBeUndefined();

        expect(genericsContext.bindings['ex:Component__generic_T'])
          .toEqual(objectLoader.createCompactedResource('xsd:string'));
        expect(genericsContext.bindings['ex:Component__generic_U'])
          .toBeUndefined();
      });

      it('should handle valid instances that match', () => {
        genericsContext.bindGenericTypeToRange('ex:Component__generic_T', objectLoader
          .createCompactedResource('xsd:string'));

        expect(genericsContext.bindComponentGenericTypes(
          objectLoader.createCompactedResource({
            '@id': 'ex:Component',
            genericTypeParameters: [
              'ex:Component__generic_T',
              'ex:Component__generic_U',
            ],
          }),
          [
            objectLoader.createCompactedResource({
              parameterRangeGenericBindings: 'xsd:string',
            }),
            objectLoader.createCompactedResource({
              parameterRangeGenericBindings: 'xsd:number',
            }),
          ],
          {},
        )).toBeUndefined();

        expect(genericsContext.bindings['ex:Component__generic_T'])
          .toEqual(objectLoader.createCompactedResource('xsd:string'));
        expect(genericsContext.bindings['ex:Component__generic_U'])
          .toEqual(objectLoader.createCompactedResource('xsd:number'));
      });

      it('should not handle instances that do not match', () => {
        genericsContext.bindGenericTypeToRange('ex:Component__generic_T', objectLoader
          .createCompactedResource('xsd:boolean'));

        expect(genericsContext.bindComponentGenericTypes(
          objectLoader.createCompactedResource({
            '@id': 'ex:Component',
            genericTypeParameters: [
              'ex:Component__generic_T',
              'ex:Component__generic_U',
            ],
          }),
          [
            objectLoader.createCompactedResource({
              parameterRangeGenericBindings: 'xsd:string',
            }),
            objectLoader.createCompactedResource({
              parameterRangeGenericBindings: 'xsd:number',
            }),
          ],
          {},
        )).toEqual({
          description: `invalid binding for generic <ex:Component__generic_T>`,
          context: {},
          causes: [
            {
              description: `generic <ex:Component__generic_T> with existing range "http://www.w3.org/2001/XMLSchema#boolean" can not be bound to range "http://www.w3.org/2001/XMLSchema#string"`,
              context: {
                existingRange: objectLoader.createCompactedResource('http://www.w3.org/2001/XMLSchema#boolean'),
                newRange: objectLoader.createCompactedResource('http://www.w3.org/2001/XMLSchema#string'),
              },
            },
          ],
        });
      });
    });
  });
});
