import * as fs from 'fs';
import type { Resource } from 'rdf-object';
import { RdfObjectLoader } from 'rdf-object/lib/RdfObjectLoader';
import { ParameterHandler } from '../../../lib/preprocess/ParameterHandler';
import 'jest-rdf';

describe('ParameterHandler', () => {
  let objectLoader: RdfObjectLoader;
  let handler: ParameterHandler;
  let configRoot: Resource;
  let param: Resource;
  let configElement: Resource;
  beforeEach(async() => {
    objectLoader = new RdfObjectLoader({
      context: JSON.parse(fs.readFileSync(`${__dirname}/../../../components/context.jsonld`, 'utf8')),
    });
    await objectLoader.context;
    handler = new ParameterHandler({ objectLoader });

    configRoot = objectLoader.createCompactedResource({
      types: 'ex:Component1',
      extends: 'ex:Component1Super',
    });
    configElement = objectLoader.createCompactedResource({
      '@id': 'ex:myConfig',
    });
  });

  function expectOutputProperties(outputs: Resource[], expected: Resource[]) {
    expect(outputs.length).toEqual(expected.length);
    for (const [ i, output ] of outputs.entries()) {
      expect(output.toQuads()).toBeRdfIsomorphic(expected[i].toQuads());
    }
  }

  function expectOutputOnlyTerm(outputs: Resource[], expected: Resource[]) {
    expect(outputs.length).toEqual(expected.length);
    for (const [ i, output ] of outputs.entries()) {
      expect(Object.keys(outputs[i].properties)).toEqual([]);
      expect(outputs[i].term).toEqualRdfTerm(expected[i].term);
    }
  }

  describe('applyParameterValues', () => {
    describe('for plain parameter', () => {
      beforeEach(() => {
        param = objectLoader.createCompactedResource('ex:myParam');
      });

      it('should be empty for an undefined value', () => {
        const expected: Resource[] = [];
        expectOutputOnlyTerm(handler.applyParameterValues(configRoot, param, configElement), expected);
      });

      it('should handle one set value', () => {
        configElement = objectLoader.createCompactedResource({
          'ex:myParam': '"ABC"',
        });
        const expected: Resource[] = [
          objectLoader.createCompactedResource('"ABC"'),
        ];
        expectOutputOnlyTerm(handler.applyParameterValues(configRoot, param, configElement), expected);
      });

      it('should handle multiple set values', () => {
        configElement = objectLoader.createCompactedResource({
          'ex:myParam': [
            '"A"',
            '"B"',
            '"C"',
          ],
        });
        const expected: Resource[] = [
          objectLoader.createCompactedResource('"A"'),
          objectLoader.createCompactedResource('"B"'),
          objectLoader.createCompactedResource('"C"'),
        ];
        expectOutputOnlyTerm(handler.applyParameterValues(configRoot, param, configElement), expected);
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
        const expected: Resource[] = [
          objectLoader.createCompactedResource('"A"'),
          objectLoader.createCompactedResource('"B"'),
          objectLoader.createCompactedResource('"C"'),
        ];
        expectOutputOnlyTerm(handler.applyParameterValues(configRoot, param, configElement), expected);
      });

      it('should handle multiple list values', () => {
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
        const expected: Resource[] = [
          objectLoader.createCompactedResource('"A"'),
          objectLoader.createCompactedResource('"B"'),
          objectLoader.createCompactedResource('"C"'),
        ];
        expectOutputOnlyTerm(handler.applyParameterValues(configRoot, param, configElement), expected);
      });

      it('should handle list and set values', () => {
        configElement = objectLoader.createCompactedResource({
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
        const expected: Resource[] = [
          objectLoader.createCompactedResource('"A"'),
          objectLoader.createCompactedResource('"B"'),
          objectLoader.createCompactedResource('"C"'),
        ];
        expectOutputOnlyTerm(handler.applyParameterValues(configRoot, param, configElement), expected);
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
          const expected: Resource[] = [
            objectLoader.createCompactedResource('"DEFAULT"'),
          ];
          expectOutputOnlyTerm(handler.applyParameterValues(configRoot, param, configElement), expected);
        });

        it('should override the default with one set value', () => {
          configElement = objectLoader.createCompactedResource({
            'ex:myParam': '"ABC"',
          });
          const expected: Resource[] = [
            objectLoader.createCompactedResource('"ABC"'),
          ];
          expectOutputOnlyTerm(handler.applyParameterValues(configRoot, param, configElement), expected);
        });

        it('should override the default with multiple set values', () => {
          configElement = objectLoader.createCompactedResource({
            'ex:myParam': [
              '"A"',
              '"B"',
              '"C"',
            ],
          });
          const expected: Resource[] = [
            objectLoader.createCompactedResource('"A"'),
            objectLoader.createCompactedResource('"B"'),
            objectLoader.createCompactedResource('"C"'),
          ];
          expectOutputOnlyTerm(handler.applyParameterValues(configRoot, param, configElement), expected);
        });
      });

      describe('with multiple defaults', () => {
        beforeEach(() => {
          param = objectLoader.createCompactedResource({
            '@id': 'ex:myParam',
            default: [
              '"DEFAULT1"',
              '"DEFAULT2"',
            ],
          });
        });

        it('should be the default for an undefined value', () => {
          const expected: Resource[] = [
            objectLoader.createCompactedResource('"DEFAULT1"'),
            objectLoader.createCompactedResource('"DEFAULT2"'),
          ];
          expectOutputOnlyTerm(handler.applyParameterValues(configRoot, param, configElement), expected);
        });

        it('should override the default with one set value', () => {
          configElement = objectLoader.createCompactedResource({
            'ex:myParam': '"ABC"',
          });
          const expected: Resource[] = [
            objectLoader.createCompactedResource('"ABC"'),
          ];
          expectOutputOnlyTerm(handler.applyParameterValues(configRoot, param, configElement), expected);
        });

        it('should override the default with multiple set values', () => {
          configElement = objectLoader.createCompactedResource({
            'ex:myParam': [
              '"A"',
              '"B"',
              '"C"',
            ],
          });
          const expected: Resource[] = [
            objectLoader.createCompactedResource('"A"'),
            objectLoader.createCompactedResource('"B"'),
            objectLoader.createCompactedResource('"C"'),
          ];
          expectOutputOnlyTerm(handler.applyParameterValues(configRoot, param, configElement), expected);
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
          const expected: Resource[] = [
            objectLoader.createCompactedResource('"DEFAULT"'),
          ];
          expectOutputOnlyTerm(handler.applyParameterValues(configRoot, param, configElement), expected);
        });

        it('should override the default with one set value', () => {
          configElement = objectLoader.createCompactedResource({
            'ex:myParam': '"ABC"',
          });
          const expected: Resource[] = [
            objectLoader.createCompactedResource('"ABC"'),
          ];
          expectOutputOnlyTerm(handler.applyParameterValues(configRoot, param, configElement), expected);
        });

        it('should override the default with multiple set values', () => {
          configElement = objectLoader.createCompactedResource({
            'ex:myParam': [
              '"A"',
              '"B"',
              '"C"',
            ],
          });
          const expected: Resource[] = [
            objectLoader.createCompactedResource('"A"'),
            objectLoader.createCompactedResource('"B"'),
            objectLoader.createCompactedResource('"C"'),
          ];
          expectOutputOnlyTerm(handler.applyParameterValues(configRoot, param, configElement), expected);
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
          const expected: Resource[] = [
            objectLoader.createCompactedResource('"DEFAULT"'),
          ];
          expectOutputOnlyTerm(handler.applyParameterValues(configRoot, param, configElement), expected);
        });

        it('should override the default with one set value', () => {
          configElement = objectLoader.createCompactedResource({
            'ex:myParam': '"ABC"',
          });
          const expected: Resource[] = [
            objectLoader.createCompactedResource('"ABC"'),
          ];
          expectOutputOnlyTerm(handler.applyParameterValues(configRoot, param, configElement), expected);
        });

        it('should override the default with multiple set values', () => {
          configElement = objectLoader.createCompactedResource({
            'ex:myParam': [
              '"A"',
              '"B"',
              '"C"',
            ],
          });
          const expected: Resource[] = [
            objectLoader.createCompactedResource('"A"'),
            objectLoader.createCompactedResource('"B"'),
            objectLoader.createCompactedResource('"C"'),
          ];
          expectOutputOnlyTerm(handler.applyParameterValues(configRoot, param, configElement), expected);
        });
      });

      describe('with multiple applicable default scoped values', () => {
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

        it('should be the default for an undefined value', () => {
          const expected: Resource[] = [
            objectLoader.createCompactedResource('"DEFAULT1"'),
            objectLoader.createCompactedResource('"DEFAULT2"'),
          ];
          expectOutputOnlyTerm(handler.applyParameterValues(configRoot, param, configElement), expected);
        });

        it('should override the default with one set value', () => {
          configElement = objectLoader.createCompactedResource({
            'ex:myParam': '"ABC"',
          });
          const expected: Resource[] = [
            objectLoader.createCompactedResource('"ABC"'),
          ];
          expectOutputOnlyTerm(handler.applyParameterValues(configRoot, param, configElement), expected);
        });

        it('should override the default with multiple set values', () => {
          configElement = objectLoader.createCompactedResource({
            'ex:myParam': [
              '"A"',
              '"B"',
              '"C"',
            ],
          });
          const expected: Resource[] = [
            objectLoader.createCompactedResource('"A"'),
            objectLoader.createCompactedResource('"B"'),
            objectLoader.createCompactedResource('"C"'),
          ];
          expectOutputOnlyTerm(handler.applyParameterValues(configRoot, param, configElement), expected);
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
          const expected: Resource[] = [];
          expectOutputOnlyTerm(handler.applyParameterValues(configRoot, param, configElement), expected);
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
          const expected: Resource[] = [];
          expectOutputOnlyTerm(handler.applyParameterValues(configRoot, param, configElement), expected);
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
          const expected: Resource[] = [];
          expectOutputOnlyTerm(handler.applyParameterValues(configRoot, param, configElement), expected);
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
          const expected: Resource[] = [
            objectLoader.createCompactedResource('"DEFAULT1"'),
          ];
          expectOutputOnlyTerm(handler.applyParameterValues(configRoot, param, configElement), expected);
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
          const expected: Resource[] = [
            objectLoader.createCompactedResource('"DEFAULT1"'),
            objectLoader.createCompactedResource('"DEFAULT2"'),
          ];
          expectOutputOnlyTerm(handler.applyParameterValues(configRoot, param, configElement), expected);
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
          expect(() => handler.applyParameterValues(configRoot, param, configElement))
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
          expect(() => handler.applyParameterValues(configRoot, param, configElement))
            .toThrowError(/^Invalid defaultScoped for parameter "ex:myParam": Missing defaultScopedValue/u);
        });
      });
    });

    describe('for parameter that is required', () => {
      beforeEach(() => {
        param = objectLoader.createCompactedResource({
          '@id': 'ex:myParam',
          required: '"true"',
        });
      });

      it('should throw for an undefined value', () => {
        expect(() => handler.applyParameterValues(configRoot, param, configElement))
          .toThrowError(/^No value was set for required parameter "ex:myParam"/u);
      });

      it('should allow one set value', () => {
        configElement = objectLoader.createCompactedResource({
          'ex:myParam': '"ABC"',
        });
        const expected: Resource[] = [
          objectLoader.createCompactedResource('"ABC"'),
        ];
        expectOutputOnlyTerm(handler.applyParameterValues(configRoot, param, configElement), expected);
      });

      it('should allow multiple set values', () => {
        configElement = objectLoader.createCompactedResource({
          'ex:myParam': [
            '"A"',
            '"B"',
            '"C"',
          ],
        });
        const expected: Resource[] = [
          objectLoader.createCompactedResource('"A"'),
          objectLoader.createCompactedResource('"B"'),
          objectLoader.createCompactedResource('"C"'),
        ];
        expectOutputOnlyTerm(handler.applyParameterValues(configRoot, param, configElement), expected);
      });
    });

    describe('for parameter with fixed values', () => {
      describe('with one fixed value', () => {
        beforeEach(() => {
          param = objectLoader.createCompactedResource({
            '@id': 'ex:myParam',
            fixed: '"FIXED"',
          });
        });

        it('should return the fixed value for an undefined value', () => {
          const expected: Resource[] = [
            objectLoader.createCompactedResource('"FIXED"'),
          ];
          expectOutputOnlyTerm(handler.applyParameterValues(configRoot, param, configElement), expected);
        });

        it('should allow one additional set value', () => {
          configElement = objectLoader.createCompactedResource({
            'ex:myParam': '"ABC"',
          });
          const expected: Resource[] = [
            objectLoader.createCompactedResource('"FIXED"'),
            objectLoader.createCompactedResource('"ABC"'),
          ];
          expectOutputOnlyTerm(handler.applyParameterValues(configRoot, param, configElement), expected);
        });

        it('should allow multiple additional set values', () => {
          configElement = objectLoader.createCompactedResource({
            'ex:myParam': [
              '"A"',
              '"B"',
              '"C"',
            ],
          });
          const expected: Resource[] = [
            objectLoader.createCompactedResource('"FIXED"'),
            objectLoader.createCompactedResource('"A"'),
            objectLoader.createCompactedResource('"B"'),
            objectLoader.createCompactedResource('"C"'),
          ];
          expectOutputOnlyTerm(handler.applyParameterValues(configRoot, param, configElement), expected);
        });
      });

      describe('with multiple fixed values', () => {
        beforeEach(() => {
          param = objectLoader.createCompactedResource({
            '@id': 'ex:myParam',
            fixed: [
              '"FIXED1"',
              '"FIXED2"',
            ],
          });
        });

        it('should return the fixed values for an undefined value', () => {
          const expected: Resource[] = [
            objectLoader.createCompactedResource('"FIXED1"'),
            objectLoader.createCompactedResource('"FIXED2"'),
          ];
          expectOutputOnlyTerm(handler.applyParameterValues(configRoot, param, configElement), expected);
        });

        it('should allow one additional set value', () => {
          configElement = objectLoader.createCompactedResource({
            'ex:myParam': '"ABC"',
          }); const expected: Resource[] = [
            objectLoader.createCompactedResource('"FIXED1"'),
            objectLoader.createCompactedResource('"FIXED2"'),
            objectLoader.createCompactedResource('"ABC"'),
          ];
          expectOutputOnlyTerm(handler.applyParameterValues(configRoot, param, configElement), expected);
        });

        it('should allow multiple additional set values', () => {
          configElement = objectLoader.createCompactedResource({
            'ex:myParam': [
              '"A"',
              '"B"',
              '"C"',
            ],
          });
          const expected: Resource[] = [
            objectLoader.createCompactedResource('"FIXED1"'),
            objectLoader.createCompactedResource('"FIXED2"'),
            objectLoader.createCompactedResource('"A"'),
            objectLoader.createCompactedResource('"B"'),
            objectLoader.createCompactedResource('"C"'),
          ];
          expectOutputOnlyTerm(handler.applyParameterValues(configRoot, param, configElement), expected);
        });
      });

      describe('should prioritize fixed values when param is unique', () => {
        beforeEach(() => {
          param = objectLoader.createCompactedResource({
            '@id': 'ex:myParam',
            fixed: [
              '"FIXED1"',
              '"FIXED2"',
            ],
            unique: '"true"',
          });
        });

        it('should return the first fixed value for an undefined value', () => {
          const expected: Resource[] = [
            objectLoader.createCompactedResource('"FIXED1"'),
          ];
          expected[0].property.unique = objectLoader.createCompactedResource('"true"');
          expectOutputProperties(handler.applyParameterValues(configRoot, param, configElement), expected);
        });

        it('should handle one additional set value', () => {
          const expected: Resource[] = [
            objectLoader.createCompactedResource('"FIXED1"'),
          ];
          expected[0].property.unique = objectLoader.createCompactedResource('"true"');
          configElement = objectLoader.createCompactedResource({
            'ex:myParam': '"ABC"',
          });
          expectOutputProperties(handler.applyParameterValues(configRoot, param, configElement), expected);
        });

        it('should handle multiple additional set values', () => {
          const expected: Resource[] = [
            objectLoader.createCompactedResource('"FIXED1"'),
          ];
          expected[0].property.unique = objectLoader.createCompactedResource('"true"');
          configElement = objectLoader.createCompactedResource({
            'ex:myParam': [
              '"A"',
              '"B"',
              '"C"',
            ],
          });
          expectOutputProperties(handler.applyParameterValues(configRoot, param, configElement), expected);
        });
      });
    });

    describe('for parameter with unique values', () => {
      beforeEach(() => {
        param = objectLoader.createCompactedResource({
          '@id': 'ex:myParam',
          unique: '"true"',
        });
      });

      it('should allow an undefined value', () => {
        const expected: Resource[] = [];
        expectOutputProperties(handler.applyParameterValues(configRoot, param, configElement), expected);
      });

      it('should allow one set value', () => {
        configElement = objectLoader.createCompactedResource({
          'ex:myParam': '"ABC"',
        });
        const expected: Resource[] = [
          objectLoader.createCompactedResource('"ABC"'),
        ];
        expected[0].property.unique = objectLoader.createCompactedResource('"true"');
        expectOutputProperties(handler.applyParameterValues(configRoot, param, configElement), expected);
      });

      it('should allow multiple set values, but only take the first', () => {
        configElement = objectLoader.createCompactedResource({
          'ex:myParam': [
            '"A"',
            '"B"',
            '"C"',
          ],
        });
        const expected: Resource[] = [
          objectLoader.createCompactedResource('"A"'),
        ];
        expected[0].property.unique = objectLoader.createCompactedResource('"true"');
        expectOutputProperties(handler.applyParameterValues(configRoot, param, configElement), expected);
      });

      it('should allow one resource value', () => {
        configElement = objectLoader.createCompactedResource({
          'ex:myParam': {
            a: '"ABC"',
          },
        });
        const expected: Resource[] = [
          objectLoader.createCompactedResource({
            a: '"ABC"',
          }),
        ];
        expected[0].property.unique = objectLoader.createCompactedResource('"true"');
        expectOutputProperties(handler.applyParameterValues(configRoot, param, configElement), expected);
      });
    });

    describe('for parameter with a range', () => {
      beforeEach(() => {
        param = objectLoader.createCompactedResource({
          '@id': 'ex:myParam',
          range: 'xsd:boolean',
        });
      });

      it('should allow an undefined value', () => {
        const expected: Resource[] = [];
        expectOutputOnlyTerm(handler.applyParameterValues(configRoot, param, configElement), expected);
      });

      it('should allow one set boolean value', () => {
        configElement = objectLoader.createCompactedResource({
          'ex:myParam': '"true"',
        });
        const expected: Resource[] = [
          objectLoader.createCompactedResource('"true"'),
        ];
        const outputs = handler.applyParameterValues(configRoot, param, configElement);
        expectOutputOnlyTerm(outputs, expected);
      });

      it('should allow multiple set boolean values', () => {
        configElement = objectLoader.createCompactedResource({
          'ex:myParam': [
            '"true"',
            '"false"',
            '"true"',
          ],
        });
        const expected: Resource[] = [
          objectLoader.createCompactedResource('"true"'),
          objectLoader.createCompactedResource('"false"'),
          objectLoader.createCompactedResource('"true"'),
        ];
        const outputs = handler.applyParameterValues(configRoot, param, configElement);
        expectOutputOnlyTerm(outputs, expected);
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
        const expected: Resource[] = [];
        expectOutputProperties(handler.applyParameterValues(configRoot, param, configElement), expected);
      });

      it('should allow one set value, and inherit lazy property', () => {
        configElement = objectLoader.createCompactedResource({
          'ex:myParam': '"ABC"',
        });
        const expected: Resource[] = [
          objectLoader.createCompactedResource('"ABC"'),
        ];
        expected[0].property.lazy = objectLoader.createCompactedResource('"true"');
        expectOutputProperties(handler.applyParameterValues(configRoot, param, configElement), expected);
      });

      it('should allow multiple set values, and inherit lazy property on all', () => {
        configElement = objectLoader.createCompactedResource({
          'ex:myParam': [
            '"A"',
            '"B"',
            '"C"',
          ],
        });
        const expected: Resource[] = [
          objectLoader.createCompactedResource('"A"'),
          objectLoader.createCompactedResource('"B"'),
          objectLoader.createCompactedResource('"C"'),
        ];
        expected[0].property.lazy = objectLoader.createCompactedResource('"true"');
        expected[1].property.lazy = objectLoader.createCompactedResource('"true"');
        expected[2].property.lazy = objectLoader.createCompactedResource('"true"');
        expectOutputProperties(handler.applyParameterValues(configRoot, param, configElement), expected);
      });
    });
  });
});
