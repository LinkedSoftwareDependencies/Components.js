import * as fs from 'fs';
import type { Resource } from 'rdf-object';
import { RdfObjectLoader } from 'rdf-object/lib/RdfObjectLoader';
import { GenericsContext } from '../../../lib/preprocess/GenericsContext';
import { ParameterHandler } from '../../../lib/preprocess/ParameterHandler';
import 'jest-rdf';

describe('ParameterHandler', () => {
  let objectLoader: RdfObjectLoader;
  let genericsContext: GenericsContext;
  let handler: ParameterHandler;
  let configRoot: Resource;
  let param: Resource;
  let configElement: Resource;
  beforeEach(async() => {
    objectLoader = new RdfObjectLoader({
      context: JSON.parse(fs.readFileSync(`${__dirname}/../../../components/context.jsonld`, 'utf8')),
    });
    await objectLoader.context;
    genericsContext = new GenericsContext(objectLoader, []);
    handler = new ParameterHandler({ objectLoader, typeChecking: true });

    configRoot = objectLoader.createCompactedResource({
      types: 'ex:Component1',
      extends: 'ex:Component1Super',
    });
    configElement = objectLoader.createCompactedResource({
      '@id': 'ex:myConfig',
    });
  });

  function expectOutputProperties(output: Resource | undefined, expected: Resource | undefined) {
    if (output === undefined) {
      expect(expected).toBeUndefined();
    } else {
      expect(output.toQuads()).toBeRdfIsomorphic(expected!.toQuads());
    }
  }

  function expectOutputOnlyTerm(output: Resource | undefined, expected: Resource | undefined) {
    if (output === undefined) {
      expect(expected).toBeUndefined();
    } else {
      expect(Object.keys(output.properties)).toEqual([]);
      expect(output.term).toEqualRdfTerm(expected!.term);
    }
  }

  describe('applyParameterValues', () => {
    describe('for plain parameter', () => {
      beforeEach(() => {
        param = objectLoader.createCompactedResource('ex:myParam');
      });

      it('should be undefined for an undefined value', () => {
        const expected = undefined;
        expectOutputOnlyTerm(handler
          .applyParameterValues(configRoot, param, configElement, genericsContext), expected);
      });

      it('should handle one set value', () => {
        configElement = objectLoader.createCompactedResource({
          'ex:myParam': '"ABC"',
        });
        const expected: Resource = objectLoader.createCompactedResource('"ABC"');
        expectOutputOnlyTerm(handler
          .applyParameterValues(configRoot, param, configElement, genericsContext), expected);
      });

      it('should reject multiple set values', () => {
        configElement = objectLoader.createCompactedResource({
          '@id': 'ex:config',
          'ex:myParam': [
            '"A"',
            '"B"',
            '"C"',
          ],
        });
        expect(() => handler.applyParameterValues(configRoot, param, configElement, genericsContext))
          .toThrowError(`Detected multiple values for parameter ex:myParam in ex:config. RDF lists should be used for defining multiple values.`);
      });

      it('should handle list values', () => {
        configElement = objectLoader.createCompactedResource({
          'ex:myParam': [
            {
              list: [
                '"A"',
                '"B"',
                '"C"',
              ],
            },
          ],
        });
        const expected: Resource = objectLoader.createCompactedResource({
          list: [
            '"A"',
            '"B"',
            '"C"',
          ],
        });
        expectOutputProperties(handler
          .applyParameterValues(configRoot, param, configElement, genericsContext), expected);
      });

      it('should accept multiple list values', () => {
        configElement = objectLoader.createCompactedResource({
          'ex:myParam': [
            {
              list: [
                '"A"',
                '"B"',
              ],
            },
            {
              list: [
                '"C"',
              ],
            },
          ],
        });
        const expected: Resource = objectLoader.createCompactedResource({
          list: [
            '"A"',
            '"B"',
            '"C"',
          ],
        });
        expectOutputProperties(handler
          .applyParameterValues(configRoot, param, configElement, genericsContext), expected);
      });

      it('should reject list and set values', () => {
        configElement = objectLoader.createCompactedResource({
          '@id': 'ex:config',
          'ex:myParam': [
            '"A"',
            {
              list: [
                '"B"',
              ],
            },
            '"C"',
          ],
        });
        expect(() => handler.applyParameterValues(configRoot, param, configElement, genericsContext))
          .toThrowError(`Detected multiple values for parameter ex:myParam in ex:config. RDF lists should be used for defining multiple values.`);
      });
    });

    describe('for parameter with defaults', () => {
      describe('with one default', () => {
        beforeEach(() => {
          param = objectLoader.createCompactedResource({
            '@id': 'ex:myParam',
            default: '"DEFAULT"',
          });
        });

        it('should be the default for an undefined value', () => {
          const expected: Resource = objectLoader.createCompactedResource('"DEFAULT"');
          expectOutputOnlyTerm(handler
            .applyParameterValues(configRoot, param, configElement, genericsContext), expected);
        });

        it('should override the default with one set value', () => {
          configElement = objectLoader.createCompactedResource({
            'ex:myParam': '"ABC"',
          });
          const expected: Resource = objectLoader.createCompactedResource('"ABC"');
          expectOutputOnlyTerm(handler
            .applyParameterValues(configRoot, param, configElement, genericsContext), expected);
        });

        it('should override the default with multiple set values', () => {
          configElement = objectLoader.createCompactedResource({
            'ex:myParam': {
              list: [
                '"A"',
                '"B"',
                '"C"',
              ],
            },
          });
          const expected: Resource = objectLoader.createCompactedResource({
            list: [
              '"A"',
              '"B"',
              '"C"',
            ],
          });
          expectOutputOnlyTerm(handler
            .applyParameterValues(configRoot, param, configElement, genericsContext), expected);
        });
      });

      describe('with multiple defaults without list', () => {
        beforeEach(() => {
          param = objectLoader.createCompactedResource({
            '@id': 'ex:myParam',
            default: [
              '"DEFAULT1"',
              '"DEFAULT2"',
            ],
          });
        });

        it('should throw', () => {
          expect(() => handler.applyParameterValues(configRoot, param, configElement, genericsContext))
            .toThrowError(`Invalid default value for parameter "ex:myParam": Only one value can be defined, or an RDF list must be provided`);
        });
      });

      describe('with one default as list value', () => {
        beforeEach(() => {
          param = objectLoader.createCompactedResource({
            '@id': 'ex:myParam',
            default: {
              list: [
                '"DEFAULT1"',
              ],
            },
          });
        });

        it('should be the default for an undefined value', () => {
          const expected: Resource = objectLoader.createCompactedResource({
            list: [
              '"DEFAULT1"',
            ],
          });
          expectOutputOnlyTerm(handler
            .applyParameterValues(configRoot, param, configElement, genericsContext), expected);
        });

        it('should override the default with one set value', () => {
          configElement = objectLoader.createCompactedResource({
            'ex:myParam': '"ABC"',
          });
          const expected: Resource = objectLoader.createCompactedResource('"ABC"');
          expectOutputOnlyTerm(handler
            .applyParameterValues(configRoot, param, configElement, genericsContext), expected);
        });

        it('should override the default with multiple set values', () => {
          configElement = objectLoader.createCompactedResource({
            'ex:myParam': {
              list: [
                '"A"',
                '"B"',
                '"C"',
              ],
            },
          });
          const expected: Resource = objectLoader.createCompactedResource({
            list: [
              '"A"',
              '"B"',
              '"C"',
            ],
          });
          expectOutputOnlyTerm(handler
            .applyParameterValues(configRoot, param, configElement, genericsContext), expected);
        });
      });

      describe('with multiple defaults', () => {
        beforeEach(() => {
          param = objectLoader.createCompactedResource({
            '@id': 'ex:myParam',
            default: {
              list: [
                '"DEFAULT1"',
                '"DEFAULT2"',
              ],
            },
          });
        });

        it('should be the default for an undefined value', () => {
          const expected: Resource = objectLoader.createCompactedResource({
            list: [
              '"DEFAULT1"',
              '"DEFAULT2"',
            ],
          });
          expectOutputOnlyTerm(handler
            .applyParameterValues(configRoot, param, configElement, genericsContext), expected);
        });

        it('should override the default with one set value', () => {
          configElement = objectLoader.createCompactedResource({
            'ex:myParam': '"ABC"',
          });
          const expected: Resource = objectLoader.createCompactedResource('"ABC"');
          expectOutputOnlyTerm(handler
            .applyParameterValues(configRoot, param, configElement, genericsContext), expected);
        });

        it('should override the default with multiple set values', () => {
          configElement = objectLoader.createCompactedResource({
            'ex:myParam': {
              list: [
                '"A"',
                '"B"',
                '"C"',
              ],
            },
          });
          const expected: Resource = objectLoader.createCompactedResource({
            list: [
              '"A"',
              '"B"',
              '"C"',
            ],
          });
          expectOutputOnlyTerm(handler
            .applyParameterValues(configRoot, param, configElement, genericsContext), expected);
        });
      });

      describe('with rdf:subject as default', () => {
        beforeEach(() => {
          param = objectLoader.createCompactedResource({
            '@id': 'ex:myParam',
            default: 'rdf:subject',
          });
        });

        it('should be the default for an undefined value', () => {
          const expected: Resource = objectLoader.createCompactedResource('"ex:myConfig"');
          expectOutputOnlyTerm(handler
            .applyParameterValues(configRoot, param, configElement, genericsContext), expected);
        });
      });
    });

    describe('for parameter with default scoped', () => {
      describe('with one applicable default scoped value', () => {
        beforeEach(() => {
          param = objectLoader.createCompactedResource({
            '@id': 'ex:myParam',
            defaultScoped: [
              {
                defaultScope: [
                  'ex:Component1',
                ],
                defaultScopedValue: '"DEFAULT"',
              },
            ],
          });
        });

        it('should be the default for an undefined value', () => {
          const expected: Resource = objectLoader.createCompactedResource('"DEFAULT"');
          expectOutputOnlyTerm(handler
            .applyParameterValues(configRoot, param, configElement, genericsContext), expected);
        });

        it('should override the default with one set value', () => {
          configElement = objectLoader.createCompactedResource({
            'ex:myParam': '"ABC"',
          });
          const expected: Resource = objectLoader.createCompactedResource('"ABC"');
          expectOutputOnlyTerm(handler
            .applyParameterValues(configRoot, param, configElement, genericsContext), expected);
        });

        it('should override the default with multiple set values', () => {
          configElement = objectLoader.createCompactedResource({
            'ex:myParam': {
              list: [
                '"A"',
                '"B"',
                '"C"',
              ],
            },
          });
          const expected: Resource = objectLoader.createCompactedResource({
            list: [
              '"A"',
              '"B"',
              '"C"',
            ],
          });
          expectOutputOnlyTerm(handler
            .applyParameterValues(configRoot, param, configElement, genericsContext), expected);
        });
      });

      describe('with one applicable default scoped value via extends', () => {
        beforeEach(() => {
          param = objectLoader.createCompactedResource({
            '@id': 'ex:myParam',
            defaultScoped: [
              {
                defaultScope: [
                  'ex:Component1Super',
                ],
                defaultScopedValue: '"DEFAULT"',
              },
            ],
          });
        });

        it('should be the default for an undefined value', () => {
          const expected: Resource = objectLoader.createCompactedResource('"DEFAULT"');
          expectOutputOnlyTerm(handler
            .applyParameterValues(configRoot, param, configElement, genericsContext), expected);
        });

        it('should override the default with one set value', () => {
          configElement = objectLoader.createCompactedResource({
            'ex:myParam': '"ABC"',
          });
          const expected: Resource = objectLoader.createCompactedResource('"ABC"');
          expectOutputOnlyTerm(handler
            .applyParameterValues(configRoot, param, configElement, genericsContext), expected);
        });

        it('should override the default with multiple set values', () => {
          configElement = objectLoader.createCompactedResource({
            'ex:myParam': {
              list: [
                '"A"',
                '"B"',
                '"C"',
              ],
            },
          });
          const expected: Resource = objectLoader.createCompactedResource({
            list: [
              '"A"',
              '"B"',
              '"C"',
            ],
          });
          expectOutputOnlyTerm(handler
            .applyParameterValues(configRoot, param, configElement, genericsContext), expected);
        });
      });

      describe('with multiple applicable default scoped values without list', () => {
        beforeEach(() => {
          param = objectLoader.createCompactedResource({
            '@id': 'ex:myParam',
            defaultScoped: [
              {
                defaultScope: [
                  'ex:Component1',
                ],
                defaultScopedValue: [
                  '"DEFAULT1"',
                  '"DEFAULT2"',
                ],
              },
            ],
          });
        });

        it('should throw', () => {
          expect(() => handler.applyParameterValues(configRoot, param, configElement, genericsContext))
            .toThrowError(`Invalid defaultScoped value for parameter "ex:myParam": Only one defaultScopedValue can be defined, or an RDF list must be provided`);
        });
      });

      describe('with multiple applicable default scoped values as list', () => {
        beforeEach(() => {
          param = objectLoader.createCompactedResource({
            '@id': 'ex:myParam',
            defaultScoped: [
              {
                defaultScope: [
                  'ex:Component1',
                ],
                defaultScopedValue: {
                  list: [
                    '"DEFAULT1"',
                    '"DEFAULT2"',
                  ],
                },
              },
            ],
          });
        });

        it('should be the default for an undefined value', () => {
          const expected: Resource = objectLoader.createCompactedResource({
            list: [
              '"DEFAULT1"',
              '"DEFAULT2"',
            ],
          });
          expectOutputOnlyTerm(handler
            .applyParameterValues(configRoot, param, configElement, genericsContext), expected);
        });

        it('should override the default with one set value', () => {
          configElement = objectLoader.createCompactedResource({
            'ex:myParam': '"ABC"',
          });
          const expected: Resource = objectLoader.createCompactedResource('"ABC"');
          expectOutputOnlyTerm(handler
            .applyParameterValues(configRoot, param, configElement, genericsContext), expected);
        });

        it('should override the default with multiple set values', () => {
          configElement = objectLoader.createCompactedResource({
            'ex:myParam': {
              list: [
                '"A"',
                '"B"',
                '"C"',
              ],
            },
          });
          const expected: Resource = objectLoader.createCompactedResource({
            list: [
              '"A"',
              '"B"',
              '"C"',
            ],
          });
          expectOutputOnlyTerm(handler
            .applyParameterValues(configRoot, param, configElement, genericsContext), expected);
        });
      });

      describe('with one non-applicable default scoped', () => {
        beforeEach(() => {
          param = objectLoader.createCompactedResource({
            '@id': 'ex:myParam',
            defaultScoped: [
              {
                defaultScope: [
                  'ex:Component2',
                ],
                defaultScopedValue: '"DEFAULT"',
              },
            ],
          });
        });

        it('should not be the default for an undefined value', () => {
          const expected = undefined;
          expectOutputOnlyTerm(handler
            .applyParameterValues(configRoot, param, configElement, genericsContext), expected);
        });
      });

      describe('with multiple non-applicable default scope ranges', () => {
        beforeEach(() => {
          param = objectLoader.createCompactedResource({
            '@id': 'ex:myParam',
            defaultScoped: [
              {
                defaultScope: [
                  'ex:Component2',
                  'ex:Component3',
                  'ex:Component4',
                ],
                defaultScopedValue: '"DEFAULT"',
              },
            ],
          });
        });

        it('should not be the default for an undefined value', () => {
          const expected = undefined;
          expectOutputOnlyTerm(handler
            .applyParameterValues(configRoot, param, configElement, genericsContext), expected);
        });
      });

      describe('with multiple non-applicable default scopes', () => {
        beforeEach(() => {
          param = objectLoader.createCompactedResource({
            '@id': 'ex:myParam',
            defaultScoped: [
              {
                defaultScope: [
                  'ex:Component2',
                ],
                defaultScopedValue: '"DEFAULT1"',
              },
              {
                defaultScope: [
                  'ex:Component3',
                ],
                defaultScopedValue: '"DEFAULT2"',
              },
            ],
          });
        });

        it('should not be the default for an undefined value', () => {
          const expected = undefined;
          expectOutputOnlyTerm(handler
            .applyParameterValues(configRoot, param, configElement, genericsContext), expected);
        });
      });

      describe('with just one applicable default scopes among others', () => {
        beforeEach(() => {
          param = objectLoader.createCompactedResource({
            '@id': 'ex:myParam',
            defaultScoped: [
              {
                defaultScope: [
                  'ex:Component2',
                ],
                defaultScopedValue: '"DEFAULT2"',
              },
              {
                defaultScope: [
                  'ex:Component1',
                ],
                defaultScopedValue: '"DEFAULT1"',
              },
              {
                defaultScope: [
                  'ex:Component3',
                ],
                defaultScopedValue: '"DEFAULT3"',
              },
            ],
          });
        });

        it('should not be the default for an undefined value', () => {
          const expected: Resource = objectLoader.createCompactedResource('"DEFAULT1"');
          expectOutputOnlyTerm(handler
            .applyParameterValues(configRoot, param, configElement, genericsContext), expected);
        });
      });

      describe('with multiple applicable default scopes', () => {
        beforeEach(() => {
          param = objectLoader.createCompactedResource({
            '@id': 'ex:myParam',
            defaultScoped: [
              {
                defaultScope: [
                  'ex:Component1',
                ],
                defaultScopedValue: '"DEFAULT1"',
              },
              {
                defaultScope: [
                  'ex:Component1',
                ],
                defaultScopedValue: '"DEFAULT2"',
              },
            ],
          });
        });

        it('should set all default values', () => {
          const expected: Resource = objectLoader.createCompactedResource({
            list: [
              '"DEFAULT1"',
              '"DEFAULT2"',
            ],
          });
          expectOutputOnlyTerm(handler
            .applyParameterValues(configRoot, param, configElement, genericsContext), expected);
        });
      });

      describe('with invalid default scopes', () => {
        it('should throw for a missing defaultScope', () => {
          param = objectLoader.createCompactedResource({
            '@id': 'ex:myParam',
            defaultScoped: [
              {
                defaultScopedValue: '"DEFAULT"',
              },
            ],
          });
          expect(() => handler.applyParameterValues(configRoot, param, configElement, genericsContext))
            .toThrowError(/^Invalid defaultScoped for parameter "ex:myParam": Missing defaultScope/u);
        });

        it('should throw for a missing defaultScopedValue', () => {
          param = objectLoader.createCompactedResource({
            '@id': 'ex:myParam',
            defaultScoped: [
              {
                defaultScope: [
                  'ex:Component1',
                ],
              },
            ],
          });
          expect(() => handler.applyParameterValues(configRoot, param, configElement, genericsContext))
            .toThrowError(/^Invalid defaultScoped for parameter "ex:myParam": Missing defaultScopedValue/u);
        });
      });
    });

    describe('for parameter with fixed values', () => {
      describe('with one fixed value as single value', () => {
        beforeEach(() => {
          param = objectLoader.createCompactedResource({
            '@id': 'ex:myParam',
            fixed: '"FIXED"',
          });
        });

        it('should return the fixed value for an undefined value', () => {
          const expected: Resource = objectLoader.createCompactedResource('"FIXED"');
          expectOutputOnlyTerm(handler
            .applyParameterValues(configRoot, param, configElement, genericsContext), expected);
        });

        it('should allow one additional set value', () => {
          configElement = objectLoader.createCompactedResource({
            'ex:myParam': '"ABC"',
          });
          const expected: Resource = objectLoader.createCompactedResource({
            list: [
              '"FIXED"',
              '"ABC"',
            ],
          });
          expectOutputOnlyTerm(handler
            .applyParameterValues(configRoot, param, configElement, genericsContext), expected);
        });

        it('should not allow multiple additional set values', () => {
          configElement = objectLoader.createCompactedResource({
            'ex:myParam': {
              list: [
                '"A"',
                '"B"',
                '"C"',
              ],
            },
          });
          const expected: Resource = objectLoader.createCompactedResource({
            list: [
              '"FIXED"',
              '"A"',
              '"B"',
              '"C"',
            ],
          });
          expectOutputOnlyTerm(handler
            .applyParameterValues(configRoot, param, configElement, genericsContext), expected);
        });
      });

      describe('with multiple fixed value without list', () => {
        beforeEach(() => {
          param = objectLoader.createCompactedResource({
            '@id': 'ex:myParam',
            fixed: [
              '"FIXED1"',
              '"FIXED2"',
            ],
          });
        });

        it('should throw', () => {
          const expected: Resource = objectLoader.createCompactedResource('"FIXED"');
          expect(() => expectOutputOnlyTerm(handler
            .applyParameterValues(configRoot, param, configElement, genericsContext), expected))
            .toThrowError(`Invalid fixed value for parameter "ex:myParam": Only one value can be defined, or an RDF list must be provided`);
        });
      });

      describe('with one fixed value as list value', () => {
        beforeEach(() => {
          param = objectLoader.createCompactedResource({
            '@id': 'ex:myParam',
            fixed: {
              list: [
                '"FIXED"',
              ],
            },
          });
        });

        it('should return the fixed value for an undefined value', () => {
          const expected: Resource = objectLoader.createCompactedResource({
            list: [
              '"FIXED"',
            ],
          });
          expectOutputOnlyTerm(handler
            .applyParameterValues(configRoot, param, configElement, genericsContext), expected);
        });

        it('should allow one additional set value', () => {
          configElement = objectLoader.createCompactedResource({
            'ex:myParam': '"ABC"',
          });
          const expected: Resource = objectLoader.createCompactedResource({
            list: [
              '"FIXED"',
              '"ABC"',
            ],
          });
          expectOutputOnlyTerm(handler
            .applyParameterValues(configRoot, param, configElement, genericsContext), expected);
        });

        it('should allow multiple additional set values', () => {
          configElement = objectLoader.createCompactedResource({
            'ex:myParam': {
              list: [
                '"A"',
                '"B"',
                '"C"',
              ],
            },
          });
          const expected: Resource = objectLoader.createCompactedResource({
            list: [
              '"FIXED"',
              '"A"',
              '"B"',
              '"C"',
            ],
          });
          expectOutputOnlyTerm(handler
            .applyParameterValues(configRoot, param, configElement, genericsContext), expected);
        });
      });

      describe('with multiple fixed values', () => {
        beforeEach(() => {
          param = objectLoader.createCompactedResource({
            '@id': 'ex:myParam',
            fixed: {
              list: [
                '"FIXED1"',
                '"FIXED2"',
              ],
            },
          });
        });

        it('should return the fixed values for an undefined value', () => {
          const expected: Resource = objectLoader.createCompactedResource({
            list: [
              '"FIXED1"',
              '"FIXED2"',
            ],
          });
          expectOutputOnlyTerm(handler
            .applyParameterValues(configRoot, param, configElement, genericsContext), expected);
        });

        it('should allow one additional set value', () => {
          configElement = objectLoader.createCompactedResource({
            'ex:myParam': '"ABC"',
          });
          const expected: Resource = objectLoader.createCompactedResource({
            list: [
              '"FIXED1"',
              '"FIXED2"',
              '"ABC"',
            ],
          });
          expectOutputOnlyTerm(handler
            .applyParameterValues(configRoot, param, configElement, genericsContext), expected);
        });

        it('should allow multiple additional set values', () => {
          configElement = objectLoader.createCompactedResource({
            'ex:myParam': {
              list: [
                '"A"',
                '"B"',
                '"C"',
              ],
            },
          });
          const expected: Resource = objectLoader.createCompactedResource({
            list: [
              '"FIXED1"',
              '"FIXED2"',
              '"A"',
              '"B"',
              '"C"',
            ],
          });
          expectOutputOnlyTerm(handler
            .applyParameterValues(configRoot, param, configElement, genericsContext), expected);
        });
      });
    });

    describe('for parameter with a range', () => {
      beforeEach(() => {
        param = objectLoader.createCompactedResource({
          '@id': 'ex:myParam',
          range: 'xsd:boolean',
        });
      });

      it('should not allow an undefined value', () => {
        expect(() => handler.applyParameterValues(configRoot, param, configElement, genericsContext))
          .toThrow(`The value "undefined" for parameter "ex:myParam" is not of required range type "http://www.w3.org/2001/XMLSchema#boolean"`);
      });

      it('should allow one set boolean value', () => {
        configElement = objectLoader.createCompactedResource({
          'ex:myParam': '"true"',
        });
        const expected: Resource = objectLoader.createCompactedResource('"true"');
        const outputs = handler.applyParameterValues(configRoot, param, configElement, genericsContext);
        expectOutputOnlyTerm(outputs, expected);
      });

      it('should not allow multiple set boolean values', () => {
        configElement = objectLoader.createCompactedResource({
          'ex:myParam': {
            list: [
              '"true"',
              '"false"',
              '"true"',
            ],
          },
        });
        expect(() => handler.applyParameterValues(configRoot, param, configElement, genericsContext))
          .toThrow(/The value ".*" for parameter "ex:myParam" is not of required range type ".*boolean"/u);
      });
    });

    describe('for parameter that is lazy', () => {
      beforeEach(() => {
        param = objectLoader.createCompactedResource({
          '@id': 'ex:myParam',
          lazy: '"true"',
        });
      });

      it('should allow an undefined value', () => {
        const expected = undefined;
        expectOutputProperties(handler
          .applyParameterValues(configRoot, param, configElement, genericsContext), expected);
      });

      it('should allow one set value, and inherit lazy property', () => {
        configElement = objectLoader.createCompactedResource({
          'ex:myParam': '"ABC"',
        });
        const expected: Resource = objectLoader.createCompactedResource('"ABC"');
        expected.property.lazy = objectLoader.createCompactedResource('"true"');
        expectOutputProperties(handler
          .applyParameterValues(configRoot, param, configElement, genericsContext), expected);
      });

      it('should allow multiple set values, and inherit lazy property on all', () => {
        configElement = objectLoader.createCompactedResource({
          'ex:myParam': {
            list: [
              '"A"',
              '"B"',
              '"C"',
            ],
          },
        });
        const expected: Resource = objectLoader.createCompactedResource({
          list: [
            '"A"',
            '"B"',
            '"C"',
          ],
        });
        expected.list![0].property.lazy = objectLoader.createCompactedResource('"true"');
        expected.list![1].property.lazy = objectLoader.createCompactedResource('"true"');
        expected.list![2].property.lazy = objectLoader.createCompactedResource('"true"');
        expectOutputProperties(handler
          .applyParameterValues(configRoot, param, configElement, genericsContext), expected);
      });
    });
  });
});
