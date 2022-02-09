import type { Resource, RdfObjectLoader } from 'rdf-object';
import type { Logger } from 'winston';
import { IRIS_OWL } from '../rdf/Iris';
import { ErrorResourcesContext } from '../util/ErrorResourcesContext';
import { GenericsContext } from './GenericsContext';
import type { IConfigPreprocessor } from './IConfigPreprocessor';
import type { ParameterHandler } from './ParameterHandler';

/**
 * Handles config that refer to a component as type.
 * The component may have parameters that can be applied on the config.
 */
export class ConfigPreprocessorComponent implements IConfigPreprocessor<IComponentConfigPreprocessorHandleResponse> {
  public readonly objectLoader: RdfObjectLoader;
  protected readonly componentResources: Record<string, Resource>;
  protected readonly runTypeConfigs: Record<string, Resource[]>;
  protected readonly parameterHandler: ParameterHandler;
  protected readonly logger: Logger;

  public constructor(options: IComponentConfigPreprocessorOptions) {
    this.objectLoader = options.objectLoader;
    this.componentResources = options.componentResources;
    this.runTypeConfigs = options.runTypeConfigs;
    this.parameterHandler = options.parameterHandler;
    this.logger = options.logger;
  }

  public canHandle(config: Resource): IComponentConfigPreprocessorHandleResponse | undefined {
    if (!config.property.requireName) {
      // Collect all component types from the resource
      const componentTypesIndex: Record<string, Resource> = {};
      for (const type of config.properties.types) {
        const componentResource: Resource = this.componentResources[type.value];
        if (componentResource) {
          componentTypesIndex[componentResource.value] = componentResource;
        }
      }
      const componentTypes: Resource[] = Object.values(componentTypesIndex);

      // Require either exactly one component type, or a requireName
      if (componentTypes.length > 1) {
        throw new ErrorResourcesContext(`Detected more than one component types for config "${config.value}"`, {
          componentTypes: `[${componentTypes.map(resource => resource.value)}]`,
          config,
        });
      }
      if (componentTypes.length === 0) {
        throw new ErrorResourcesContext(`Could not find (valid) component types for config "${config.value}" among its types, or a requireName`, {
          configTypes: `${config.properties.types.map(resource => resource.value)}`,
          config,
        });
      }

      // If we have a referred component type, add it to the factory options
      const component = componentTypes[0];
      const module = component.property.module;
      if (!module) {
        throw new ErrorResourcesContext(`No module was found for the component "${component.value}"`, { config });
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

    // Add reference to the original (config) instance, which we need to determine the instanceId @see ConfigConstructor
    configRaw.property.originalInstance = config;

    const requireName = handleResponse.component.property.requireName || handleResponse.module.property.requireName;
    if (!requireName) {
      throw new ErrorResourcesContext(`Could not find a requireName in either the config's module or component`, {
        module: handleResponse.module,
        component: handleResponse.component,
        config,
      });
    }
    configRaw.property.requireName = requireName;
    const requireElement = handleResponse.component.property.requireElement;
    if (requireElement) {
      configRaw.property.requireElement = requireElement;
    }
    configRaw.property.arguments = this.transformConstructorArguments(config, handleResponse);

    // Validate the input config
    this.validateConfig(config, handleResponse);

    return configRaw;
  }

  protected createGenericsContext(
    handleResponse: IComponentConfigPreprocessorHandleResponse,
    config: Resource,
  ): GenericsContext {
    // Create a new generics context for the component's generic type parameters
    const genericsContext = new GenericsContext(
      this.objectLoader,
      handleResponse.component.properties.genericTypeParameters,
    );

    // If the config has a genericTypeInstancesComponentScope, it will also have genericTypeInstances.
    // In that case, we bind these instances to the component's generic type parameters within the context.
    // (these values may have been set during generic param type-checking in
    // ParameterPropertyHandlerRange#hasParamValueValidType)
    if (config.property.genericTypeInstancesComponentScope &&
      handleResponse.component.value === config.property.genericTypeInstancesComponentScope.value) {
      const conflict = genericsContext.bindComponentGenericTypes(
        handleResponse.component,
        config.properties.genericTypeInstances,
        { config },
        (subType, superType) => this.parameterHandler.parameterPropertyHandlerRange
          .hasType(
            subType,
            superType,
            genericsContext,
            config.property.genericTypeInstancesComponentScope,
            config.properties.genericTypeInstances,
            { config },
          ),
      );
      if (conflict) {
        throw new ErrorResourcesContext(conflict.description, conflict.context);
      }
    }

    return genericsContext;
  }

  /**
   * Determine the constructor arguments of the given config.
   * @param config A config.
   * @param handleResponse Return value of the {#canHandle}.
   */
  public transformConstructorArguments(
    config: Resource,
    handleResponse: IComponentConfigPreprocessorHandleResponse,
  ): Resource {
    const entries: Resource[] = [];
    const genericsContext = this.createGenericsContext(handleResponse, config);
    for (const fieldData of handleResponse.component.properties.parameters) {
      const field = this.objectLoader.createCompactedResource({});
      field.property.key = this.objectLoader.createCompactedResource(`"${fieldData.term.value}"`);
      const value = this.parameterHandler
        .applyParameterValues(handleResponse.component, fieldData, config, genericsContext);
      if (value) {
        field.property.value = value;
      }
      entries.push(field);
    }

    // Create a single-arg hash constructor, and add all params as key-value pairs
    const param0 = this.objectLoader.createCompactedResource({
      fields: {
        list: entries,
      },
    });

    // Create constructor arguments list
    return this.objectLoader.createCompactedResource({
      list: [
        param0,
      ],
    });
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
   * @param config The config
   * @param component The component
   */
  public inheritParameterValues(config: Resource, component: Resource): void {
    // Iterate over all params in the instantiating component
    for (const parameter of component.properties.parameters) {
      // Collect all InheritanceValue's (=owl:Restriction)
      const inheritanceValueDefinitions: Resource[] = parameter.properties.inheritValues
        .reduce((acc: Resource[], clazz: Resource) => {
          if (clazz.properties.types.reduce((subAcc: boolean, type: Resource) => subAcc ||
            type.value === IRIS_OWL.Restriction, false)) {
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
            throw new ErrorResourcesContext(`Missing onParameter property on parameter value inheritance definition`, {
              parameter,
              config,
              component,
            });
          }

          // Iterate over all components to inherit from
          for (const componentType of inheritanceValueDefinition.properties.from) {
            if (componentType.type !== 'NamedNode') {
              throw new ErrorResourcesContext(`Detected invalid from term type "${componentType.type}" on parameter value inheritance definition`, {
                parameter,
                config,
                component,
              });
            }

            // Iterate over all instantiations of the referenced component
            const typeInstances: Resource[] = this.runTypeConfigs[componentType.value];
            if (typeInstances) {
              for (const instance of typeInstances) {
                // Iterate over all parameters to inherit from
                for (const parentParameter of inheritanceValueDefinition.properties.onParameter) {
                  if (parentParameter.type !== 'NamedNode') {
                    throw new ErrorResourcesContext(`Detected invalid onParameter term type "${parentParameter.type}" on parameter value inheritance definition`, {
                      parentParameter,
                      config,
                      component,
                    });
                  }

                  // If the previous instance had a value for this parameter, copy it to our current config
                  if (instance.property[parentParameter.value]) {
                    // Copy the parameters
                    for (const value of instance.properties[parentParameter.value]) {
                      if (!config.properties[parentParameter.value].includes(value)) {
                        config.properties[parentParameter.value].push(value);
                      }
                    }

                    // Also add the parameter to the parameter type list
                    // This is needed to ensure that the param value will be instantiated during mapping
                    if (!component.properties.parameters.includes(parentParameter)) {
                      component.properties.parameters.push(parentParameter);
                    }
                  }
                }
              }
            }
          }
        } else {
          throw new ErrorResourcesContext(`Missing from property on parameter value inheritance definition`, {
            parameter,
            config,
            component,
          });
        }
      }
    }
  }

  /**
   * Run checks to see if the given config is valid.
   * @param config The original config.
   * @param handleResponse The handle response.
   */
  public validateConfig(
    config: Resource,
    handleResponse: IComponentConfigPreprocessorHandleResponse,
  ): void {
    // Determine all valid parameter ids
    const validParameters: Record<string, boolean> = {};
    for (const param of handleResponse.component.properties.parameters) {
      validParameters[param.value] = true;
    }

    // Emit warning on undefined parameters inside the component's scope
    const prefix = handleResponse.component.value;
    for (const property of Object.keys(config.property)) {
      if (property.startsWith(prefix)) {
        if (!validParameters[property]) {
          this.logger.warn(`Detected potentially invalid component parameter '${property}' in a config`);
        }
      }
    }
  }
}

export interface IComponentConfigPreprocessorOptions {
  objectLoader: RdfObjectLoader;
  componentResources: Record<string, Resource>;
  runTypeConfigs: Record<string, Resource[]>;
  parameterHandler: ParameterHandler;
  logger: Logger;
}

export interface IComponentConfigPreprocessorHandleResponse {
  module: Resource;
  component: Resource;
}
