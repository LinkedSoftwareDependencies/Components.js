import * as fs from 'fs';
import type { Resource } from 'rdf-object';
import { RdfObjectLoader } from 'rdf-object';
import type { Logger } from 'winston';
import { ComponentRegistry } from '../../../lib/loading/ComponentRegistry';
import { ComponentRegistryFinalizer } from '../../../lib/loading/ComponentRegistryFinalizer';
import type { IModuleState } from '../../../lib/loading/ModuleStateBuilder';

describe('ComponentRegistryFinalizer', () => {
  let moduleState: IModuleState;
  let objectLoader: RdfObjectLoader;
  let logger: Logger;
  let componentResources: Record<string, Resource>;
  let componentRegistry: ComponentRegistry;
  let finalizer: ComponentRegistryFinalizer;
  beforeEach(() => {
    moduleState = <any> {
      mainModulePath: __dirname,
      componentModules: {},
    };
    objectLoader = new RdfObjectLoader({
      context: JSON.parse(fs.readFileSync(`${__dirname}/../../../components/context.jsonld`, 'utf8')),
    });
    logger = <any> {
      warn: jest.fn(),
      info: jest.fn(),
    };
    componentResources = {};
    componentRegistry = new ComponentRegistry({
      moduleState,
      objectLoader,
      logger,
      componentResources,
      skipContextValidation: false,
    });
    finalizer = new ComponentRegistryFinalizer({
      objectLoader,
      logger,
      componentResources,
      componentRegistry,
    });
  });

  describe('finalize', () => {
    it('should do nothing when no components were registered', () => {
      finalizer.finalize();
      expect(componentResources).toEqual({});
      expect(logger.info).toHaveBeenCalledWith(`Registered 0 components`);
    });

    it('should handle registered modules', async() => {
      await componentRegistry.registerModule(`${__dirname}/../../assets/module.jsonld`);
      finalizer.finalize();
      expect(Object.keys(componentResources)
        .includes('http://example.org/HelloWorldModule#SayHelloComponent')).toBeTruthy();
      expect(Object.keys(componentResources)
        .includes('http://example.org/HelloWorldModule#SayHelloComponentNested')).toBeTruthy();
      expect(logger.info).toHaveBeenCalledWith(`Registered 2 components`);
    });

    it('should inherit parameters and constructorArgs from a superclass', async() => {
      const component1 = objectLoader.createCompactedResource({
        '@id': 'ex:MyComponent1',
        types: 'oo:Class',
        extends: 'ex:MyComponent2',
        parameters: [
          {
            '@id': 'ex:MyComponent1#param1',
          },
        ],
        constructorArguments: {
          list: [
            {
              '@id': 'ex:MyComponent1#constructorArgs',
              extends: 'ex:MyComponent2#constructorArgs',
            },
          ],
        },
      });
      const component2 = objectLoader.createCompactedResource({
        '@id': 'ex:MyComponent2',
        types: 'oo:Class',
        parameters: [
          {
            '@id': 'ex:MyComponent2#param1',
          },
        ],
        constructorArguments: {
          list: [
            {
              '@id': 'ex:MyComponent2#constructorArgs',
              fields: {
                list: [
                  {
                    '@id': 'ex:MyComponent2#constructorArgs-field1',
                  },
                  {
                    '@id': 'ex:MyComponent2#constructorArgs-field2',
                  },
                ],
              },
            },
          ],
        },
      });
      componentRegistry.registerComponent(component1);
      componentRegistry.registerComponent(component2);
      finalizer.finalize();
      expect(component1.properties.parameters.length).toBe(2);
      expect(component1.properties.constructorArguments[0].list![0].property.fields.list!.length).toBe(2);
    });
  });

  describe('inheritParameters', () => {
    it('should handle a component without superclasses', async() => {
      const component1 = objectLoader.createCompactedResource({
        '@id': 'ex:MyComponent1',
        types: 'oo:Class',
        parameters: [
          {
            '@id': 'ex:MyComponent1#param1',
          },
        ],
      });
      finalizer.inheritParameters(component1, []);
      expect(component1.properties.parameters.length).toBe(1);
      expect(component1.properties.parameters[0]).toBe(component1.properties.parameters[0]);
    });

    it('should handle a component with superclass with one parameter', async() => {
      const component1 = objectLoader.createCompactedResource({
        '@id': 'ex:MyComponent1',
        types: 'oo:Class',
        parameters: [
          {
            '@id': 'ex:MyComponent1#param1',
          },
        ],
      });
      const component2 = objectLoader.createCompactedResource({
        '@id': 'ex:MyComponent2',
        types: 'oo:Class',
        parameters: [
          {
            '@id': 'ex:MyComponent2#param1',
          },
        ],
      });
      finalizer.inheritParameters(component1, [ component2 ]);
      expect(component1.properties.parameters.length).toBe(2);
      expect(component1.properties.parameters[0]).toBe(component1.properties.parameters[0]);
      expect(component1.properties.parameters[1]).toBe(component2.properties.parameters[0]);
    });

    it('should handle a component with two superclasses with one parameter', async() => {
      const component1 = objectLoader.createCompactedResource({
        '@id': 'ex:MyComponent1',
        types: 'oo:Class',
        parameters: [
          {
            '@id': 'ex:MyComponent1#param1',
          },
        ],
      });
      const component2 = objectLoader.createCompactedResource({
        '@id': 'ex:MyComponent2',
        types: 'oo:Class',
        parameters: [
          {
            '@id': 'ex:MyComponent2#param1',
          },
        ],
      });
      const component3 = objectLoader.createCompactedResource({
        '@id': 'ex:MyComponent3',
        types: 'oo:Class',
        parameters: [
          {
            '@id': 'ex:MyComponent3#param1',
          },
        ],
      });
      finalizer.inheritParameters(component1, [ component2, component3 ]);
      expect(component1.properties.parameters.length).toBe(3);
      expect(component1.properties.parameters[0]).toBe(component1.properties.parameters[0]);
      expect(component1.properties.parameters[1]).toBe(component2.properties.parameters[0]);
      expect(component1.properties.parameters[2]).toBe(component3.properties.parameters[0]);
    });

    it('should handle a component with superclass with two parameters', async() => {
      const component1 = objectLoader.createCompactedResource({
        '@id': 'ex:MyComponent1',
        types: 'oo:Class',
        parameters: [
          {
            '@id': 'ex:MyComponent1#param1',
          },
        ],
      });
      const component2 = objectLoader.createCompactedResource({
        '@id': 'ex:MyComponent2',
        types: 'oo:Class',
        parameters: [
          {
            '@id': 'ex:MyComponent2#param1',
          },
          {
            '@id': 'ex:MyComponent2#param2',
          },
        ],
      });
      finalizer.inheritParameters(component1, [ component2 ]);
      expect(component1.properties.parameters.length).toBe(3);
      expect(component1.properties.parameters[0]).toBe(component1.properties.parameters[0]);
      expect(component1.properties.parameters[1]).toBe(component2.properties.parameters[0]);
      expect(component1.properties.parameters[2]).toBe(component2.properties.parameters[1]);
    });

    it('should handle a component with chained superclasses', async() => {
      const component1 = objectLoader.createCompactedResource({
        '@id': 'ex:MyComponent1',
        types: 'oo:Class',
        parameters: [
          {
            '@id': 'ex:MyComponent1#param1',
          },
        ],
      });
      const component2 = objectLoader.createCompactedResource({
        '@id': 'ex:MyComponent2',
        types: 'oo:Class',
        extends: 'ex:MyComponent3',
        parameters: [
          {
            '@id': 'ex:MyComponent2#param1',
          },
        ],
      });
      const component3 = objectLoader.createCompactedResource({
        '@id': 'ex:MyComponent3',
        types: 'oo:Class',
        parameters: [
          {
            '@id': 'ex:MyComponent3#param1',
          },
        ],
      });
      finalizer.inheritParameters(component1, [ component2 ]);
      expect(component1.properties.parameters.length).toBe(3);
      expect(component1.properties.parameters[0]).toBe(component1.properties.parameters[0]);
      expect(component1.properties.parameters[1]).toBe(component2.properties.parameters[0]);
      expect(component1.properties.parameters[2]).toBe(component3.properties.parameters[0]);
    });

    it('should not add already present parameters', async() => {
      const component1 = objectLoader.createCompactedResource({
        '@id': 'ex:MyComponent1',
        types: 'oo:Class',
        parameters: [
          {
            '@id': 'ex:MyComponent1#param1',
          },
        ],
      });
      const component2 = objectLoader.createCompactedResource({
        '@id': 'ex:MyComponent2',
        types: 'oo:Class',
        parameters: [
          {
            '@id': 'ex:MyComponent1#param1',
          },
          {
            '@id': 'ex:MyComponent2#param2',
          },
        ],
      });
      finalizer.inheritParameters(component1, [ component2 ]);
      expect(component1.properties.parameters.length).toBe(2);
      expect(component1.properties.parameters[0]).toBe(component2.properties.parameters[0]);
      expect(component1.properties.parameters[1]).toBe(component2.properties.parameters[1]);
    });

    it('should handle a component with superclass wrapped in a generic component instantiation', async() => {
      const component1 = objectLoader.createCompactedResource({
        '@id': 'ex:MyComponent1',
        types: 'oo:Class',
        parameters: [
          {
            '@id': 'ex:MyComponent1#param1',
          },
        ],
      });
      const component2 = objectLoader.createCompactedResource({
        '@type': 'GenericComponentExtension',
        component: {
          '@id': 'ex:MyComponent2',
          types: 'oo:Class',
          parameters: [
            {
              '@id': 'ex:MyComponent2#param1',
            },
          ],
        },
      });
      finalizer.inheritParameters(component1, [ component2 ]);
      expect(component1.properties.parameters.length).toBe(2);
      expect(component1.properties.parameters[0]).toBe(component1.properties.parameters[0]);
      expect(component1.properties.parameters[1]).toBe(component2.property.component.properties.parameters[0]);
    });

    it('should throw on a component with superclass wrapped in an invalid generic component instantiation', async() => {
      const component1 = objectLoader.createCompactedResource({
        '@id': 'ex:MyComponent1',
        types: 'oo:Class',
        parameters: [
          {
            '@id': 'ex:MyComponent1#param1',
          },
        ],
      });
      const component2 = objectLoader.createCompactedResource({
        component: {
          '@id': 'ex:MyComponent2',
          types: 'oo:Class',
          parameters: [
            {
              '@id': 'ex:MyComponent2#param1',
            },
          ],
        },
      });
      expect(() => finalizer.inheritParameters(component1, [ component2 ]))
        // eslint-disable-next-line max-len
        .toThrow(/Resource .* is not a valid component, either it is not defined, has no type, or is incorrectly referenced by ex:MyComponent1./u);
    });
  });

  describe('inheritConstructorArguments', () => {
    it('should handle a component without constructorArgs', async() => {
      const component1 = objectLoader.createCompactedResource({
        '@id': 'ex:MyComponent1',
        types: 'oo:Class',
      });
      finalizer.inheritConstructorArguments(component1);
      expect(component1.property.constructorArguments).toBeUndefined();
    });

    it('should throw on a component with non-list constructorArgs', async() => {
      const component1 = objectLoader.createCompactedResource({
        '@id': 'ex:MyComponent1',
        types: 'oo:Class',
        constructorArguments: 'Not a list',
      });
      expect(() => finalizer.inheritConstructorArguments(component1))
        .toThrowError(/^Invalid or undefined constructor arguments/u);
    });

    it('should handle an empty constructorArgs', async() => {
      const component1 = objectLoader.createCompactedResource({
        '@id': 'ex:MyComponent1',
        types: 'oo:Class',
        constructorArguments: {
          list: [],
        },
      });
      finalizer.inheritConstructorArguments(component1);
      expect(component1.property.constructorArguments.list!.length).toBe(0);
    });

    it('should handle a constructorArgs without extends', async() => {
      const component1 = objectLoader.createCompactedResource({
        '@id': 'ex:MyComponent1',
        types: 'oo:Class',
        constructorArguments: {
          list: [
            {
              '@id': 'ex:MyComponent1#cargs1',
            },
            {
              '@id': 'ex:MyComponent1#cargs2',
            },
          ],
        },
      });
      finalizer.inheritConstructorArguments(component1);
      expect(component1.property.constructorArguments.list!.length).toBe(2);
    });

    it('should handle a constructorArgs with extends', async() => {
      const component1 = objectLoader.createCompactedResource({
        '@id': 'ex:MyComponent1',
        types: 'oo:Class',
        constructorArguments: {
          list: [
            {
              '@id': 'ex:MyComponent1#constructorArgs1',
              extends: 'ex:MyComponent2#constructorArgs',
            },
            {
              '@id': 'ex:MyComponent1#constructorArgs2',
              extends: 'ex:MyComponent3#constructorArgs',
            },
          ],
        },
      });
      const component2 = objectLoader.createCompactedResource({
        '@id': 'ex:MyComponent2',
        types: 'oo:Class',
        constructorArguments: {
          list: [
            {
              '@id': 'ex:MyComponent2#constructorArgs',
              fields: {
                list: [
                  {
                    '@id': 'ex:MyComponent2#constructorArgs-field1',
                  },
                  {
                    '@id': 'ex:MyComponent2#constructorArgs-field2',
                  },
                ],
              },
            },
          ],
        },
      });
      const component3 = objectLoader.createCompactedResource({
        '@id': 'ex:MyComponent3',
        types: 'oo:Class',
        constructorArguments: {
          list: [
            {
              '@id': 'ex:MyComponent3#constructorArgs',
              fields: {
                list: [
                  {
                    '@id': 'ex:MyComponent3#constructorArgs-field1',
                  },
                  {
                    '@id': 'ex:MyComponent3#constructorArgs-field2',
                  },
                ],
              },
            },
          ],
        },
      });
      finalizer.inheritConstructorArguments(component1);
      expect(component1.property.constructorArguments.list!.length).toBe(2);
      expect(component1.property.constructorArguments.list![0].property.fields.list!.length).toBe(2);
      expect(component1.property.constructorArguments.list![0].property.fields.list![0])
        .toBe(component2.property.constructorArguments.list![0].property.fields.list![0]);
      expect(component1.property.constructorArguments.list![0].property.fields.list![1])
        .toBe(component2.property.constructorArguments.list![0].property.fields.list![1]);
      expect(component1.property.constructorArguments.list![1].property.fields.list!.length).toBe(2);
      expect(component1.property.constructorArguments.list![1].property.fields.list![0])
        .toBe(component3.property.constructorArguments.list![0].property.fields.list![0]);
      expect(component1.property.constructorArguments.list![1].property.fields.list![1])
        .toBe(component3.property.constructorArguments.list![0].property.fields.list![1]);
    });
  });

  describe('inheritConstructorArgumentsEntry', () => {
    it('should handle empty extending args', async() => {
      const cargs = objectLoader.createCompactedResource({});
      finalizer.inheritConstructorArgumentsEntry(cargs, []);
      expect(cargs.property.fields).toBeUndefined();
    });

    it('should throw on extending args without fields', async() => {
      const cargs = objectLoader.createCompactedResource({});
      const cargsSuper = objectLoader.createCompactedResource({
        fields: [],
      });
      expect(() => finalizer.inheritConstructorArgumentsEntry(cargs, [ cargsSuper ]))
        .toThrowError(/^Invalid or undefined constructor argument entry/u);
    });

    it('should throw on extending args with non-list fields', async() => {
      const cargs = objectLoader.createCompactedResource({
        fields: [ 'A', 'B' ],
      });
      expect(() => finalizer.inheritConstructorArgumentsEntry(cargs, []))
        .toThrowError(/^Invalid fields: Only one value can be defined, or an RDF list must be provided/u);
    });

    it('should handle extending args without fields with ObjectMapping type', async() => {
      const cargs = objectLoader.createCompactedResource({});
      const cargsSuper = objectLoader.createCompactedResource({
        types: 'om:ObjectMapping',
        fields: [],
      });
      finalizer.inheritConstructorArgumentsEntry(cargs, [ cargsSuper ]);
      expect(cargs.property.fields).toBeUndefined();
    });

    it('should handle extending args without fields with extends', async() => {
      const cargs = objectLoader.createCompactedResource({});
      const cargsSuper = objectLoader.createCompactedResource({
        extends: {
          types: 'om:ObjectMapping',
          fields: [],
        },
        fields: [],
      });
      finalizer.inheritConstructorArgumentsEntry(cargs, [ cargsSuper ]);
      expect(cargs.property.fields).toBeUndefined();
    });

    it('should throw on extending super args without fields', async() => {
      const cargs = objectLoader.createCompactedResource({});
      const cargsSuper = objectLoader.createCompactedResource({
        extends: {
          fields: [],
        },
        fields: [],
      });
      expect(() => finalizer.inheritConstructorArgumentsEntry(cargs, [ cargsSuper ]))
        .toThrowError(/^Invalid or undefined constructor argument entry/u);
    });

    it('should handle extending args with one field', async() => {
      const cargs = objectLoader.createCompactedResource({});
      const cargsSuper = objectLoader.createCompactedResource({
        fields: {
          list: [
            {
              '@id': 'ex:field1',
            },
          ],
        },
      });
      finalizer.inheritConstructorArgumentsEntry(cargs, [ cargsSuper ]);
      expect(cargs.property.fields.list!.length).toBe(1);
      expect(cargs.property.fields.list![0].value).toEqual('ex:field1');
    });

    it('should handle extending args with multiple fields', async() => {
      const cargs = objectLoader.createCompactedResource({});
      const cargsSuper = objectLoader.createCompactedResource({
        fields: [
          {
            '@id': 'ex:field1',
          },
          {
            '@id': 'ex:field2',
          },
          {
            '@id': 'ex:field3',
          },
        ],
      });
      finalizer.inheritConstructorArgumentsEntry(cargs, [ cargsSuper ]);
      expect(cargs.property.fields.list!.length).toBe(3);
      expect(cargs.property.fields.list![0].value).toEqual('ex:field1');
      expect(cargs.property.fields.list![1].value).toEqual('ex:field2');
      expect(cargs.property.fields.list![2].value).toEqual('ex:field3');
    });

    it('should handle nested extending args with one field', async() => {
      const cargs = objectLoader.createCompactedResource({});
      const cargsSuper = objectLoader.createCompactedResource({
        extends: {
          fields: [
            {
              '@id': 'ex:field1.1',
            },
          ],
        },
        fields: [
          {
            '@id': 'ex:field1',
          },
        ],
      });
      finalizer.inheritConstructorArgumentsEntry(cargs, [ cargsSuper ]);
      expect(cargs.property.fields.list!.length).toBe(2);
      expect(cargs.property.fields.list![0].value).toEqual('ex:field1');
      expect(cargs.property.fields.list![1].value).toEqual('ex:field1.1');
    });

    it('should not add already present fields', async() => {
      const cargs = objectLoader.createCompactedResource({
        fields: [
          {
            '@id': 'ex:field1',
          },
        ],
      });
      const cargsSuper = objectLoader.createCompactedResource({
        fields: [
          {
            '@id': 'ex:field1',
          },
          {
            '@id': 'ex:field2',
          },
        ],
      });
      finalizer.inheritConstructorArgumentsEntry(cargs, [ cargsSuper ]);
      expect(cargs.property.fields.list!.length).toBe(2);
      expect(cargs.property.fields.list![0].value).toEqual('ex:field1');
      expect(cargs.property.fields.list![1].value).toEqual('ex:field2');
    });
  });
});
