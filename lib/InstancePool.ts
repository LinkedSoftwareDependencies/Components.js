import type { Resource, RdfObjectLoader } from 'rdf-object';
import { ComponentFactory } from './factory/ComponentFactory';
import type { ComponentFactoryOptions } from './factory/ComponentFactoryOptions';
import type { ICreationSettings, ICreationSettingsInner, IComponentFactory } from './factory/IComponentFactory';
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
  private readonly overrideRequireNames: Record<string, string>;

  private readonly runTypeConfigs: Record<string, Resource[]> = {};
  private readonly instances: Record<string, any> = {};

  public constructor(options: IInstancePoolOptions) {
    this.objectLoader = options.objectLoader;
    this.componentResources = options.componentResources;
    this.moduleState = options.moduleState;
    this.overrideRequireNames = options.overrideRequireNames;
  }

  /**
   * Let then given config inherit parameter values from referenced passed configs.
   * @param configResource The config
   * @param componentResource The component
   */
  public inheritParameterValues(configResource: Resource, componentResource: Resource): void {
    // Inherit parameter values from passed instances of the given types
    if (componentResource.property.parameters) {
      for (const parameter of componentResource.properties.parameters) {
        // Collect all owl:Restriction's
        const restrictions: Resource[] = parameter.properties.inheritValues
          .reduce((acc: Resource[], clazz: Resource) => {
            if (clazz.properties.types.reduce((subAcc: boolean, type: Resource) => subAcc ||
              type.value === `${Util.PREFIXES.owl}Restriction`, false)) {
              acc.push(clazz);
            }
            return acc;
          }, []);

        for (const restriction of restrictions) {
          if (restriction.property.from) {
            if (!restriction.property.onParameter) {
              throw new Error(`Parameters that inherit values must refer to a property: ${resourceToString(parameter)}`);
            }

            for (const componentType of restriction.properties.from) {
              if (componentType.type !== 'NamedNode') {
                throw new Error(`Parameter inheritance values must refer to component type identifiers, not literals: ${resourceToString(componentType)}`);
              }

              const typeInstances: Resource[] = this.runTypeConfigs[componentType.value];
              if (typeInstances) {
                for (const instance of typeInstances) {
                  for (const parentParameter of restriction.properties.onParameter) {
                    // TODO: this might be a bug in the JSON-LD parser
                    // if (parentParameter.termType !== 'NamedNode') {
                    // throw new Error('Parameters that inherit values must refer to sub properties as URI\'s: '
                    // + JSON.stringify(parentParameter));
                    // }
                    if (instance.property[parentParameter.value]) {
                      // Copy the parameters
                      for (const value of instance.properties[parentParameter.value]) {
                        configResource.properties[parentParameter.value].push(value);
                      }

                      // Also add the parameter to the parameter type list
                      if (!componentResource.properties.parameters.includes(parentParameter)) {
                        componentResource.properties.parameters.push(parentParameter);
                      }
                    }
                  }
                }
              }
            }
          }
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
    const allTypes: string[] = [];
    const componentTypes: Resource[] = configResource.properties.types
      .reduce((types: Resource[], typeUri: Resource) => {
        const componentResource: Resource = this.componentResources[typeUri.value];
        allTypes.push(typeUri.value);
        if (componentResource) {
          types.push(componentResource);
          if (!this.runTypeConfigs[componentResource.value]) {
            this.runTypeConfigs[componentResource.value] = [];
          }
          this.runTypeConfigs[componentResource.value].push(configResource);
        }
        return types;
      }, []);
    if (componentTypes.length !== 1 &&
      !configResource.property.requireName &&
      !configResource.property.requireElement) {
      throw new Error(`Could not run config ${resourceIdToString(configResource, this.objectLoader)} because exactly one valid component type ` +
        `was expected, while ${componentTypes.length} were found in the defined types [${allTypes}]. ` +
        `Alternatively, the requireName and requireElement must be provided.\nFound: ${
          resourceToString(configResource)}\nAll available usable types: [\n${
          Object.keys(this.componentResources).join(',\n')}\n]`);
    }

    let options: ComponentFactoryOptions = {
      objectLoader: this.objectLoader,
      config: configResource,
      overrideRequireNames: this.overrideRequireNames,
      instancePool: this,
      constructable: !configResource.isA('Instance'),
    };

    if (componentTypes.length > 0) {
      const componentResource = componentTypes[0];
      const moduleResource = componentResource.property.module;
      if (!moduleResource) {
        throw new Error(`No module was found for the component ${resourceIdToString(componentResource, this.objectLoader)}`);
      }

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
  public async instantiate(configResource: Resource, settings: ICreationSettings): Promise<any> {
    const settingsInner: ICreationSettingsInner = { ...settings, moduleState: this.moduleState };
    // Check if this resource is required as argument in its own chain,
    // if so, return a dummy value, to avoid infinite recursion.
    const resourceBlacklist = settingsInner.resourceBlacklist || {};
    if (resourceBlacklist[configResource.value]) {
      return {};
    }

    // Before instantiating, first check if the resource is a variable
    if (configResource.isA('Variable')) {
      if (settingsInner.serializations) {
        if (settingsInner.asFunction) {
          return `getVariableValue('${configResource.value}')`;
        }
        throw new Error(`Detected a variable during config compilation: ${resourceIdToString(configResource, this.objectLoader)}. Variables are not supported, but require the -f flag to expose the compiled config as function.`);
      } else {
        const value = settingsInner.variables ? settingsInner.variables[configResource.value] : undefined;
        if (value === undefined) {
          throw new Error(`Undefined variable: ${resourceIdToString(configResource, this.objectLoader)}`);
        }
        return value;
      }
    }

    if (!this.instances[configResource.value]) {
      const subBlackList: Record<string, boolean> = { ...resourceBlacklist };
      subBlackList[configResource.value] = true;
      this.instances[configResource.value] = await this.getConfigConstructor(configResource).createInstance(
        { resourceBlacklist: subBlackList, ...settingsInner },
      );
    }
    return this.instances[configResource.value];
  }
}

export interface IInstancePoolOptions {
  objectLoader: RdfObjectLoader;
  componentResources: Record<string, Resource>;
  moduleState: IModuleState;
  overrideRequireNames: Record<string, string>;
}
