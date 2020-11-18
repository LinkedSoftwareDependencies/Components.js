import type { Resource, RdfObjectLoader } from 'rdf-object';
import type { IInstancePool } from '../IInstancePool';
import * as Util from '../Util';
import type { IComponentFactoryOptionsBase } from './ComponentFactoryOptions';
import type { IComponentFactory, ICreationSettingsInner } from './IComponentFactory';

/**
 * Factory for component definitions with explicit arguments.
 */
export class UnnamedComponentFactory implements IComponentFactory {
  protected readonly objectLoader: RdfObjectLoader;
  protected readonly config: Resource;
  protected readonly constructable: boolean;
  protected readonly instancePool: IInstancePool;

  public constructor(options: IComponentFactoryOptionsBase) {
    this.objectLoader = options.objectLoader;
    this.config = options.config;
    this.constructable = options.constructable;
    this.instancePool = options.instancePool;

    // Validate params
    this.validateParam(this.config, 'requireName', 'Literal');
    this.validateParam(this.config, 'requireElement', 'Literal', true);
    this.validateParam(this.config, 'requireNoConstructor', 'Literal', true);
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
        throw new Error(`Expected ${field} to exist in ${Util.resourceToString(resource)}`);
      } else {
        return;
      }
    }
    if (resource.property[field].type !== type) {
      throw new Error(`Expected ${field} in ${Util.resourceToString(resource)} to be of type ${type}`);
    }
  }

  /**
   * Convert the given argument value resource into a JavaScript object or primitive.
   * @param value One or more argument values.
   * @param settings Creation settings.
   */
  public async getArgumentValue<Instance>(
    value: Resource | Resource[],
    settings: ICreationSettingsInner<Instance>,
  ): Promise<Instance> {
    // Handle an array of input values
    if (Array.isArray(value)) {
      // Unwrap unique values out of the array
      if (value[0].property.unique && value[0].property.unique.value === 'true') {
        return this.getArgumentValue(value[0], settings);
      }
      // Otherwise, keep the array form
      const elements = await Promise.all(value.map(element => this.getArgumentValue(element, settings)));
      return settings.creationStrategy.createArray({ settings, elements });
    }

    // Handle hash
    // TODO: HasFields is a hack for making UnmappedNamedComponentFactory work
    if (value.property.fields || value.property.hasFields) {
      // The parameter is an object
      const entries = await Promise.all(value.properties.fields.map(async(entry: Resource) => {
        if (!entry.property.key) {
          throw new Error(`Parameter object entries must have keys, but found: ${Util.resourceToString(entry)}`);
        }
        if (entry.property.key.type !== 'Literal') {
          throw new Error(`Parameter object keys must be literals, but found type ${entry.property.key.type} for ${Util.resourceIdToString(entry.property.key, this.objectLoader)} while constructing: ${Util.resourceToString(value)}`);
        }
        if (entry.property.value) {
          const subValue = await this.getArgumentValue(entry.properties.value, settings);
          return { key: entry.property.key.value, value: subValue };
        }
        // TODO: only throw an error if the parameter is required
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
          throw new Error(`Parameter array elements must have values, but found: ${Util.resourceToString(entry)}`);
        } else {
          return await this.getArgumentValue(entry.property.value, settings);
        }
      }));
      return settings.creationStrategy.createArray({ settings, elements });
    }

    // Handle reference to another instance
    if (value.type === 'NamedNode' || value.type === 'BlankNode') {
      if (value.property.value) {
        return await this.getArgumentValue(value.properties.value, settings);
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

    throw new Error(`An invalid argument value was found:${Util.resourceToString(value)}`);
  }

  /**
   * Create an array of constructor arguments based on the configured config.
   * @param settings The settings for creating the instance.
   * @returns New instantiations of the provided arguments.
   */
  public async createArguments<Instance>(settings: ICreationSettingsInner<Instance>): Promise<Instance[]> {
    if (this.config.property.arguments) {
      if (!this.config.property.arguments.list) {
        throw new Error(`Detected invalid arguments for component "${Util.resourceIdToString(this.config, this.objectLoader)}": arguments are not an RDF list.`);
      }
      return await Promise.all(this.config.property.arguments.list.map((resource: Resource) => resource ?
        this.getArgumentValue(resource, settings) :
        settings.creationStrategy.createUndefined()));
    }
    return [];
  }

  /**
   * Instantiate the current config.
   * @param settings The settings for creating the instance.
   * @returns A new instance of the component.
   */
  public async createInstance<Instance>(settings: ICreationSettingsInner<Instance>): Promise<Instance> {
    const args: Instance[] = await this.createArguments(settings);
    return settings.creationStrategy.createInstance({
      settings,
      requireName: this.config.property.requireName.value,
      requireElement: this.config.property.requireElement?.value,
      callConstructor: this.constructable && (!this.config.property.requireNoConstructor ||
        this.config.property.requireNoConstructor.value !== 'true'),
      instanceId: (this.config.property.originalInstance || this.config).value,
      args,
    });
  }
}
