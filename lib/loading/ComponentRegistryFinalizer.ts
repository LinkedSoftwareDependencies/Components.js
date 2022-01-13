import type { RdfObjectLoader, Resource } from 'rdf-object';
import type { Logger } from 'winston';
import { IRIS_OO } from '../rdf/Iris';
import { ErrorResourcesContext } from '../util/ErrorResourcesContext';
import type { ComponentRegistry } from './ComponentRegistry';

/**
 * Finalizes module registrations of a {@link ComponentRegistry}.
 */
export class ComponentRegistryFinalizer {
  private readonly objectLoader: RdfObjectLoader;
  private readonly logger: Logger;
  private readonly componentResources: Record<string, Resource>;
  private readonly componentRegistry: ComponentRegistry;

  public constructor(options: IComponentFinalizerOptions) {
    this.objectLoader = options.objectLoader;
    this.logger = options.logger;
    this.componentResources = options.componentResources;
    this.componentRegistry = options.componentRegistry;
  }

  /**
   * Invoke the post-processing of modules and components.
   *
   * Modules that have been loaded from a stream will be fetched
   * from the object loader and saved in {@link componentResources}.
   *
   * All components will be iterated to handle parameter inheritance.
   */
  public finalize(): void {
    // Register all object-loaded modules
    for (const resource of Object.values(this.objectLoader.resources)) {
      if (resource.isA('Module') && resource.value !== IRIS_OO.Module) {
        this.componentRegistry.registerModuleResource(resource);
      }
    }

    // Component parameter inheritance
    for (const componentResource of Object.values(this.componentResources)) {
      this.inheritParameters(componentResource, componentResource.properties.extends);
      this.inheritConstructorArguments(componentResource);
    }

    this.logger.info(`Registered ${Object.keys(this.componentResources).length} components`);
  }

  /**
   * Extend the parameters from this component's super components.
   * @param component The component resource onto which parameters may be added.
   * @param superComponents The components to inherit from.
   */
  public inheritParameters(component: Resource, superComponents: Resource[]): void {
    for (let superComponent of superComponents) {
      // Check if the super component is wrapped in a generic component instantiation
      if (superComponent.property.type?.value === this.objectLoader.contextResolved
        .expandTerm('oo:GenericComponentExtension')) {
        superComponent = superComponent.property.component;
      }

      this.componentRegistry.requireValidComponent(superComponent, component);
      for (const parameter of superComponent.properties.parameters) {
        if (!component.properties.parameters.includes(parameter)) {
          component.properties.parameters.push(parameter);
        }
      }
      this.inheritParameters(component, superComponent.properties.extends);
    }
  }

  /**
   * Let the given component inherit constructor mappings.
   * For each arg, {@link inheritConstructorArgumentsEntry} will be invoked.
   * @param component The component resource on which inherit constructor arguments inheritance will be invoked.
   */
  public inheritConstructorArguments(component: Resource): void {
    if (component.property.constructorArguments) {
      if (!component.property.constructorArguments.list) {
        throw new ErrorResourcesContext(`Invalid or undefined constructor arguments\nconstructorArguments must point to an RDF list`, {
          constructorArgs: component,
        });
      }
      for (const constructorArg of component.property.constructorArguments.list) {
        this.inheritConstructorArgumentsEntry(constructorArg, constructorArg.properties.extends);
      }
    }
  }

  /**
   * For each of the given entry's extend references,
   * inherit their fields and add to the current entry.
   * @param constructorArg A root constructor arguments resource
   * @param extendingConstructorArgs The constructor argument resources to inherit from.
   */
  public inheritConstructorArgumentsEntry(constructorArg: Resource, extendingConstructorArgs: Resource[]): void {
    // Make sure that we have fields in list-form
    if (constructorArg.property.fields && !constructorArg.property.fields.list) {
      if (constructorArg.properties.fields.length > 1) {
        throw new ErrorResourcesContext(`Invalid fields: Only one value can be defined, or an RDF list must be provided`, {
          constructorArg,
        });
      }
      constructorArg.property.fields = this.objectLoader.createCompactedResource({
        list: constructorArg.properties.fields,
      });
    }

    for (const extendingConstructorArg of extendingConstructorArgs) {
      if (extendingConstructorArg.property.fields) {
        // Inherit fields
        for (const field of extendingConstructorArg.property.fields.list || extendingConstructorArg.properties.fields) {
          if (!constructorArg.property.fields) {
            constructorArg.property.fields = this.objectLoader.createCompactedResource({ list: []});
          }
          if (!constructorArg.property.fields.list!.includes(field)) {
            constructorArg.property.fields.list!.push(field);
          }
        }
      } else if (!extendingConstructorArg.isA('ObjectMapping') && !extendingConstructorArg.property.extends) {
        throw new ErrorResourcesContext(`Invalid or undefined constructor argument entry\nConstructor arguments require fields, be of type ObjectMapping, or extend from other constructor arguments.`, {
          entry: extendingConstructorArg,
          referencingEntry: constructorArg,
        });
      }
      this.inheritConstructorArgumentsEntry(constructorArg, extendingConstructorArg.properties.extends);
    }
  }
}

export interface IComponentFinalizerOptions {
  objectLoader: RdfObjectLoader;
  logger: Logger;
  componentResources: Record<string, Resource>;
  componentRegistry: ComponentRegistry;
}
