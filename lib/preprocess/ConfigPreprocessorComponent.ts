import type { Resource, RdfObjectLoader } from 'rdf-object';
import { applyParameterValues, PREFIXES, resourceIdToString, resourceToString } from '../Util';
import type { IConfigPreprocessor } from './IConfigPreprocessor';

/**
 * Handles config that refer to a component as type.
 * The component may have parameters that can be applied on the config.
 */
export class ConfigPreprocessorComponent implements IConfigPreprocessor<IComponentConfigPreprocessorHandleResponse> {
  protected readonly objectLoader: RdfObjectLoader;
  protected readonly componentResources: Record<string, Resource>;
  protected readonly runTypeConfigs: Record<string, Resource[]>;

  public constructor(options: IComponentConfigPreprocessorOptions) {
    this.objectLoader = options.objectLoader;
    this.componentResources = options.componentResources;
    this.runTypeConfigs = options.runTypeConfigs;
  }

  public canHandle(config: Resource): IComponentConfigPreprocessorHandleResponse | undefined {
    if (!config.property.requireName) {
      // Collect all component types from the resource
      const componentTypes: Resource[] = [];
      for (const type of config.properties.types) {
        const componentResource: Resource = this.componentResources[type.value];
        if (componentResource) {
          componentTypes.push(componentResource);
        }
      }

      // Require either exactly one component type, or a requireName
      if (componentTypes.length > 1) {
        throw new Error(`Detected more than one component types for ${resourceIdToString(config, this.objectLoader)}: [${componentTypes.map(resource => resource.value)}].
Parsed config: ${resourceToString(config)}`);
      }
      if (componentTypes.length === 0) {
        throw new Error(`Could not find (valid) component types for ${resourceIdToString(config, this.objectLoader)} among types [${config.properties.types.map(resource => resource.value)}], or a requireName.
Parsed config: ${resourceToString(config)}
Available component types: [\n${Object.keys(this.componentResources).join(',\n')}\n]`);
      }

      // If we have a referred component type, add it to the factory options
      const component = componentTypes[0];
      const module = component.property.module;
      if (!module) {
        throw new Error(`No module was found for the component ${resourceIdToString(component, this.objectLoader)}`);
      }

      // Save this config so that other configs may inherit params from it in the future.
      if (!this.runTypeConfigs[component.value]) {
        this.runTypeConfigs[component.value] = [];
      }
      // Only save configs with a given id once.
      if (!this.runTypeConfigs[component.value].some(resource => resource.term.equals(config.term))) {
        this.runTypeConfigs[component.value].push(config);
      }

      return {
        module,
        component,
      };
    }
  }

  public transform(config: Resource, handleResponse: IComponentConfigPreprocessorHandleResponse): Resource {
    // Inherit parameter values
    this.inheritParameterValues(config, handleResponse.component);

    // Add all required config properties
    const configRaw = this.objectLoader.createCompactedResource({});
    if (config.isA('Instance')) {
      configRaw.properties.types.push(this.objectLoader.createCompactedResource('oo:ComponentInstance'));
    }
    // TODO: following line is unneeded?
    configRaw.property.originalInstance = config;
    const requireName = handleResponse.component.property.requireName || handleResponse.module.property.requireName;
    if (!requireName) {
      throw new Error(`Could not find a requireName in either the config's module (${resourceIdToString(handleResponse.module, this.objectLoader)}) or component (${resourceIdToString(handleResponse.component, this.objectLoader)}).
Parsed config: ${resourceToString(config)}`);
    }
    configRaw.property.requireName = requireName;
    const requireElement = handleResponse.component.property.requireElement;
    if (requireElement) {
      configRaw.property.requireElement = requireElement;
    }
    configRaw.properties.arguments = this.transformConstructorArguments(config, handleResponse);

    return configRaw;
  }

  /**
   * Determine the constructor arguments of the given config.
   * @param config A config.
   * @param handleResponse Return value of the {#canHandle}.
   */
  public transformConstructorArguments(
    config: Resource,
    handleResponse: IComponentConfigPreprocessorHandleResponse,
  ): Resource[] {
    // Create a single-arg hash constructor, and add all params as key-value pairs
    const param0 = this.objectLoader.createCompactedResource({
      // Hack to make UnnamedComponentFactory.getArgumentValue go into fields branch
      hasFields: '"true"',
    });
    for (const fieldData of handleResponse.component.properties.parameters) {
      const field = this.objectLoader.createCompactedResource({});
      field.property.key = this.objectLoader.createCompactedResource(`"${fieldData.term.value}"`);
      for (const value of applyParameterValues(
        handleResponse.component,
        fieldData,
        config,
        this.objectLoader,
      )) {
        field.properties.value.push(value);
      }
      param0.properties.fields.push(field);
    }

    // Create constructor arguments list
    const args = this.objectLoader.createCompactedResource({});
    args.list = [ param0 ];

    return [ args ];
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
            type.value === `${PREFIXES.owl}Restriction`, false)) {
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
}

export interface IComponentConfigPreprocessorOptions {
  objectLoader: RdfObjectLoader;
  componentResources: Record<string, Resource>;
  runTypeConfigs: Record<string, Resource[]>;
}

export interface IComponentConfigPreprocessorHandleResponse {
  module: Resource;
  component: Resource;
}
