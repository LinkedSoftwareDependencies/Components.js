import * as fs from 'fs';
import { RdfObjectLoader } from 'rdf-object/lib/RdfObjectLoader';
import type { Resource } from 'rdf-object/lib/Resource';
import type { IComponentConfigPreprocessorHandleResponse } from '../../../lib/preprocess/ConfigPreprocessorComponent';
import { ConfigPreprocessorComponentMapped } from '../../../lib/preprocess/ConfigPreprocessorComponentMapped';
import 'jest-rdf';
import { ParameterHandler } from '../../../lib/preprocess/ParameterHandler';

describe('ConfigPreprocessorComponentMapped', () => {
  let objectLoader: RdfObjectLoader;
  let componentResources: Record<string, Resource>;
  let preprocessor: ConfigPreprocessorComponentMapped;

  beforeEach(async() => {
    objectLoader = new RdfObjectLoader({
      context: JSON.parse(fs.readFileSync(`${__dirname}/../../../components/context.jsonld`, 'utf8')),
    });
    await objectLoader.context;
    componentResources = {
      'ex:Component': objectLoader.createCompactedResource({
        '@id': 'ex:Component',
        module: 'ex:Module',
        parameters: {
          '@id': 'ex:param1',
        },
        constructorArguments: {
          '@id': 'ex:Component#constructorArgs',
        },
      }),
    };
    preprocessor = new ConfigPreprocessorComponentMapped({
      objectLoader,
      componentResources,
      runTypeConfigs: {},
      parameterHandler: new ParameterHandler({ objectLoader }),
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
    expect(Object.keys(outputs[0].properties)).toEqual([]);
    expect(outputs[0].term).toEqualRdfTerm(expected[0].term);
  }

  describe('canHandle', () => {
    it('should return module and component for valid config', () => {
      const config = objectLoader.createCompactedResource({
        '@id': 'ex:myComponentInstance',
        types: 'ex:Component',
      });
      const { module, component } = <IComponentConfigPreprocessorHandleResponse> preprocessor.canHandle(config);
      expect(module).toBe(componentResources['ex:Component'].property.module);
      expect(component).toBe(componentResources['ex:Component']);
    });

    it('should not inherit parameters', () => {
      // Define inheriting component
      componentResources['ex:ComponentInherit'] = objectLoader.createCompactedResource({
        '@id': 'ex:ComponentInherit',
        module: 'ex:Module',
        parameters: {
          '@id': 'ex:ComponentInherit#param1',
          inheritValues: {
            types: 'owl:Restriction',
            onParameter: 'ex:OtherComponent#param1',
            from: 'ex:OtherComponent',
          },
        },
        constructorArguments: {
          '@id': 'ex:ComponentInherit#constructorArgs',
        },
      });
      // Define other component instance
      (<any> preprocessor).runTypeConfigs['ex:OtherComponent'] = [
        objectLoader.createCompactedResource({
          '@id': 'ex:myOtherComponentInstance',
          types: 'ex:OtherComponent',
          'ex:OtherComponent#param1': '"ABC"',
        }),
      ];

      const configIn = objectLoader.createCompactedResource({
        types: 'ex:ComponentInherit',
      });
      const configOut = objectLoader.createCompactedResource({
        types: 'ex:ComponentInherit',
      });
      preprocessor.canHandle(configIn);
      expect(configIn.toQuads()).toBeRdfIsomorphic(configOut.toQuads());
    });

    it('should store one config into runTypeConfigs by component type', () => {
      const config = objectLoader.createCompactedResource({
        '@id': 'ex:myComponentInstance1',
        types: 'ex:Component',
      });
      preprocessor.canHandle(config);
      expect((<any> preprocessor).runTypeConfigs['ex:Component'][0]).toBe(config);
    });

    it('should not handle component without constructorArguments', () => {
      componentResources['ex:ComponentNoConstrArgs'] = objectLoader.createCompactedResource({
        '@id': 'ex:ComponentNoConstrArgs',
        module: 'ex:Module',
        parameters: {
          '@id': 'ex:param1',
        },
      });
      const config = objectLoader.createCompactedResource({
        '@id': 'ex:myComponentInstance',
        types: 'ex:ComponentNoConstrArgs',
      });
      expect(preprocessor.canHandle(config)).toBeUndefined();
    });
  });

  describe('transformConstructorArguments', () => {
    it('should use constructorArguments of the component', () => {
      const config = objectLoader.createCompactedResource({
        'ex:param1': '"A"',
      });
      const handleResponse = {
        component: objectLoader.createCompactedResource({
          constructorArguments: {
            key: '"KEY"',
            value: 'ex:param1',
          },
        }),
        module: objectLoader.createCompactedResource({}),
      };
      const expected = [
        objectLoader.createCompactedResource({
          key: '"KEY"',
          value: '"A"',
        }),
      ];
      expectOutputProperties(preprocessor.transformConstructorArguments(config, handleResponse), expected);
    });
  });

  describe('applyConstructorArgumentsParameters', () => {
    it('should pass args with no known properties', () => {
      const configRoot = objectLoader.createCompactedResource({});
      const constructorArgs = objectLoader.createCompactedResource({
        unknown: '"unknown"',
      });
      const configElement = objectLoader.createCompactedResource({});
      const expected = [
        constructorArgs,
      ];
      expectOutputProperties(preprocessor
        .applyConstructorArgumentsParameters(configRoot, constructorArgs, configElement), expected);
    });

    it('should pass args with literal key and one value', () => {
      const configRoot = objectLoader.createCompactedResource({});
      const constructorArgs = objectLoader.createCompactedResource({
        key: '"KEY"',
        value: 'ex:param1',
      });
      const configElement = objectLoader.createCompactedResource({
        'ex:param1': '"A"',
      });
      const expected = [
        objectLoader.createCompactedResource({
          key: '"KEY"',
          value: '"A"',
        }),
      ];
      expectOutputProperties(preprocessor
        .applyConstructorArgumentsParameters(configRoot, constructorArgs, configElement), expected);
    });

    it('should pass args with literal key and multiple values', () => {
      const configRoot = objectLoader.createCompactedResource({});
      const constructorArgs = objectLoader.createCompactedResource({
        key: '"KEY"',
        value: 'ex:param1',
      });
      const configElement = objectLoader.createCompactedResource({
        'ex:param1': [
          '"A"',
          '"B"',
        ],
      });
      const expected = [
        objectLoader.createCompactedResource({
          key: '"KEY"',
          value: [
            '"A"',
            '"B"',
          ],
        }),
      ];
      expectOutputProperties(preprocessor
        .applyConstructorArgumentsParameters(configRoot, constructorArgs, configElement), expected);
    });

    it('should pass args with literal key and one raw value', () => {
      const configRoot = objectLoader.createCompactedResource({});
      const constructorArgs = objectLoader.createCompactedResource({
        key: '"KEY"',
        valueRawReference: 'ex:param1',
      });
      const configElement = objectLoader.createCompactedResource({
        'ex:param1': '"A"',
      });
      const expected = [
        objectLoader.createCompactedResource({
          key: '"KEY"',
          value: '"A"',
        }),
      ];
      expectOutputProperties(preprocessor
        .applyConstructorArgumentsParameters(configRoot, constructorArgs, configElement), expected);
    });

    it('should pass args without key and one value', () => {
      const configRoot = objectLoader.createCompactedResource({});
      const constructorArgs = objectLoader.createCompactedResource({
        value: 'ex:param1',
      });
      const configElement = objectLoader.createCompactedResource({
        'ex:param1': '"A"',
      });
      const expected = [
        objectLoader.createCompactedResource('"A"'),
      ];
      expectOutputOnlyTerm(preprocessor
        .applyConstructorArgumentsParameters(configRoot, constructorArgs, configElement), expected);
    });

    it('should pass args without key and one raw value', () => {
      const configRoot = objectLoader.createCompactedResource({});
      const constructorArgs = objectLoader.createCompactedResource({
        valueRawReference: 'ex:param1',
      });
      const configElement = objectLoader.createCompactedResource({
        'ex:param1': '"A"',
      });
      const expected = [
        objectLoader.createCompactedResource('"A"'),
      ];
      expected[0].property.unique = objectLoader.createCompactedResource('"true"');
      expectOutputProperties(preprocessor
        .applyConstructorArgumentsParameters(configRoot, constructorArgs, configElement), expected);
    });

    it('should throw on IRI key and value without collectEntries', () => {
      const configRoot = objectLoader.createCompactedResource({});
      const constructorArgs = objectLoader.createCompactedResource({
        key: 'ex:key',
        value: 'ex:param1',
      });
      const configElement = objectLoader.createCompactedResource({
        'ex:param1': '"A"',
      });
      expect(() => preprocessor.applyConstructorArgumentsParameters(configRoot, constructorArgs, configElement))
        .toThrowError(/^Detected illegal IRI object key, which is only allowed with collectEntries/u);
    });

    it('should pass args with collectEntries', () => {
      const configRoot = objectLoader.createCompactedResource({});
      const constructorArgs = objectLoader.createCompactedResource({
        collectEntries: 'ex:param1',
        key: 'ex:param1#k',
        value: 'ex:param1#v',
      });
      const configElement = objectLoader.createCompactedResource({
        'ex:param1': [
          {
            'ex:param1#k': '"KEY1"',
            'ex:param1#v': '"VALUE1"',
          },
        ],
      });
      const expected = [
        objectLoader.createCompactedResource({
          key: '"KEY1"',
          value: '"VALUE1"',
        }),
      ];
      expectOutputProperties(preprocessor
        .applyConstructorArgumentsParameters(configRoot, constructorArgs, configElement), expected);
    });

    it('should throw on collectEntries that refers to a literal', () => {
      const configRoot = objectLoader.createCompactedResource({});
      const constructorArgs = objectLoader.createCompactedResource({
        collectEntries: '"INVALID"',
        key: 'ex:param1#k',
        value: 'ex:param1#v',
      });
      const configElement = objectLoader.createCompactedResource({
        'ex:param1': [
          {
            'ex:param1#k': '"KEY1"',
            'ex:param1#v': '"VALUE1"',
          },
        ],
      });
      expect(() => preprocessor.applyConstructorArgumentsParameters(configRoot, constructorArgs, configElement))
        .toThrowError(/^Detected illegal collectEntries value "Literal", must be an IRI/u);
    });

    it('should pass args with collectEntries with multiple values', () => {
      const configRoot = objectLoader.createCompactedResource({});
      const constructorArgs = objectLoader.createCompactedResource({
        collectEntries: [
          'ex:param1',
          'ex:param2',
        ],
        key: 'ex:param1#k',
        value: 'ex:param1#v',
      });
      const configElement = objectLoader.createCompactedResource({
        'ex:param1': [
          {
            'ex:param1#k': '"KEY1"',
            'ex:param1#v': '"VALUE1"',
          },
        ],
        'ex:param2': [
          {
            'ex:param1#k': '"KEY2"',
            'ex:param1#v': '"VALUE2"',
          },
        ],
      });
      const expected = [
        objectLoader.createCompactedResource({
          key: '"KEY1"',
          value: '"VALUE1"',
        }),
        objectLoader.createCompactedResource({
          key: '"KEY2"',
          value: '"VALUE2"',
        }),
      ];
      expectOutputProperties(preprocessor
        .applyConstructorArgumentsParameters(configRoot, constructorArgs, configElement), expected);
    });

    it('should pass args with collectEntries with key rdf:subject', () => {
      const configRoot = objectLoader.createCompactedResource({});
      const constructorArgs = objectLoader.createCompactedResource({
        collectEntries: 'ex:param1',
        key: 'rdf:subject',
        value: 'ex:param1#v',
      });
      const configElement = objectLoader.createCompactedResource({
        'ex:param1': [
          {
            '@id': 'ex:abc',
            'ex:param1#v': '"VALUE1"',
          },
        ],
      });
      const expected = [
        objectLoader.createCompactedResource({
          key: '"ex:abc"',
          value: '"VALUE1"',
        }),
      ];
      expectOutputProperties(preprocessor
        .applyConstructorArgumentsParameters(configRoot, constructorArgs, configElement), expected);
    });

    it('should throw on collectEntries with multiple key values', () => {
      const configRoot = objectLoader.createCompactedResource({});
      const constructorArgs = objectLoader.createCompactedResource({
        collectEntries: 'ex:param1',
        key: 'ex:param1#k',
        value: 'ex:param1#v',
      });
      const configElement = objectLoader.createCompactedResource({
        'ex:param1': [
          {
            'ex:param1#k': [ '"KEY1"', '"KEY2"' ],
            'ex:param1#v': '"VALUE1"',
          },
        ],
      });
      expect(() => preprocessor.applyConstructorArgumentsParameters(configRoot, constructorArgs, configElement))
        .toThrowError(/^Detected more than one key value in collectEntries/u);
    });

    it('should pass args with collectEntries without key mapping', () => {
      const configRoot = objectLoader.createCompactedResource({});
      const constructorArgs = objectLoader.createCompactedResource({
        collectEntries: 'ex:param1',
        value: 'ex:param1#v',
      });
      const configElement = objectLoader.createCompactedResource({
        'ex:param1': [
          {
            'ex:param1#v': '"VALUE1"',
          },
        ],
      });
      const expected = [
        objectLoader.createCompactedResource('"VALUE1"'),
      ];
      expectOutputOnlyTerm(preprocessor
        .applyConstructorArgumentsParameters(configRoot, constructorArgs, configElement), expected);
    });

    it('should pass args with collectEntries with value rdf:subject', () => {
      const configRoot = objectLoader.createCompactedResource({});
      const constructorArgs = objectLoader.createCompactedResource({
        collectEntries: 'ex:param1',
        key: 'ex:param1#k',
        value: 'rdf:subject',
      });
      const configElement = objectLoader.createCompactedResource({
        'ex:param1': [
          {
            '@id': 'ex:abc',
            'ex:param1#k': '"KEY1"',
          },
        ],
      });
      const expected = [
        objectLoader.createCompactedResource({
          key: '"KEY1"',
          value: '"ex:abc"',
        }),
      ];
      expectOutputProperties(preprocessor
        .applyConstructorArgumentsParameters(configRoot, constructorArgs, configElement), expected);
    });

    it('should pass args with collectEntries with value rdf:object', () => {
      const configRoot = objectLoader.createCompactedResource({});
      const constructorArgs = objectLoader.createCompactedResource({
        collectEntries: 'ex:param1',
        key: 'ex:param1#k',
        value: 'rdf:object',
      });
      const configElement = objectLoader.createCompactedResource({
        'ex:param1': [
          {
            '@id': 'ex:abc',
            'ex:param1#k': '"KEY1"',
          },
        ],
      });
      const expected = [
        objectLoader.createCompactedResource({
          key: '"KEY1"',
          value: 'ex:abc',
        }),
      ];
      expectOutputProperties(preprocessor
        .applyConstructorArgumentsParameters(configRoot, constructorArgs, configElement), expected);
    });

    it('should pass args with collectEntries with sub-fields', () => {
      const configRoot = objectLoader.createCompactedResource({});
      const constructorArgs = objectLoader.createCompactedResource({
        collectEntries: 'ex:param1',
        key: 'ex:param1#k',
        value: {
          fields: {
            key: '"SUBKEY"',
            value: 'ex:param1#v',
          },
        },
      });
      const configElement = objectLoader.createCompactedResource({
        'ex:param1': [
          {
            'ex:param1#k': '"KEY1"',
            'ex:param1#v': '"VALUE1"',
          },
        ],
      });
      const expected = [
        objectLoader.createCompactedResource({
          key: '"KEY1"',
          value: {
            fields: {
              key: '"SUBKEY"',
              value: '"VALUE1"',
            },
            unique: '"true"',
            hasFields: '"true"',
          },
        }),
      ];
      expectOutputProperties(preprocessor
        .applyConstructorArgumentsParameters(configRoot, constructorArgs, configElement), expected);
    });

    it('should pass args with collectEntries with sub-elements', () => {
      const configRoot = objectLoader.createCompactedResource({});
      const constructorArgs = objectLoader.createCompactedResource({
        collectEntries: 'ex:param1',
        key: 'ex:param1#k',
        value: {
          elements: {
            list: [
              'ex:param1#v',
            ],
          },
        },
      });
      const configElement = objectLoader.createCompactedResource({
        'ex:param1': [
          {
            'ex:param1#k': '"KEY1"',
            'ex:param1#v': '"VALUE1"',
          },
        ],
      });
      const expected = [
        objectLoader.createCompactedResource({
          key: '"KEY1"',
          value: {
            value: '"VALUE1"',
            unique: '"true"',
          },
        }),
      ];
      expectOutputProperties(preprocessor
        .applyConstructorArgumentsParameters(configRoot, constructorArgs, configElement), expected);
    });

    it('should pass args with collectEntries with multiple value values', () => {
      const configRoot = objectLoader.createCompactedResource({});
      const constructorArgs = objectLoader.createCompactedResource({
        collectEntries: 'ex:param1',
        key: 'ex:param1#k',
        value: 'ex:param1#v',
      });
      const configElement = objectLoader.createCompactedResource({
        'ex:param1': [
          {
            'ex:param1#k': '"KEY1"',
            'ex:param1#v': [ '"VALUE1"', '"VALUE2"' ],
          },
        ],
      });
      expect(() => preprocessor.applyConstructorArgumentsParameters(configRoot, constructorArgs, configElement))
        .toThrowError(/^Detected more than one value value in collectEntries/u);
    });

    it('should throw on collectEntries with multiple key definitions', () => {
      const configRoot = objectLoader.createCompactedResource({});
      const constructorArgs = objectLoader.createCompactedResource({
        collectEntries: 'ex:param1',
        key: [ 'ex:param1#k1', 'ex:param1#k2' ],
        value: 'ex:param1#v',
      });
      const configElement = objectLoader.createCompactedResource({
        'ex:param1': [
          {
            'ex:param1#k': '"KEY1"',
            'ex:param1#v': '"VALUE1"',
          },
        ],
      });
      expect(() => preprocessor.applyConstructorArgumentsParameters(configRoot, constructorArgs, configElement))
        .toThrowError(/^Detected more than one key definition in collectEntries/u);
    });

    it('should throw on collectEntries with multiple value definitions', () => {
      const configRoot = objectLoader.createCompactedResource({});
      const constructorArgs = objectLoader.createCompactedResource({
        collectEntries: 'ex:param1',
        key: 'ex:param1#k',
        value: [ 'ex:param1#v1', 'ex:param1#v2' ],
      });
      const configElement = objectLoader.createCompactedResource({
        'ex:param1': [
          {
            'ex:param1#k': '"KEY1"',
            'ex:param1#v': '"VALUE1"',
          },
        ],
      });
      expect(() => preprocessor.applyConstructorArgumentsParameters(configRoot, constructorArgs, configElement))
        .toThrowError(/^Detected more than one value definition in collectEntries/u);
    });

    it('should pass args with empty fields', () => {
      const configRoot = objectLoader.createCompactedResource({});
      const constructorArgs = objectLoader.createCompactedResource({
        fields: [],
      });
      const configElement = objectLoader.createCompactedResource({});
      const expected = [
        objectLoader.createCompactedResource({}),
      ];
      expectOutputProperties(preprocessor
        .applyConstructorArgumentsParameters(configRoot, constructorArgs, configElement), expected);
    });

    it('should pass args with one static field', () => {
      const configRoot = objectLoader.createCompactedResource({});
      const constructorArgs = objectLoader.createCompactedResource({
        fields: [
          {
            key: '"KEY"',
            value: '"VALUE"',
          },
        ],
      });
      const configElement = objectLoader.createCompactedResource({});
      const expected = [
        objectLoader.createCompactedResource({
          fields: [
            {
              key: '"KEY"',
              value: '"VALUE"',
            },
          ],
          unique: '"true"',
          hasFields: '"true"',
        }),
      ];
      expectOutputProperties(preprocessor
        .applyConstructorArgumentsParameters(configRoot, constructorArgs, configElement), expected);
    });

    it('should pass args with one dynamic field', () => {
      const configRoot = objectLoader.createCompactedResource({});
      const constructorArgs = objectLoader.createCompactedResource({
        fields: [
          {
            key: '"KEY"',
            value: 'ex:param1',
          },
        ],
      });
      const configElement = objectLoader.createCompactedResource({
        'ex:param1': '"VALUE"',
      });
      const expected = [
        objectLoader.createCompactedResource({
          fields: [
            {
              key: '"KEY"',
              value: '"VALUE"',
            },
          ],
          unique: '"true"',
          hasFields: '"true"',
        }),
      ];
      expectOutputProperties(preprocessor
        .applyConstructorArgumentsParameters(configRoot, constructorArgs, configElement), expected);
    });

    it('should pass args with one dynamic field with multiple values', () => {
      const configRoot = objectLoader.createCompactedResource({});
      const constructorArgs = objectLoader.createCompactedResource({
        fields: [
          {
            key: '"KEY"',
            value: 'ex:param1',
          },
        ],
      });
      const configElement = objectLoader.createCompactedResource({
        'ex:param1': [ '"VALUE1"', '"VALUE2"' ],
      });
      const expected = [
        objectLoader.createCompactedResource({
          fields: [
            {
              key: '"KEY"',
              value: [ '"VALUE1"', '"VALUE2"' ],
            },
          ],
          unique: '"true"',
          hasFields: '"true"',
        }),
      ];
      expectOutputProperties(preprocessor
        .applyConstructorArgumentsParameters(configRoot, constructorArgs, configElement), expected);
    });

    it('should pass args with multiple dynamic fields', () => {
      const configRoot = objectLoader.createCompactedResource({});
      const constructorArgs = objectLoader.createCompactedResource({
        fields: [
          {
            key: '"KEY1"',
            value: 'ex:param1',
          },
          {
            key: '"KEY2"',
            value: 'ex:param2',
          },
        ],
      });
      const configElement = objectLoader.createCompactedResource({
        'ex:param1': '"VALUE1"',
        'ex:param2': '"VALUE2"',
      });
      const expected = [
        objectLoader.createCompactedResource({
          fields: [
            {
              key: '"KEY1"',
              value: '"VALUE1"',
            },
            {
              key: '"KEY2"',
              value: '"VALUE2"',
            },
          ],
          unique: '"true"',
          hasFields: '"true"',
        }),
      ];
      expectOutputProperties(preprocessor
        .applyConstructorArgumentsParameters(configRoot, constructorArgs, configElement), expected);
    });

    it('should pass args with empty elements', () => {
      const configRoot = objectLoader.createCompactedResource({});
      const constructorArgs = objectLoader.createCompactedResource({
        elements: [],
      });
      const configElement = objectLoader.createCompactedResource({});
      const expected = [
        objectLoader.createCompactedResource({}),
      ];
      expectOutputProperties(preprocessor
        .applyConstructorArgumentsParameters(configRoot, constructorArgs, configElement), expected);
    });

    it('should pass args with one static element', () => {
      const configRoot = objectLoader.createCompactedResource({});
      const constructorArgs = objectLoader.createCompactedResource({
        elements: {
          list: [
            {
              key: '"KEY"',
              value: '"VALUE"',
            },
          ],
        },
      });
      const configElement = objectLoader.createCompactedResource({});
      const expected = [
        objectLoader.createCompactedResource({
          value: [
            {
              key: '"KEY"',
              value: '"VALUE"',
            },
          ],
        }),
      ];
      expectOutputProperties(preprocessor
        .applyConstructorArgumentsParameters(configRoot, constructorArgs, configElement), expected);
    });

    it('should pass args with one dynamic element', () => {
      const configRoot = objectLoader.createCompactedResource({});
      const constructorArgs = objectLoader.createCompactedResource({
        elements: {
          list: [
            {
              key: '"KEY"',
              value: 'ex:param1',
            },
          ],
        },
      });
      const configElement = objectLoader.createCompactedResource({
        'ex:param1': '"VALUE"',
      });
      const expected = [
        objectLoader.createCompactedResource({
          value: [
            {
              key: '"KEY"',
              value: '"VALUE"',
            },
          ],
        }),
      ];
      expectOutputProperties(preprocessor
        .applyConstructorArgumentsParameters(configRoot, constructorArgs, configElement), expected);
    });

    it('should pass args with one dynamic element with multiple values', () => {
      const configRoot = objectLoader.createCompactedResource({});
      const constructorArgs = objectLoader.createCompactedResource({
        elements: {
          list: [
            {
              key: '"KEY"',
              value: 'ex:param1',
            },
          ],
        },
      });
      const configElement = objectLoader.createCompactedResource({
        'ex:param1': [ '"VALUE1"', '"VALUE2"' ],
      });
      const expected = [
        objectLoader.createCompactedResource({
          value: [
            {
              key: '"KEY"',
              value: [ '"VALUE1"', '"VALUE2"' ],
            },
          ],
        }),
      ];
      expectOutputProperties(preprocessor
        .applyConstructorArgumentsParameters(configRoot, constructorArgs, configElement), expected);
    });

    it('should pass args with multiple dynamic elements', () => {
      const configRoot = objectLoader.createCompactedResource({});
      const constructorArgs = objectLoader.createCompactedResource({
        elements: {
          list: [
            {
              key: '"KEY1"',
              value: 'ex:param1',
            },
            {
              key: '"KEY2"',
              value: 'ex:param2',
            },
          ],
        },
      });
      const configElement = objectLoader.createCompactedResource({
        'ex:param1': '"VALUE1"',
        'ex:param2': '"VALUE2"',
      });
      const expected = [
        objectLoader.createCompactedResource({
          value: [
            {
              key: '"KEY1"',
              value: '"VALUE1"',
            },
            {
              key: '"KEY2"',
              value: '"VALUE2"',
            },
          ],
        }),
      ];
      expectOutputProperties(preprocessor
        .applyConstructorArgumentsParameters(configRoot, constructorArgs, configElement), expected);
    });

    it('should pass args with one dynamic element directly referencing a param', () => {
      const configRoot = objectLoader.createCompactedResource({});
      const constructorArgs = objectLoader.createCompactedResource({
        elements: {
          list: [
            'ex:param1',
          ],
        },
      });
      const configElement = objectLoader.createCompactedResource({
        'ex:param1': '"VALUE"',
      });
      const expected = [
        objectLoader.createCompactedResource({
          value: [
            '"VALUE"',
          ],
        }),
      ];
      expectOutputProperties(preprocessor
        .applyConstructorArgumentsParameters(configRoot, constructorArgs, configElement), expected);
    });

    it('should pass args with multiple dynamic elements directly referencing a param', () => {
      const configRoot = objectLoader.createCompactedResource({});
      const constructorArgs = objectLoader.createCompactedResource({
        elements: {
          list: [
            'ex:param1',
            'ex:param2',
          ],
        },
      });
      const configElement = objectLoader.createCompactedResource({
        'ex:param1': '"VALUE1"',
        'ex:param2': '"VALUE2"',
      });
      const expected = [
        objectLoader.createCompactedResource({
          value: [
            '"VALUE1"',
            '"VALUE2"',
          ],
        }),
      ];
      expectOutputProperties(preprocessor
        .applyConstructorArgumentsParameters(configRoot, constructorArgs, configElement), expected);
    });

    it('should throw on elements with no RDF list', () => {
      const configRoot = objectLoader.createCompactedResource({});
      const constructorArgs = objectLoader.createCompactedResource({
        elements: {
          value: '"ILLEGAL"',
        },
      });
      const configElement = objectLoader.createCompactedResource({});
      expect(() => preprocessor.applyConstructorArgumentsParameters(configRoot, constructorArgs, configElement))
        .toThrowError(/^Illegal non-RDF-list elements/u);
    });

    it('should throw on elements with literal values', () => {
      const configRoot = objectLoader.createCompactedResource({});
      const constructorArgs = objectLoader.createCompactedResource({
        elements: {
          list: [
            '"ILLEGAL"',
          ],
        },
      });
      const configElement = objectLoader.createCompactedResource({});
      expect(() => preprocessor.applyConstructorArgumentsParameters(configRoot, constructorArgs, configElement))
        .toThrowError(/^Illegal elements value, must be an IRI or resource with value\/valueRawReference/u);
    });

    it('should throw on blank node elements without value', () => {
      const configRoot = objectLoader.createCompactedResource({});
      const constructorArgs = objectLoader.createCompactedResource({
        elements: {
          list: [
            {
              something: '"SOMETHING"',
            },
          ],
        },
      });
      const configElement = objectLoader.createCompactedResource({});
      expect(() => preprocessor.applyConstructorArgumentsParameters(configRoot, constructorArgs, configElement))
        .toThrowError(/^Illegal elements value, must be an IRI or resource with value\/valueRawReference/u);
    });

    it('should pass args with an empty list', () => {
      const configRoot = objectLoader.createCompactedResource({});
      const constructorArgs = objectLoader.createCompactedResource({
        list: [],
      });
      const configElement = objectLoader.createCompactedResource({});
      const expected = [
        objectLoader.createCompactedResource({
          list: [],
        }),
      ];
      expectOutputOnlyTerm(preprocessor
        .applyConstructorArgumentsParameters(configRoot, constructorArgs, configElement), expected);
    });

    it('should pass args with a list with direct params', () => {
      const configRoot = objectLoader.createCompactedResource({});
      const constructorArgs = objectLoader.createCompactedResource({
        list: [
          'ex:param1',
          'ex:param2',
        ],
      });
      const configElement = objectLoader.createCompactedResource({
        'ex:param1': '"VALUE1"',
        'ex:param2': '"VALUE2"',
      });
      const expected = [
        objectLoader.createCompactedResource({
          list: [
            '"VALUE1"',
            '"VALUE2"',
          ],
        }),
      ];
      expectOutputProperties(preprocessor
        .applyConstructorArgumentsParameters(configRoot, constructorArgs, configElement), expected);
    });

    it('should pass args with a list with direct params with multiple values', () => {
      const configRoot = objectLoader.createCompactedResource({});
      const constructorArgs = objectLoader.createCompactedResource({
        list: [
          'ex:param1',
          'ex:param2',
        ],
      });
      const configElement = objectLoader.createCompactedResource({
        'ex:param1': [ '"VALUE1.1"', '"VALUE1.2"' ],
        'ex:param2': [ '"VALUE2.1"', '"VALUE2.2"' ],
      });
      const expected = [
        objectLoader.createCompactedResource({
          list: [
            '"VALUE1.1"',
            '"VALUE1.2"',
            '"VALUE2.1"',
            '"VALUE2.2"',
          ],
        }),
      ];
      expectOutputProperties(preprocessor
        .applyConstructorArgumentsParameters(configRoot, constructorArgs, configElement), expected);
    });

    it('should pass args with a list with fields params', () => {
      const configRoot = objectLoader.createCompactedResource({});
      const constructorArgs = objectLoader.createCompactedResource({
        list: [
          {
            fields: {
              key: '"KEY1"',
              value: 'ex:param1',
            },
          },
          {
            fields: {
              key: '"KEY2"',
              value: 'ex:param2',
            },
          },
        ],
      });
      const configElement = objectLoader.createCompactedResource({
        'ex:param1': '"VALUE1"',
        'ex:param2': '"VALUE2"',
      });
      const expected = [
        objectLoader.createCompactedResource({
          list: [
            {
              fields: {
                key: '"KEY1"',
                value: '"VALUE1"',
              },
              unique: '"true"',
              hasFields: '"true"',
            },
            {
              fields: {
                key: '"KEY2"',
                value: '"VALUE2"',
              },
              unique: '"true"',
              hasFields: '"true"',
            },
          ],
        }),
      ];
      expectOutputProperties(preprocessor
        .applyConstructorArgumentsParameters(configRoot, constructorArgs, configElement), expected);
    });

    it('should pass args with a list with elements params', () => {
      const configRoot = objectLoader.createCompactedResource({});
      const constructorArgs = objectLoader.createCompactedResource({
        list: [
          {
            elements: {
              list: [
                'ex:param1',
              ],
            },
          },
          {
            elements: {
              list: [
                'ex:param2',
              ],
            },
          },
        ],
      });
      const configElement = objectLoader.createCompactedResource({
        'ex:param1': '"VALUE1"',
        'ex:param2': '"VALUE2"',
      });
      const expected = [
        objectLoader.createCompactedResource({
          list: [
            {
              value: [
                '"VALUE1"',
              ],
            },
            {
              value: [
                '"VALUE2"',
              ],
            },
          ],
        }),
      ];
      expectOutputProperties(preprocessor
        .applyConstructorArgumentsParameters(configRoot, constructorArgs, configElement), expected);
    });
  });

  describe('getParameterValue', () => {
    it('should handle subject references', () => {
      const configRoot = objectLoader.createCompactedResource({});
      const parameter = objectLoader.createCompactedResource({
        '@id': 'rdf:subject',
      });
      const configElement = objectLoader.createCompactedResource({
        '@id': 'ex:params',
      });
      const expected = [
        objectLoader.createCompactedResource('"ex:params"'),
      ];
      expected[0].property.unique = objectLoader.createCompactedResource('"true"');
      expectOutputProperties(preprocessor.getParameterValue(configRoot, parameter, configElement, false), expected);
    });

    it('should handle regular IRI references', () => {
      const configRoot = objectLoader.createCompactedResource({});
      const parameter = objectLoader.createCompactedResource({
        '@id': 'ex:param1',
      });
      const configElement = objectLoader.createCompactedResource({
        '@id': 'ex:params',
        'ex:param1': '"A"',
      });
      const expected = [
        objectLoader.createCompactedResource('"A"'),
      ];
      expectOutputOnlyTerm(preprocessor.getParameterValue(configRoot, parameter, configElement, false), expected);
    });

    it('should handle blank nodes with no properties', () => {
      const configRoot = objectLoader.createCompactedResource({});
      const parameter = objectLoader.createCompactedResource({});
      const configElement = objectLoader.createCompactedResource({
        '@id': 'ex:params',
      });
      const expected = [
        objectLoader.createCompactedResource({}),
      ];
      expectOutputOnlyTerm(preprocessor.getParameterValue(configRoot, parameter, configElement, false), expected);
    });

    it('should handle blank node as constructor args with direct value', () => {
      const configRoot = objectLoader.createCompactedResource({});
      const parameter = objectLoader.createCompactedResource({
        value: 'ex:param1',
      });
      const configElement = objectLoader.createCompactedResource({
        '@id': 'ex:params',
        'ex:param1': '"A"',
      });
      const expected = [
        objectLoader.createCompactedResource('"A"'),
      ];
      expectOutputOnlyTerm(preprocessor.getParameterValue(configRoot, parameter, configElement, false), expected);
    });

    it('should handle blank node as constructor args with fields value', () => {
      const configRoot = objectLoader.createCompactedResource({});
      const parameter = objectLoader.createCompactedResource({
        fields: {
          key: '"KEY"',
          value: 'ex:param1',
        },
      });
      const configElement = objectLoader.createCompactedResource({
        '@id': 'ex:params',
        'ex:param1': '"A"',
      });
      const expected = [
        objectLoader.createCompactedResource({
          fields: [
            {
              key: '"KEY"',
              value: '"A"',
            },
          ],
          unique: '"true"',
          hasFields: '"true"',
        }),
      ];
      expectOutputProperties(preprocessor.getParameterValue(configRoot, parameter, configElement, false), expected);
    });

    it('should handle raw IRI references', () => {
      const configRoot = objectLoader.createCompactedResource({});
      const parameter = objectLoader.createCompactedResource({
        '@id': 'ex:param1',
      });
      const configElement = objectLoader.createCompactedResource({
        '@id': 'ex:params',
        'ex:param1': '"A"',
      });
      const expected = [
        objectLoader.createCompactedResource('"A"'),
      ];
      expectOutputProperties(preprocessor.getParameterValue(configRoot, parameter, configElement, true), expected);
    });
  });
});
