import type { Resource, RdfObjectLoader } from 'rdf-object';
import * as Util from '../Util';
import { ArgumentCreationHandlerArray } from './argumentcreation/ArgumentCreationHandlerArray';
import { ArgumentCreationHandlerHash } from './argumentcreation/ArgumentCreationHandlerHash';
import { ArgumentCreationHandlerPrimitive } from './argumentcreation/ArgumentCreationHandlerPrimitive';
import { ArgumentCreationHandlerReference } from './argumentcreation/ArgumentCreationHandlerReference';
import { ArgumentCreationHandlerValue } from './argumentcreation/ArgumentCreationHandlerValue';
import type { IArgumentCreationHandler } from './argumentcreation/IArgumentCreationHandler';
import type { IArgumentsCreator } from './argumentcreation/IArgumentsCreator';
import type { IInstancePool } from './IInstancePool';
import type { IInstantiationSettingsInner } from './IInstantiationSettings';

/**
 * Creates instances of raw configs using the configured creation strategy.
 *
 * A raw config MUST adhere to the following shape:
 * * requireName: required
 * * requireElement: optional
 * * arguments: optional
 */
export class ConfigConstructor implements IArgumentsCreator {
  private static readonly ARGS_HANDLERS: IArgumentCreationHandler[] = [
    new ArgumentCreationHandlerHash(),
    new ArgumentCreationHandlerArray(),
    new ArgumentCreationHandlerValue(),
    new ArgumentCreationHandlerReference(),
    new ArgumentCreationHandlerPrimitive(),
  ];

  public readonly objectLoader: RdfObjectLoader;
  public readonly instancePool: IInstancePool;

  public constructor(options: IConfigConstructorOptions) {
    this.objectLoader = options.objectLoader;
    this.instancePool = options.instancePool;
  }

  public async getArgumentValues<Instance>(
    values: Resource[],
    settings: IInstantiationSettingsInner<Instance>,
  ): Promise<Instance> {
    // Unwrap unique values out of the array
    if (values.length > 0 && values[0].property.unique && values[0].property.unique.value === 'true') {
      return this.getArgumentValue(values[0], settings);
    }

    // Otherwise, keep the array form
    const elements = await Promise.all(values.map(element => this.getArgumentValue(element, settings)));
    return settings.creationStrategy.createArray({ settings, elements });
  }

  public async getArgumentValue<Instance>(
    value: Resource,
    settings: IInstantiationSettingsInner<Instance>,
  ): Promise<Instance> {
    // Check if this args resource can be handled by one of the built-in handlers.
    for (const handler of ConfigConstructor.ARGS_HANDLERS) {
      if (handler.canHandle(value, settings, this)) {
        return handler.handle(value, settings, this);
      }
    }

    // Error if no handlers can handle this argument
    throw new Error(`Unsupported argument value during config construction.
Value: ${Util.resourceToString(value)}`);
  }

  /**
   * Create constructor arguments for the given config's constructor.
   * @param config The config to instantiate.
   * @param settings The settings for creating the instance.
   * @returns New instantiations of the provided arguments.
   */
  public async createArguments<Instance>(
    config: Resource,
    settings: IInstantiationSettingsInner<Instance>,
  ): Promise<Instance[]> {
    if (config.property.arguments) {
      if (!config.property.arguments.list) {
        throw new Error(`Detected non-RDF-list as value for config arguments.
Config: ${Util.resourceToString(config)}`);
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
  public async createInstance<Instance>(
    config: Resource,
    settings: IInstantiationSettingsInner<Instance>,
  ): Promise<Instance> {
    const args: Instance[] = await this.createArguments(config, settings);
    return settings.creationStrategy.createInstance({
      settings,
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
export interface IConfigConstructorOptions {
  /**
   * The RDF object loader.
   */
  objectLoader: RdfObjectLoader;
  /**
   * The instance pool.
   */
  instancePool: IInstancePool;
}
