import * as fs from 'fs';
import type { Resource } from 'rdf-object';
import { RdfObjectLoader } from 'rdf-object';
import type { Logger } from 'winston';
import { ComponentRegistry } from '../../../lib/loading/ComponentRegistry';
import type { IModuleState } from '../../../lib/loading/ModuleStateBuilder';

describe('ComponentRegistry', () => {
  let moduleState: IModuleState;
  let objectLoader: RdfObjectLoader;
  let logger: Logger;
  let componentResources: Record<string, Resource>;
  let componentRegistry: ComponentRegistry;
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
    };
    componentResources = {};
    componentRegistry = new ComponentRegistry({
      moduleState,
      objectLoader,
      logger,
      componentResources,
    });
  });

  describe('registerAvailableModules', () => {
    it('should handle no discovered modules', async() => {
      await componentRegistry.registerAvailableModules();
      expect(Object.keys(objectLoader.resources).length).toBe(0);
    });

    it('should handle discovered modules', async() => {
      moduleState.componentModules = {
        A: `${__dirname}/../../assets/module.jsonld`,
      };
      await componentRegistry.registerAvailableModules();
      expect(Object.keys(objectLoader.resources)
        .includes('http://example.org/HelloWorldModule#SayHelloComponent')).toBeTruthy();
      expect(Object.keys(objectLoader.resources)
        .includes('http://example.org/HelloWorldModule#SayHelloComponentNested')).toBeTruthy();
    });
  });

  describe('registerModule', () => {
    it('should handle a valid module file', async() => {
      await componentRegistry.registerModule(`${__dirname}/../../assets/module.jsonld`);
      expect(Object.keys(objectLoader.resources)
        .includes('http://example.org/HelloWorldModule#SayHelloComponent')).toBeTruthy();
      expect(Object.keys(objectLoader.resources)
        .includes('http://example.org/HelloWorldModule#SayHelloComponentNested')).toBeTruthy();
    });

    it('should throw on an invalid module file', async() => {
      await expect(componentRegistry.registerModule(`not-exists.jsonld`)).rejects.toThrow();
    });
  });

  describe('registerModuleResource', () => {
    it('should handle a module with one component', () => {
      const module = objectLoader.createCompactedResource({
        '@id': 'ex:MyModule',
        components: [
          {
            '@id': 'ex:MyComponent',
            types: 'oo:Class',
          },
        ],
      });
      componentRegistry.registerModuleResource(module);
      expect(componentResources['ex:MyComponent']).toBe(module.properties.components[0]);
    });

    it('should handle a module with multiple components', () => {
      const module = objectLoader.createCompactedResource({
        '@id': 'ex:MyModule',
        components: [
          {
            '@id': 'ex:MyComponent1',
            types: 'oo:Class',
          },
          {
            '@id': 'ex:MyComponent2',
            types: 'oo:Class',
          },
          {
            '@id': 'ex:MyComponent3',
            types: 'oo:Class',
          },
        ],
      });
      componentRegistry.registerModuleResource(module);
      expect(componentResources['ex:MyComponent1']).toBe(module.properties.components[0]);
      expect(componentResources['ex:MyComponent2']).toBe(module.properties.components[1]);
      expect(componentResources['ex:MyComponent3']).toBe(module.properties.components[2]);
    });

    it('should throw on an invalid component', () => {
      const module = objectLoader.createCompactedResource({
        '@id': 'ex:MyModule',
        components: [
          {
            '@id': 'ex:MyComponent',
            types: 'oo:SomethingElse',
          },
        ],
      });
      expect(() => componentRegistry.registerModuleResource(module))
        .toThrow(new Error(`Resource ex:MyComponent is not a valid component, either it is not defined, has no type, or is incorrectly referenced.`));
    });

    it('should warn on a module without components', () => {
      const module = objectLoader.createCompactedResource({
        '@id': 'ex:MyModule',
        components: [],
      });
      componentRegistry.registerModuleResource(module);
      expect(logger.warn).toHaveBeenCalledWith(`Registered a module ex:MyModule without components.`);
    });
  });

  describe('registerComponent', () => {
    it('should handle a valid component', () => {
      const component = objectLoader.createCompactedResource({
        '@id': 'ex:MyComponent',
        types: 'oo:Class',
      });
      componentRegistry.registerComponent(component);
      expect(componentResources['ex:MyComponent']).toBe(component);
    });

    it('should throw on an invalid component', () => {
      const component = objectLoader.createCompactedResource({
        '@id': 'ex:MyComponent',
        types: 'oo:SomethingElse',
      });
      expect(() => componentRegistry.registerComponent(component))
        .toThrow(new Error(`Resource ex:MyComponent is not a valid component, either it is not defined, has no type, or is incorrectly referenced.`));
    });

    it('should warn on a component without proper identifier', () => {
      const component = objectLoader.createCompactedResource({
        types: 'oo:Class',
      });
      componentRegistry.registerComponent(component);
      expect(componentResources[component.value]).toBe(component);
      expect(logger.warn).toHaveBeenCalledWith(`Registered a component that is identified by a BlankNode (${component.value}) instead of an IRI identifier.`);
    });
  });

  describe('isValidComponent', () => {
    it('should handle AbstractClass', () => {
      expect(componentRegistry.isValidComponent(objectLoader.createCompactedResource({
        types: 'oo:AbstractClass',
      }))).toBeTruthy();
    });

    it('should handle Class', () => {
      expect(componentRegistry.isValidComponent(objectLoader.createCompactedResource({
        types: 'oo:Class',
      }))).toBeTruthy();
    });

    it('should handle Instance', () => {
      expect(componentRegistry.isValidComponent(objectLoader.createCompactedResource({
        types: 'oo:ComponentInstance',
      }))).toBeTruthy();
    });

    it('should not handle SomethingElse', () => {
      expect(componentRegistry.isValidComponent(objectLoader.createCompactedResource({
        types: 'oo:SomethingElse',
      }))).toBeFalsy();
    });
  });

  describe('requireValidComponent', () => {
    it('should handle AbstractClass', () => {
      expect(() => componentRegistry.requireValidComponent(objectLoader.createCompactedResource({
        types: 'oo:AbstractClass',
      }))).not.toThrow();
    });

    it('should handle Class', () => {
      expect(() => componentRegistry.requireValidComponent(objectLoader.createCompactedResource({
        types: 'oo:Class',
      }))).not.toThrow();
    });

    it('should handle Instance', () => {
      expect(() => componentRegistry.requireValidComponent(objectLoader.createCompactedResource({
        types: 'oo:ComponentInstance',
      }))).not.toThrow();
    });

    it('should not handle SomethingElse', () => {
      expect(() => componentRegistry.requireValidComponent(objectLoader.createCompactedResource({
        '@id': 'ex:abc',
        types: 'oo:SomethingElse',
      }))).toThrow(new Error(`Resource ex:abc is not a valid component, either it is not defined, has no type, or is incorrectly referenced.`));
    });

    it('should not handle SomethingElse with a referencing component', () => {
      expect(() => componentRegistry.requireValidComponent(objectLoader.createCompactedResource({
        '@id': 'ex:abc',
        types: 'oo:SomethingElse',
      }), objectLoader.createCompactedResource('ex:thing'))).toThrow(new Error(`Resource ex:abc is not a valid component, either it is not defined, has no type, or is incorrectly referenced by ex:thing.`));
    });
  });
});
