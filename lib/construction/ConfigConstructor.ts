import type { Resource, RdfObjectLoader } from 'rdf-object';
import type { IModuleState } from '../loading/ModuleStateBuilder';
import { ErrorResourcesContext } from '../util/ErrorResourcesContext';
import { ArgumentConstructorHandlerArray } from './argument/ArgumentConstructorHandlerArray';
import { ArgumentConstructorHandlerHash } from './argument/ArgumentConstructorHandlerHash';
import { ArgumentConstructorHandlerPrimitive } from './argument/ArgumentConstructorHandlerPrimitive';
import { ArgumentConstructorHandlerReference } from './argument/ArgumentConstructorHandlerReference';
import { ArgumentConstructorHandlerValue } from './argument/ArgumentConstructorHandlerValue';
import type { IArgumentConstructorHandler } from './argument/IArgumentConstructorHandler';
import type { IArgumentsConstructor } from './argument/IArgumentsConstructor';
import type { IConfigConstructorPool } from './IConfigConstructorPool';
import type { IConstructionSettings } from './IConstructionSettings';
import type { IConstructionStrategy } from './strategy/IConstructionStrategy';

/**
 * Creates instances of raw configs using the configured creation strategy.
 *
 * A raw config MUST adhere to the following shape:
 * * requireName: required
 * * requireElement: optional
 * * arguments: optional
 *
 * Arguments will recursively be converted to instances using {@link IArgumentConstructorHandler}'s.
 *
 * This will always create unique instances of configs.
 * If you want to make sure that instances are reused,
 * be sure to call {@link ConfigConstructorPool} instead.
 */
export class ConfigConstructor<Instance> implements IArgumentsConstructor<Instance> {
  private static readonly ARGS_HANDLERS: IArgumentConstructorHandler[] = [
    new ArgumentConstructorHandlerHash(),
    new ArgumentConstructorHandlerArray(),
    new ArgumentConstructorHandlerValue(),
    new ArgumentConstructorHandlerReference(),
    new ArgumentConstructorHandlerPrimitive(),
  ];

  public readonly objectLoader: RdfObjectLoader;
  public readonly configConstructorPool: IConfigConstructorPool<Instance>;
  public readonly constructionStrategy: IConstructionStrategy<Instance>;
  private readonly moduleState: IModuleState;

  public constructor(options: IConfigConstructorOptions<Instance>) {
    this.objectLoader = options.objectLoader;
    this.configConstructorPool = options.configConstructorPool;
    this.constructionStrategy = options.constructionStrategy;
    this.moduleState = options.moduleState;
  }

  public async getArgumentValues(
    values: Resource[],
    settings: IConstructionSettings,
  ): Promise<Instance> {
    // Unwrap unique values out of the array
    if (values.length > 0 && values[0].property.unique && values[0].property.unique.value === 'true') {
      return this.getArgumentValue(values[0], settings);
    }

    // Otherwise, keep the array form
    const elements = await Promise.all(values.map(element => this.getArgumentValue(element, settings)));
    return this.constructionStrategy.createArray({ settings, elements });
  }

  public async getArgumentValue(
    value: Resource,
    settings: IConstructionSettings,
  ): Promise<Instance> {
    // Check if this args resource can be handled by one of the built-in handlers.
    for (const handler of ConfigConstructor.ARGS_HANDLERS) {
      if (handler.canHandle(value, settings, this)) {
        return handler.handle(value, settings, this);
      }
    }

    // Error if no handlers can handle this argument
    throw new ErrorResourcesContext('Unsupported argument value during config construction', { value });
  }

  /**
   * Create constructor arguments for the given config's constructor.
   * @param config The config to instantiate.
   * @param settings The settings for creating the instance.
   * @returns New instantiations of the provided arguments.
   */
  public async createArguments(
    config: Resource,
    settings: IConstructionSettings,
  ): Promise<Instance[]> {
    if (config.property.arguments) {
      if (!config.property.arguments.list) {
        throw new ErrorResourcesContext('Detected non-RDF-list as value for config arguments', { config });
      }
      return await Promise.all(config.property.arguments.list
        .map((resource: Resource) => this.getArgumentValue(resource, settings)));
    }
    return [];
  }

  /**
   * Create an instance based on the given config.
   * @param config The config to instantiate.
   * @param settings The settings for creating the instance.
   * @returns A new instance of the component.
   */
  public async createInstance(
    config: Resource,
    settings: IConstructionSettings,
  ): Promise<Instance> {
    const args: Instance[] = await this.createArguments(config, settings);
    return this.constructionStrategy.createInstance({
      settings,
      moduleState: this.moduleState,
      requireName: config.property.requireName.value,
      requireElement: config.property.requireElement?.value,
      callConstructor: !config.isA('Instance') &&
        (!config.property.requireNoConstructor || config.property.requireNoConstructor.value !== 'true'),
      instanceId: (config.property.originalInstance || config).value,
      args,
    });
  }
}

/**
 * Options for a component factory.
 */
export interface IConfigConstructorOptions<Instance> {
  /**
   * The RDF object loader.
   */
  objectLoader: RdfObjectLoader;
  /**
   * The instance pool.
   */
  configConstructorPool: IConfigConstructorPool<Instance>;
  /**
   * The strategy for construction.
   */
  constructionStrategy: IConstructionStrategy<Instance>;
  /**
   * The module state.
   */
  moduleState: IModuleState;
}
