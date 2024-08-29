import type { Resource, RdfObjectLoader } from 'rdf-object';
import { termToString } from 'rdf-string';
import type { IModuleState } from '../loading/ModuleStateBuilder';
import type { IConfigPreprocessor } from '../preprocess/IConfigPreprocessor';
import { ErrorResourcesContext } from '../util/ErrorResourcesContext';
import { ConfigConstructor } from './ConfigConstructor';
import type { IConfigConstructorPool } from './IConfigConstructorPool';
import type { IConstructionSettings } from './IConstructionSettings';
import type { IConstructionStrategy } from './strategy/IConstructionStrategy';

/**
 * Manages and creates instances of components based on a given config.
 *
 * This accepts different config variants, as supported by the configured {@link IConfigPreprocessor}'s.
 *
 * This will make sure that configs with the same id will only be instantiated once,
 * and multiple references to configs will always reuse the same instance.
 */
export class ConfigConstructorPool<Instance, InstanceOut = Instance> implements IConfigConstructorPool<Instance> {
  private readonly configPreprocessors: IConfigPreprocessor<any>[];
  private readonly configConstructor: ConfigConstructor<Instance, InstanceOut>;
  private readonly constructionStrategy: IConstructionStrategy<Instance, InstanceOut>;

  private instances: Record<string, Promise<any>> = {};

  public constructor(options: IInstancePoolOptions<Instance, InstanceOut>) {
    this.configPreprocessors = options.configPreprocessors;
    this.configConstructor = new ConfigConstructor<Instance, InstanceOut>({
      objectLoader: options.objectLoader,
      configConstructorPool: this,
      constructionStrategy: options.constructionStrategy,
      moduleState: options.moduleState,
    });
    this.constructionStrategy = options.constructionStrategy;
  }

  public instantiate(
    configResource: Resource,
    settings: IConstructionSettings,
  ): Promise<Instance> {
    // Check if this resource is required as argument in its own chain,
    // if so, return a dummy value, to avoid infinite recursion.
    const resourceBlacklist = settings.resourceBlacklist || {};
    const configResourceId = termToString(configResource.term);
    if (resourceBlacklist[configResourceId]) {
      return Promise.reject(new ErrorResourcesContext(`Circular dependency was detected on ${configResource.value}`, { config: configResource }));
    }

    // Before instantiating, first check if the resource is a variable
    if (configResource.isA('Variable')) {
      return Promise.resolve(this.constructionStrategy
        .getVariableValue({ settings, variableName: configResource.value }));
    }

    // Instantiate only once
    if (!(configResourceId in this.instances)) {
      // The blacklist avoids infinite recursion for self-referencing configs
      const subBlackList: Record<string, boolean> = { ...resourceBlacklist };
      subBlackList[configResourceId] = true;

      // Prepare instance parameters
      let rawConfig: Resource;
      try {
        rawConfig = this.getRawConfig(configResource);
      } catch (syncError: unknown) {
        this.instances[configResourceId] = Promise.reject(syncError);
        return this.instances[configResourceId];
      }
      const subSettings = { ...settings, resourceBlacklist: subBlackList };

      // Invoke instance creation
      this.instances[configResourceId] = this.configConstructor.createInstance(
        rawConfig,
        subSettings,
      );
    }
    return this.instances[configResourceId];
  }

  /**
   * Determine the raw config of the given config.
   * As such, the config can be transformd by zero or more {@link IConfigPreprocessor}'s.
   *
   * @param config Config to possibly transform.
   * @returns The raw config data.
   */
  public getRawConfig(config: Resource): Resource {
    // Try to preprocess the config
    for (const rawConfigFactory of this.configPreprocessors) {
      const handleResponse = rawConfigFactory.canHandle(config);
      if (handleResponse) {
        const { rawConfig, finishTransformation } = rawConfigFactory.transform(config, handleResponse);
        if (finishTransformation) {
          this.validateRawConfig(rawConfig);
          return rawConfig;
        }
        config = rawConfig;
      }
    }

    // If none can handle it, just return the original config
    this.validateRawConfig(config);
    return config;
  }

  /**
   * Check if the given config is valid.
   * Will throw an error if it is invalid.
   * @param rawConfig The config resource to validate.
   */
  public validateRawConfig(rawConfig: Resource): void {
    this.validateParam(rawConfig, 'requireName', 'Literal');
    this.validateParam(rawConfig, 'requireElement', 'Literal', true);
    this.validateParam(rawConfig, 'requireNoConstructor', 'Literal', true);
  }

  /**
   * Check if the given field of given type exists in the given resource.
   * @param config A resource to look in.
   * @param field A field name to look for.
   * @param type The term type to expect.
   * @param optional If the field is optional.
   */
  public validateParam(config: Resource, field: string, type: string, optional?: boolean): void {
    if (!config.property[field]) {
      if (!optional) {
        throw new ErrorResourcesContext(`Invalid config: Missing ${field}`, { config });
      } else {
        return;
      }
    }
    if (config.property[field].type !== type) {
      throw new ErrorResourcesContext(`Invalid config: ${field} "${config.property[field].value}" must be a ${type}, but got ${config.property[field].type}`, { config });
    }
  }

  /**
   * Returns the instance registry.
   */
  public getInstanceRegistry(): Record<string, Promise<any>> {
    return this.instances;
  }

  /**
   * Resets all preprocessors and clears the cached instances.
   */
  public reset(): void {
    this.instances = {};
    for (const preprocessor of this.configPreprocessors) {
      preprocessor.reset();
    }
  }
}

export interface IInstancePoolOptions<Instance, InstanceOut = Instance> {
  /**
   * The RDF object loader.
   */
  objectLoader: RdfObjectLoader;
  /**
   * Config preprocessors.
   */
  configPreprocessors: IConfigPreprocessor<any>[];
  /**
   * The strategy for construction.
   */
  constructionStrategy: IConstructionStrategy<Instance, InstanceOut>;
  /**
   * The module state.
   */
  moduleState: IModuleState;
}
