import type { Resource, RdfObjectLoader } from 'rdf-object';
import { ComponentFactory } from './factory/ComponentFactory';
import type { ComponentFactoryOptions } from './factory/ComponentFactoryOptions';
import type { ICreationSettingsInner, IComponentFactory } from './factory/IComponentFactory';
import type { IInstancePool } from './IInstancePool';
import type { IModuleState } from './ModuleStateBuilder';
import Util = require('./Util');
import { resourceIdToString, resourceToString } from './Util';

/**
 * Manages and creates instances of components.
 */
export class InstancePool implements IInstancePool {
  private readonly objectLoader: RdfObjectLoader;
  private readonly componentResources: Record<string, Resource>;
  private readonly moduleState: IModuleState;

  private readonly runTypeConfigs: Record<string, Resource[]> = {};
  private readonly instances: Record<string, Promise<any>> = {};

  public constructor(options: IInstancePoolOptions) {
    this.objectLoader = options.objectLoader;
    this.componentResources = options.componentResources;
    this.moduleState = options.moduleState;
  }

  /**
   * Let this config inherit parameter values from previously instantiated configs.
   * This will check for inheritanceValues that are defined on the component,
   * which can refer to parameters from other components.
   *
   * For example, assume we had previously instantiated a component X with param P set to 'value'.
   * If we instantiate component Y, which is defined to inherit values from param P of X,
   * then it will automatically inherit this param P set to 'value'.
   *
   * This can effectively mutate the given config resource.
   * @param configResource The config
   * @param componentResource The component
   */
  public inheritParameterValues(configResource: Resource, componentResource: Resource): void {
    // Iterate over all params in the instantiating component
    for (const parameter of componentResource.properties.parameters) {
      // Collect all InheritanceValue's (=owl:Restriction)
      const inheritanceValueDefinitions: Resource[] = parameter.properties.inheritValues
        .reduce((acc: Resource[], clazz: Resource) => {
          if (clazz.properties.types.reduce((subAcc: boolean, type: Resource) => subAcc ||
            type.value === `${Util.PREFIXES.owl}Restriction`, false)) {
            acc.push(clazz);
          }
          return acc;
        }, []);

      // Check the validity of all definitions
      for (const inheritanceValueDefinition of inheritanceValueDefinitions) {
        // Check if 'from' refers to a component
        if (inheritanceValueDefinition.property.from) {
          // Check if 'onParameter' refers to a parameter
          if (!inheritanceValueDefinition.property.onParameter) {
            throw new Error(`Missing onParameter property on parameter value inheritance definition: ${resourceToString(parameter)}`);
          }

          // Iterate over all components to inherit from
          for (const componentType of inheritanceValueDefinition.properties.from) {
            if (componentType.type !== 'NamedNode') {
              throw new Error(`Detected invalid from term type '${componentType.type}' on parameter value inheritance definition: ${resourceToString(componentType)}`);
            }

            // Iterate over all instantiations of the referenced component
            const typeInstances: Resource[] = this.runTypeConfigs[componentType.value];
            if (typeInstances) {
              for (const instance of typeInstances) {
                // Iterate over all parameters to inherit from
                for (const parentParameter of inheritanceValueDefinition.properties.onParameter) {
                  if (parentParameter.type !== 'NamedNode') {
                    throw new Error(`Detected invalid onParameter term type '${parentParameter.type}' on parameter value inheritance definition: ${resourceToString(parentParameter)}`);
                  }

                  // If the previous instance had a value for this parameter, copy it to our current config
                  if (instance.property[parentParameter.value]) {
                    // Copy the parameters
                    for (const value of instance.properties[parentParameter.value]) {
                      configResource.properties[parentParameter.value].push(value);
                    }

                    // Also add the parameter to the parameter type list
                    // This is needed to ensure that the param value will be instantiated during mapping
                    if (!componentResource.properties.parameters.includes(parentParameter)) {
                      componentResource.properties.parameters.push(parentParameter);
                    }
                  }
                }
              }
            }
          }
        } else {
          throw new Error(`Missing from property on parameter value inheritance definition: ${resourceToString(parameter)}`);
        }
      }
    }
  }

  /**
   * Get a component config constructor based on a Resource.
   * @param configResource A config resource.
   * @returns The component factory.
   */
  public getConfigConstructor(configResource: Resource): IComponentFactory {
    // Collect all component types from the resource
    const componentTypes: Resource[] = [];
    for (const type of configResource.properties.types) {
      const componentResource: Resource = this.componentResources[type.value];
      if (componentResource) {
        componentTypes.push(componentResource);
      }
    }

    // Require either exactly one component type, or a requireName
    if (componentTypes.length > 1) {
      throw new Error(`Detected more than one component types for ${resourceIdToString(configResource, this.objectLoader)}: [${componentTypes.map(resource => resource.value)}].
Parsed config: ${resourceToString(configResource)}`);
    }
    if (componentTypes.length === 0 && !configResource.property.requireName) {
      throw new Error(`Could not find (valid) component types for ${resourceIdToString(configResource, this.objectLoader)} among types [${configResource.properties.types.map(resource => resource.value)}], or a requireName.
Parsed config: ${resourceToString(configResource)}
Available component types: [\n${Object.keys(this.componentResources).join(',\n')}\n]`);
    }

    // Create common factory options
    let options: ComponentFactoryOptions = {
      objectLoader: this.objectLoader,
      config: configResource,
      instancePool: this,
      constructable: !configResource.isA('Instance'),
    };

    // If we have a referred component type, add it to the factory options
    if (componentTypes.length > 0) {
      const componentResource = componentTypes[0];
      const moduleResource = componentResource.property.module;
      if (!moduleResource) {
        throw new Error(`No module was found for the component ${resourceIdToString(componentResource, this.objectLoader)}`);
      }

      // Save this config so that other configs may inherit params from it in the future.
      if (!this.runTypeConfigs[componentResource.value]) {
        this.runTypeConfigs[componentResource.value] = [];
      }
      this.runTypeConfigs[componentResource.value].push(configResource);

      // Inherit parameter values
      this.inheritParameterValues(configResource, componentResource);

      options = {
        ...options,
        moduleDefinition: moduleResource,
        componentDefinition: componentResource,
      };
    }

    return new ComponentFactory(options);
  }

  /**
   * Instantiate a component based on a Resource.
   * @param configResource A config resource.
   * @param settings The settings for creating the instance.
   * @returns {any} The run instance.
   */
  public async instantiate<Instance>(
    configResource: Resource,
    settings: ICreationSettingsInner<Instance>,
  ): Promise<Instance> {
    // Check if this resource is required as argument in its own chain,
    // if so, return a dummy value, to avoid infinite recursion.
    const resourceBlacklist = settings.resourceBlacklist || {};
    if (resourceBlacklist[configResource.value]) {
      return settings.creationStrategy.createUndefined();
    }

    // Before instantiating, first check if the resource is a variable
    if (configResource.isA('Variable')) {
      return settings.creationStrategy.getVariableValue({ settings, variableName: configResource.value });
    }

    // Instantiate only once
    if (!(configResource.value in this.instances)) {
      // The blacklist avoids infinite recursion for self-referencing configs
      const subBlackList: Record<string, boolean> = { ...resourceBlacklist };
      subBlackList[configResource.value] = true;
      this.instances[configResource.value] = this.getConfigConstructor(configResource).createInstance(
        { resourceBlacklist: subBlackList, ...settings },
      );
    }
    return await this.instances[configResource.value];
  }
}

export interface IInstancePoolOptions {
  objectLoader: RdfObjectLoader;
  componentResources: Record<string, Resource>;
  moduleState: IModuleState;
}
