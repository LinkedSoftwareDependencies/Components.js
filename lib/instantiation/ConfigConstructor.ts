import type { Resource, RdfObjectLoader } from 'rdf-object';
import * as Util from '../Util';
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
export class ConfigConstructor {
  protected readonly objectLoader: RdfObjectLoader;
  protected readonly instancePool: IInstancePool;

  public constructor(options: IConfigConstructorOptions) {
    this.objectLoader = options.objectLoader;
    this.instancePool = options.instancePool;
  }

  /**
   * Convert the given argument values resource into a JavaScript object or primitive.
   * @param values An array of argument values.
   * @param settings Creation settings.
   */
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

  /**
   * Convert the given argument value resource into a JavaScript object or primitive.
   * @param value An argument value.
   * @param settings Creation settings.
   */
  public async getArgumentValue<Instance>(
    value: Resource,
    settings: IInstantiationSettingsInner<Instance>,
  ): Promise<Instance> {
    // Handle hash
    // TODO: HasFields is a hack for making UnmappedNamedComponentFactory work
    if (value.property.fields || value.property.hasFields) {
      // The parameter is an object
      const entries = await Promise.all(value.properties.fields.map(async(entry: Resource) => {
        if (!entry.property.key) {
          throw new Error(`Missing key in fields entry.
Entry: ${Util.resourceToString(entry)}
Fields: ${Util.resourceToString(value)}`);
        }
        if (entry.property.key.type !== 'Literal') {
          throw new Error(`Illegal non-literal key (${Util.resourceIdToString(entry.property.key, this.objectLoader)} as ${entry.property.key.type}) in fields entry.
Entry: ${Util.resourceToString(entry)}
Fields: ${Util.resourceToString(value)}`);
        }
        if (entry.property.value) {
          const subValue = await this.getArgumentValues(entry.properties.value, settings);
          return { key: entry.property.key.value, value: subValue };
        }
        // TODO: should we throw if value is missing?
        // return Promise.reject(
        // new Error('Parameter object entries must have values, but found: ' + JSON.stringify(entry, null, '  ')));
      }));
      return settings.creationStrategy.createHash({ settings, entries });
    }

    // Handle array
    if (value.property.elements) {
      // The parameter is a dynamic array
      const elements = await Promise.all(value.properties.elements.map(async(entry: Resource) => {
        if (!entry.property.value) {
          throw new Error(`Missing value in array elements entry.
Entry: ${Util.resourceToString(entry)}
Elements: ${Util.resourceToString(value)}`);
        } else {
          // TODO: must this be a call to the array form?
          return await this.getArgumentValue(entry.property.value, settings);
        }
      }));
      return settings.creationStrategy.createArray({ settings, elements });
    }

    // Handle reference to another instance
    if (value.type === 'NamedNode' || value.type === 'BlankNode') {
      if (value.property.value) {
        return await this.getArgumentValues(value.properties.value, settings);
      }
      if (settings.shallow) {
        return settings.creationStrategy.createHash({ settings, entries: []});
      }
      if (value.property.lazy && value.property.lazy.value === 'true') {
        const supplier = (): Promise<Instance> => this.instancePool.instantiate(value, settings);
        return await settings.creationStrategy.createLazySupplier({ settings, supplier });
      }
      return await this.instancePool.instantiate(value, settings);
    }

    // Handle primitive value
    if (value.type === 'Literal') {
      // ValueRaw can be set in Util.captureType
      // TODO: improve this, so that the hacked valueRaw is not needed
      const rawValue: any = 'valueRaw' in value.term ? (<any> value.term).valueRaw : value.value;
      if (value.property.lazy && value.property.lazy.value === 'true') {
        const supplier = (): Promise<Instance> => Promise.resolve(settings.creationStrategy
          .createPrimitive({ settings, value: rawValue }));
        return await settings.creationStrategy.createLazySupplier({ settings, supplier });
      }
      return settings.creationStrategy.createPrimitive({ settings, value: rawValue });
    }

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
