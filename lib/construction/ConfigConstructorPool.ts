import type { Resource, RdfObjectLoader } from 'rdf-object';
import type { IConfigPreprocessor } from '../preprocess/IConfigPreprocessor';
import * as Util from '../Util';
import { ConfigConstructor } from './ConfigConstructor';
import type { IConfigConstructorPool } from './IConfigConstructorPool';
import type { IConstructionSettingsInner } from './IConstructionSettings';

/**
 * Manages and creates instances of components based on a given config.
 *
 * This accepts different config variants, as supported by the configured {@link IConfigPreprocessor}'s.
 *
 * This will make sure that configs with the same id will only be instantiated once,
 * and multiple references to configs will always reuse the same instance.
 */
export class ConfigConstructorPool implements IConfigConstructorPool {
  private readonly configPreprocessors: IConfigPreprocessor<any>[];
  private readonly configConstructor: ConfigConstructor;

  private readonly instances: Record<string, Promise<any>> = {};

  public constructor(options: IInstancePoolOptions) {
    this.configPreprocessors = options.configPreprocessors;
    this.configConstructor = new ConfigConstructor({
      objectLoader: options.objectLoader,
      configConstructorPool: this,
    });
  }

  public async instantiate<Instance>(
    configResource: Resource,
    settings: IConstructionSettingsInner<Instance>,
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
      this.instances[configResource.value] = this.configConstructor.createInstance(
        this.getRawConfig(configResource),
        { resourceBlacklist: subBlackList, ...settings },
      );
    }
    return await this.instances[configResource.value];
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
        const rawConfig = rawConfigFactory.transform(config, handleResponse);
        this.validateRawConfig(rawConfig);
        return rawConfig;
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
   * @param resource A resource to look in.
   * @param field A field name to look for.
   * @param type The term type to expect.
   * @param optional If the field is optional.
   */
  public validateParam(resource: Resource, field: string, type: string, optional?: boolean): void {
    if (!resource.property[field]) {
      if (!optional) {
        throw new Error(`Invalid config: Missing ${field}.
Config: ${Util.resourceToString(resource)}`);
      } else {
        return;
      }
    }
    if (resource.property[field].type !== type) {
      throw new Error(`Invalid config: ${field} (${resource.property[field].value}) must be a ${type}, but got ${resource.property[field].type}.
Config: ${Util.resourceToString(resource)}`);
    }
  }
}

export interface IInstancePoolOptions {
  objectLoader: RdfObjectLoader;
  configPreprocessors: IConfigPreprocessor<any>[];
}
