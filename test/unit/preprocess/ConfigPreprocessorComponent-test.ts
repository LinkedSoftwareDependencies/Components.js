import 'jest-rdf';
import * as fs from 'fs';
import type { Resource } from 'rdf-object';
import { RdfObjectLoader } from 'rdf-object';
import type {
  IComponentConfigPreprocessorHandleResponse,
} from '../../../lib/preprocess/ConfigPreprocessorComponent';
import {
  ConfigPreprocessorComponent,
} from '../../../lib/preprocess/ConfigPreprocessorComponent';
import { ParameterHandler } from '../../../lib/preprocess/ParameterHandler';

describe('ConfigPreprocessorComponent', () => {
  let objectLoader: RdfObjectLoader;
  let componentResources: Record<string, Resource>;
  let preprocessor: ConfigPreprocessorComponent;

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
      }),
    };
    preprocessor = new ConfigPreprocessorComponent({
      objectLoader,
      componentResources,
      runTypeConfigs: {},
      parameterHandler: new ParameterHandler({ objectLoader }),
    });
  });

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

    it('should store one config into runTypeConfigs by component type', () => {
      const config = objectLoader.createCompactedResource({
        '@id': 'ex:myComponentInstance1',
        types: 'ex:Component',
      });
      preprocessor.canHandle(config);
      expect((<any> preprocessor).runTypeConfigs['ex:Component'][0]).toBe(config);
    });

    it('should store multiple configs into runTypeConfigs by component type', () => {
      const config1 = objectLoader.createCompactedResource({
        '@id': 'ex:myComponentInstance1',
        types: 'ex:Component',
      });
      const config2 = objectLoader.createCompactedResource({
        '@id': 'ex:myComponentInstance2',
        types: 'ex:Component',
      });
      preprocessor.canHandle(config1);
      preprocessor.canHandle(config2);
      expect((<any> preprocessor).runTypeConfigs['ex:Component'].length).toEqual(2);
      expect((<any> preprocessor).runTypeConfigs['ex:Component'][0]).toBe(config1);
      expect((<any> preprocessor).runTypeConfigs['ex:Component'][1]).toBe(config2);
    });

    it('should store multiple configs with same id into runTypeConfigs only once by component type', () => {
      const config = objectLoader.createCompactedResource({
        '@id': 'ex:myComponentInstance1',
        types: 'ex:Component',
      });
      preprocessor.canHandle(config);
      preprocessor.canHandle(config);
      expect((<any> preprocessor).runTypeConfigs['ex:Component'].length).toEqual(1);
      expect((<any> preprocessor).runTypeConfigs['ex:Component'][0]).toBe(config);
    });

    it('should not handle config with requireName', () => {
      const config = objectLoader.createCompactedResource({
        requireName: '"NAME"',
      });
      expect(preprocessor.canHandle(config)).toBeUndefined();
    });

    it('should throw for a config with two component types', () => {
      componentResources['ex:Component2'] = objectLoader.createCompactedResource({
        '@id': 'ex:Component2',
        module: 'ex:Module2',
        parameters: {
          '@id': 'ex:param2',
        },
      });

      const config = objectLoader.createCompactedResource({
        '@id': 'ex:myComponentInstance',
        types: [ 'ex:Component', 'ex:Component2' ],
      });
      expect(() => preprocessor.canHandle(config))
        // eslint-disable-next-line max-len
        .toThrowError(/^Detected more than one component types for ex:myComponentInstance: \[ex:Component,ex:Component2\]./u);
    });

    it('should throw for a config with zero component types', () => {
      const config = objectLoader.createCompactedResource({
        '@id': 'ex:myComponentInstance',
        types: [],
      });
      expect(() => preprocessor.canHandle(config))
        // eslint-disable-next-line max-len
        .toThrowError(/^Could not find \(valid\) component types for ex:myComponentInstance among types \[\], or a requireName./u);
    });

    it('should throw for a config with unregistered component types', () => {
      const config = objectLoader.createCompactedResource({
        '@id': 'ex:myComponentInstance',
        types: [ 'ex:ComponentUnknown', 'ex:ComponentUnknown2' ],
      });
      expect(() => preprocessor.canHandle(config))
        // eslint-disable-next-line max-len
        .toThrowError(/^Could not find \(valid\) component types for ex:myComponentInstance among types \[ex:ComponentUnknown,ex:ComponentUnknown2\], or a requireName./u);
    });

    it('should throw for a config with a component type without module', () => {
      componentResources['ex:ComponentNoModule'] = objectLoader.createCompactedResource({
        '@id': 'ex:ComponentNoModule',
      });
      const config = objectLoader.createCompactedResource({
        '@id': 'ex:myComponentInstance',
        types: 'ex:ComponentNoModule',
      });
      expect(() => preprocessor.canHandle(config))
        .toThrow(new Error(`No module was found for the component ex:ComponentNoModule`));
    });
  });

  describe('transformConstructorArguments', () => {
    function expectTransformOutput(config: Resource, expectedArgs: Resource) {
      const hr = <IComponentConfigPreprocessorHandleResponse> preprocessor.canHandle(config);
      const ret = preprocessor.transformConstructorArguments(config, hr);
      expect(ret).toHaveLength(1);
      expect(expectedArgs.toQuads()).toBeRdfIsomorphic(ret[0].toQuads());
    }

    it('should handle no parameters', () => {
      const config = objectLoader.createCompactedResource({
        '@id': 'ex:myComponentInstance',
        types: 'ex:ComponentThis',
      });
      componentResources['ex:ComponentThis'] = objectLoader.createCompactedResource({
        '@id': 'ex:ComponentThis',
        module: 'ex:Module',
      });
      const expectedArgs = objectLoader.createCompactedResource({
        list: [
          {
            hasFields: '"true"',
          },
        ],
      });
      expectTransformOutput(config, expectedArgs);
    });

    it('should handle one parameter without value', () => {
      const config = objectLoader.createCompactedResource({
        '@id': 'ex:myComponentInstance',
        types: 'ex:ComponentThis',
      });
      componentResources['ex:ComponentThis'] = objectLoader.createCompactedResource({
        '@id': 'ex:ComponentThis',
        module: 'ex:Module',
        parameters: [
          {
            '@id': 'ex:myComponentInstance#param1',
          },
        ],
      });
      const expectedArgs = objectLoader.createCompactedResource({
        list: [
          {
            hasFields: '"true"',
            fields: [
              {
                key: '"ex:myComponentInstance#param1"',
              },
            ],
          },
        ],
      });
      expectTransformOutput(config, expectedArgs);
    });

    it('should handle one parameter with one value', () => {
      const config = objectLoader.createCompactedResource({
        '@id': 'ex:myComponentInstance',
        types: 'ex:ComponentThis',
        'ex:myComponentInstance#param1': '"A"',
      });
      componentResources['ex:ComponentThis'] = objectLoader.createCompactedResource({
        '@id': 'ex:ComponentThis',
        module: 'ex:Module',
        parameters: [
          {
            '@id': 'ex:myComponentInstance#param1',
          },
        ],
      });
      const expectedArgs = objectLoader.createCompactedResource({
        list: [
          {
            hasFields: '"true"',
            fields: [
              {
                key: '"ex:myComponentInstance#param1"',
                value: '"A"',
              },
            ],
          },
        ],
      });
      expectTransformOutput(config, expectedArgs);
    });

    it('should handle one parameter with multiple values', () => {
      const config = objectLoader.createCompactedResource({
        '@id': 'ex:myComponentInstance',
        types: 'ex:ComponentThis',
        'ex:myComponentInstance#param1': [
          '"A"',
          '"B"',
          '"C"',
        ],
      });
      componentResources['ex:ComponentThis'] = objectLoader.createCompactedResource({
        '@id': 'ex:ComponentThis',
        module: 'ex:Module',
        parameters: [
          {
            '@id': 'ex:myComponentInstance#param1',
          },
        ],
      });
      const expectedArgs = objectLoader.createCompactedResource({
        list: [
          {
            hasFields: '"true"',
            fields: [
              {
                key: '"ex:myComponentInstance#param1"',
                value: [
                  '"A"',
                  '"B"',
                  '"C"',
                ],
              },
            ],
          },
        ],
      });
      expectTransformOutput(config, expectedArgs);
    });

    it('should handle multiple parameters', () => {
      const config = objectLoader.createCompactedResource({
        '@id': 'ex:myComponentInstance',
        types: 'ex:ComponentThis',
        'ex:myComponentInstance#param1': '"A"',
        'ex:myComponentInstance#param2': '"B"',
        'ex:myComponentInstance#param3': '"C"',
      });
      componentResources['ex:ComponentThis'] = objectLoader.createCompactedResource({
        '@id': 'ex:ComponentThis',
        module: 'ex:Module',
        parameters: [
          {
            '@id': 'ex:myComponentInstance#param1',
          },
          {
            '@id': 'ex:myComponentInstance#param2',
          },
          {
            '@id': 'ex:myComponentInstance#param3',
          },
        ],
      });
      const expectedArgs = objectLoader.createCompactedResource({
        list: [
          {
            hasFields: '"true"',
            fields: [
              {
                key: '"ex:myComponentInstance#param1"',
                value: '"A"',
              },
              {
                key: '"ex:myComponentInstance#param2"',
                value: '"B"',
              },
              {
                key: '"ex:myComponentInstance#param3"',
                value: '"C"',
              },
            ],
          },
        ],
      });
      expectTransformOutput(config, expectedArgs);
    });
  });

  describe('transform', () => {
    function expectTransformOutput(config: Resource, expectedResource: Resource) {
      const hr = <IComponentConfigPreprocessorHandleResponse> preprocessor.canHandle(config);
      const ret = preprocessor.transform(config, hr);
      expect(expectedResource.toQuads()).toBeRdfIsomorphic(ret.toQuads());
    }

    it('should handle no parameters', () => {
      const config = objectLoader.createCompactedResource({
        '@id': 'ex:myComponentInstance',
        types: 'ex:ComponentThis',
      });
      componentResources['ex:ComponentThis'] = objectLoader.createCompactedResource({
        '@id': 'ex:ComponentThis',
        module: {
          '@id': 'ex:Module',
          requireName: 'my-module',
        },
      });
      const expectedResource = objectLoader.createCompactedResource({
        originalInstance: config,
        requireName: 'my-module',
        arguments: [
          {
            list: [
              {
                hasFields: '"true"',
              },
            ],
          },
        ],
      });
      expectTransformOutput(config, expectedResource);
    });

    it('should handle parameters', () => {
      const config = objectLoader.createCompactedResource({
        '@id': 'ex:myComponentInstance',
        types: 'ex:ComponentThis',
        'ex:myComponentInstance#param1': '"A"',
        'ex:myComponentInstance#param2': '"B"',
        'ex:myComponentInstance#param3': '"C"',
      });
      componentResources['ex:ComponentThis'] = objectLoader.createCompactedResource({
        '@id': 'ex:ComponentThis',
        module: {
          '@id': 'ex:Module',
          requireName: 'my-module',
        },
        parameters: [
          {
            '@id': 'ex:myComponentInstance#param1',
          },
          {
            '@id': 'ex:myComponentInstance#param2',
          },
          {
            '@id': 'ex:myComponentInstance#param3',
          },
        ],
      });
      const expectedResource = objectLoader.createCompactedResource({
        originalInstance: config,
        requireName: 'my-module',
        arguments: [
          {
            list: [
              {
                hasFields: '"true"',
                fields: [
                  {
                    key: '"ex:myComponentInstance#param1"',
                    value: '"A"',
                  },
                  {
                    key: '"ex:myComponentInstance#param2"',
                    value: '"B"',
                  },
                  {
                    key: '"ex:myComponentInstance#param3"',
                    value: '"C"',
                  },
                ],
              },
            ],
          },
        ],
      });
      expectTransformOutput(config, expectedResource);
    });

    it('should prefer requireName in component', () => {
      const config = objectLoader.createCompactedResource({
        '@id': 'ex:myComponentInstance',
        types: 'ex:ComponentThis',
      });
      componentResources['ex:ComponentThis'] = objectLoader.createCompactedResource({
        '@id': 'ex:ComponentThis',
        module: {
          '@id': 'ex:Module',
          requireName: 'my-module',
        },
        requireName: 'my-module-override',
      });
      const expectedResource = objectLoader.createCompactedResource({
        originalInstance: config,
        requireName: 'my-module-override',
        arguments: [
          {
            list: [
              {
                hasFields: '"true"',
              },
            ],
          },
        ],
      });
      expectTransformOutput(config, expectedResource);
    });

    it('should throw when neither component or module has a requireName', () => {
      const config = objectLoader.createCompactedResource({
        '@id': 'ex:myComponentInstance',
        types: 'ex:ComponentThis',
      });
      componentResources['ex:ComponentThis'] = objectLoader.createCompactedResource({
        '@id': 'ex:ComponentThis',
        module: 'ex:Module',
      });
      const hr = <IComponentConfigPreprocessorHandleResponse> preprocessor.canHandle(config);
      expect(() => preprocessor.transform(config, hr))
        // eslint-disable-next-line max-len
        .toThrowError(/^Could not find a requireName in either the config's module \(ex:Module\) or component \(ex:ComponentThis\)\./u);
    });

    it('should prefer requireElement in component', () => {
      const config = objectLoader.createCompactedResource({
        '@id': 'ex:myComponentInstance',
        types: 'ex:ComponentThis',
      });
      componentResources['ex:ComponentThis'] = objectLoader.createCompactedResource({
        '@id': 'ex:ComponentThis',
        module: {
          '@id': 'ex:Module',
          requireName: 'my-module',
        },
        requireElement: 'My.Element',
      });
      const expectedResource = objectLoader.createCompactedResource({
        originalInstance: config,
        requireName: 'my-module',
        requireElement: 'My.Element',
        arguments: [
          {
            list: [
              {
                hasFields: '"true"',
              },
            ],
          },
        ],
      });
      expectTransformOutput(config, expectedResource);
    });

    it('should handle a component instance', () => {
      const config = objectLoader.createCompactedResource({
        '@id': 'ex:myComponentInstance',
        types: 'ex:ComponentThis',
      });
      componentResources['ex:ComponentThis'] = objectLoader.createCompactedResource({
        '@id': 'ex:ComponentThis',
        types: 'oo:ComponentInstance',
        module: {
          '@id': 'ex:Module',
          requireName: 'my-module',
        },
      });
      const expectedResource = objectLoader.createCompactedResource({
        originalInstance: config,
        requireName: 'my-module',
        types: 'oo:ComponentInstance',
        arguments: [
          {
            list: [
              {
                hasFields: '"true"',
              },
            ],
          },
        ],
      });
      expectTransformOutput(config, expectedResource);
    });

    it('should inherit parameters', () => {
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
        requireName: '"REQ"',
      });
      // Define other component instance
      (<any> preprocessor).runTypeConfigs['ex:OtherComponent'] = [
        objectLoader.createCompactedResource({
          '@id': 'ex:myOtherComponentInstance',
          types: 'ex:OtherComponent',
          'ex:OtherComponent#param1': '"ABC"',
        }),
      ];

      const config = objectLoader.createCompactedResource({
        '@id': 'ex:myComponentInstance',
        types: 'ex:ComponentInherit',
      });
      const expectedResource = objectLoader.createCompactedResource({
        originalInstance: config,
        requireName: '"REQ"',
        arguments: [
          {
            list: [
              {
                hasFields: '"true"',
                fields: [
                  {
                    key: '"ex:ComponentInherit#param1"',
                  },
                  {
                    key: '"ex:OtherComponent#param1"',
                    value: '"ABC"',
                  },
                ],
              },
            ],
          },
        ],
      });
      expectTransformOutput(config, expectedResource);
    });
  });

  describe('inheritParameterValues', () => {
    beforeEach(() => {
      // Define other component instance
      (<any> preprocessor).runTypeConfigs['ex:OtherComponent'] = [
        objectLoader.createCompactedResource({
          '@id': 'ex:myOtherComponentInstance',
          types: 'ex:OtherComponent',
          'ex:OtherComponent#param1': '"ABC"',
        }),
      ];
    });

    it('should not change a config for component without parameters', () => {
      const configIn = objectLoader.createCompactedResource({});
      const configOut = objectLoader.createCompactedResource({});
      const componentIn = objectLoader.createCompactedResource({});
      const componentOut = objectLoader.createCompactedResource({});
      preprocessor.inheritParameterValues(configIn, componentIn);
      expect(configIn.toQuads()).toBeRdfIsomorphic(configOut.toQuads());
      expect(componentIn.toQuads()).toBeRdfIsomorphic(componentOut.toQuads());
    });

    it('should handle one inherited parameter value', () => {
      const configIn = objectLoader.createCompactedResource({});
      const configOut = objectLoader.createCompactedResource({
        'ex:OtherComponent#param1': '"ABC"',
      });
      const componentIn = objectLoader.createCompactedResource({
        '@id': 'ex:Component',
        parameters: {
          '@id': 'ex:param1',
          inheritValues: {
            types: 'owl:Restriction',
            onParameter: 'ex:OtherComponent#param1',
            from: 'ex:OtherComponent',
          },
        },
      });
      const componentOut = objectLoader.createCompactedResource({
        '@id': 'ex:Component',
        parameters: [
          {
            '@id': 'ex:param1',
            inheritValues: {
              types: 'owl:Restriction',
              onParameter: 'ex:OtherComponent#param1',
              from: 'ex:OtherComponent',
            },
          },
          'ex:OtherComponent#param1',
        ],
      });
      preprocessor.inheritParameterValues(configIn, componentIn);
      expect(configIn.toQuads()).toBeRdfIsomorphic(configOut.toQuads());
      expect(componentIn.toQuads()).toBeRdfIsomorphic(componentOut.toQuads());
    });

    it('should handle one inherited parameter value with multiple instances', () => {
      (<any> preprocessor).runTypeConfigs['ex:OtherComponent'] = [
        objectLoader.createCompactedResource({
          '@id': 'ex:myOtherComponentInstance',
          types: 'ex:OtherComponent',
          'ex:OtherComponent#param1': '"ABC"',
        }),
      ];
      (<any> preprocessor).runTypeConfigs['ex:OtherComponent'] = [
        objectLoader.createCompactedResource({
          '@id': 'ex:myOtherComponentInstance',
          types: 'ex:OtherComponent',
          'ex:OtherComponent#param1': '"DEF"',
        }),
      ];

      const configIn = objectLoader.createCompactedResource({
      });
      const configOut = objectLoader.createCompactedResource({
        'ex:OtherComponent#param1': [
          '"ABC"',
          '"DEF"',
        ],
      });
      const component = objectLoader.createCompactedResource({
        '@id': 'ex:Component',
        parameters: {
          '@id': 'ex:param1',
          inheritValues: {
            types: 'owl:Restriction',
            onParameter: 'ex:OtherComponent#param1',
            from: 'ex:OtherComponent',
          },
        },
      });
      preprocessor.inheritParameterValues(configIn, component);
      expect(configIn.toQuads()).toBeRdfIsomorphic(configOut.toQuads());
    });

    it('should not change a config for component with parameter without restrictions', () => {
      const configIn = objectLoader.createCompactedResource({});
      const configOut = objectLoader.createCompactedResource({});
      const component = objectLoader.createCompactedResource({
        parameters: {
          '@id': 'ex:param1',
          default: '"ABC"',
        },
      });
      preprocessor.inheritParameterValues(configIn, component);
      expect(configIn.toQuads()).toBeRdfIsomorphic(configOut.toQuads());
    });

    it('should do nothing for an inherited parameter value without instances to inherit from', () => {
      delete (<any> preprocessor).runTypeConfigs['ex:OtherComponent'];
      const configIn = objectLoader.createCompactedResource({});
      const configOut = objectLoader.createCompactedResource({});
      const component = objectLoader.createCompactedResource({
        '@id': 'ex:Component',
        parameters: {
          '@id': 'ex:param1',
          inheritValues: {
            types: 'owl:Restriction',
            onParameter: 'ex:OtherComponent#param1',
            from: 'ex:OtherComponent',
          },
        },
      });
      preprocessor.inheritParameterValues(configIn, component);
      expect(configIn.toQuads()).toBeRdfIsomorphic(configOut.toQuads());
    });

    it('should do nothing for an inherited parameter value with instance without the parameter value', () => {
      const configIn = objectLoader.createCompactedResource({});
      const configOut = objectLoader.createCompactedResource({});
      const component = objectLoader.createCompactedResource({
        '@id': 'ex:Component',
        parameters: {
          '@id': 'ex:param1',
          inheritValues: {
            types: 'owl:Restriction',
            onParameter: 'ex:OtherComponent#paramUndefined',
            from: 'ex:OtherComponent',
          },
        },
      });
      preprocessor.inheritParameterValues(configIn, component);
      expect(configIn.toQuads()).toBeRdfIsomorphic(configOut.toQuads());
    });

    it('should handle one inherited parameter value when the restriction also has other types', () => {
      const configIn = objectLoader.createCompactedResource({});
      const configOut = objectLoader.createCompactedResource({
        'ex:OtherComponent#param1': '"ABC"',
      });
      const component = objectLoader.createCompactedResource({
        '@id': 'ex:Component',
        parameters: {
          '@id': 'ex:param1',
          inheritValues: {
            types: [
              'ex:abc',
              'owl:Restriction',
              'ex:def',
            ],
            onParameter: 'ex:OtherComponent#param1',
            from: 'ex:OtherComponent',
          },
        },
      });
      preprocessor.inheritParameterValues(configIn, component);
      expect(configIn.toQuads()).toBeRdfIsomorphic(configOut.toQuads());
    });

    it('should not change a config when the restriction does not have any types', () => {
      const configIn = objectLoader.createCompactedResource({});
      const configOut = objectLoader.createCompactedResource({});
      const component = objectLoader.createCompactedResource({
        '@id': 'ex:Component',
        parameters: {
          '@id': 'ex:param1',
          inheritValues: {
            onParameter: 'ex:OtherComponent#param1',
            from: 'ex:OtherComponent',
          },
        },
      });
      preprocessor.inheritParameterValues(configIn, component);
      expect(configIn.toQuads()).toBeRdfIsomorphic(configOut.toQuads());
    });

    it('should not change a config when the restriction does not have the required type', () => {
      const configIn = objectLoader.createCompactedResource({});
      const configOut = objectLoader.createCompactedResource({});
      const component = objectLoader.createCompactedResource({
        '@id': 'ex:Component',
        parameters: {
          '@id': 'ex:param1',
          inheritValues: {
            types: [
              'ex:abc',
            ],
            onParameter: 'ex:OtherComponent#param1',
            from: 'ex:OtherComponent',
          },
        },
      });
      preprocessor.inheritParameterValues(configIn, component);
      expect(configIn.toQuads()).toBeRdfIsomorphic(configOut.toQuads());
    });

    it('should throw when the restriction does not define from', () => {
      const configIn = objectLoader.createCompactedResource({});
      const component = objectLoader.createCompactedResource({
        '@id': 'ex:Component',
        parameters: {
          '@id': 'ex:param1',
          inheritValues: {
            types: 'owl:Restriction',
            onParameter: 'ex:OtherComponent#param1',
          },
        },
      });
      expect(() => preprocessor.inheritParameterValues(configIn, component))
        .toThrowError(/^Missing from property on parameter value inheritance definition/u);
    });

    it('should throw when the restriction does not define onParameter', () => {
      const configIn = objectLoader.createCompactedResource({});
      const component = objectLoader.createCompactedResource({
        '@id': 'ex:Component',
        parameters: {
          '@id': 'ex:param1',
          inheritValues: {
            types: 'owl:Restriction',
            from: 'ex:OtherComponent',
          },
        },
      });
      expect(() => preprocessor.inheritParameterValues(configIn, component))
        .toThrowError(/^Missing onParameter property on parameter value inheritance definition/u);
    });

    it('should throw when from refers to a literal', () => {
      const configIn = objectLoader.createCompactedResource({});
      const component = objectLoader.createCompactedResource({
        '@id': 'ex:Component',
        parameters: {
          '@id': 'ex:param1',
          inheritValues: {
            types: 'owl:Restriction',
            onParameter: 'ex:OtherComponent#param1',
            from: '"ex:OtherComponent"',
          },
        },
      });
      expect(() => preprocessor.inheritParameterValues(configIn, component))
        .toThrowError(/^Detected invalid from term type 'Literal' on parameter value inheritance definition/u);
    });

    it('should throw when onParameter refers to a literal', () => {
      const configIn = objectLoader.createCompactedResource({});
      const component = objectLoader.createCompactedResource({
        '@id': 'ex:Component',
        parameters: {
          '@id': 'ex:param1',
          inheritValues: {
            types: 'owl:Restriction',
            onParameter: '"ex:OtherComponent#param1"',
            from: 'ex:OtherComponent',
          },
        },
      });
      expect(() => preprocessor.inheritParameterValues(configIn, component))
        .toThrowError(/^Detected invalid onParameter term type 'Literal' on parameter value inheritance definition/u);
    });
  });
});
