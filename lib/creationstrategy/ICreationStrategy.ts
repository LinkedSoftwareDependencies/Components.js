import type { ICreationSettingsInner } from '../factory/IComponentFactory';

/**
 * Implementations of this interface represent a certain strategy for creating instances.
 */
export interface ICreationStrategy<Instance> {
  /**
   * Create a new instance of the given referenced element.
   * @param options Options
   */
  createInstance: (options: ICreationStrategyInstanceOptions<Instance>) => Instance;
  /**
   * Create a hash object.
   * @param options Options
   */
  createHash: (options: ICreationStrategyHashOptions<Instance>) => Instance;
  /**
   * Create an array.
   * @param options Options
   */
  createArray: (options: ICreationStrategyArrayOptions<Instance>) => Instance;
  /**
   * Create a lazy supplier, i.e., a zero-args lambda that returns a promise.
   * @param options Options
   */
  createLazySupplier: (options: ICreationStrategySupplierOptions<Instance>) => Promise<Instance>;
  /**
   * Create a primitive string or number value.
   * @param options Options
   */
  createPrimitive: (options: ICreationStrategyPrimitiveOptions<Instance>) => Instance;
  /**
   * Create a representation for something undefined.
   */
  createUndefined: () => Instance;
  /**
   * Get the value of a variable.
   * @param options Options
   */
  getVariableValue: (options: ICreationStrategyVariableOptions<Instance>) => Instance;
}

export interface ICreationStrategyInstanceOptions<Instance> {
  /**
   * Creation settings.
   */
  settings: ICreationSettingsInner<Instance>;
  /**
   * The module that is being required. `require(<this>)`
   */
  requireName: string;
  /**
   * The element inside the module that is to be selected. `require(...)<this>`
   * For example `MyClass` or `path.to.MyClass`.
   */
  requireElement: string | undefined;
  /**
   * If the constructor of the element should be called with `args`.
   * Otherwise, the require'd element will be returned as-is.
   */
  callConstructor: boolean;
  /**
   * The arguments to pass to the constructor.
   */
  args: Instance[];
  /**
   * An identifier for the instance.
   * This may for example be used for determining variable names.
   */
  instanceId: string;
}

export interface ICreationStrategyHashOptions<Instance> {
  /**
   * Creation settings.
   */
  settings: ICreationSettingsInner<Instance>;
  /**
   * An array of key-value entries for the hash.
   */
  entries: ({ key: string; value: Instance } | undefined)[];
}

export interface ICreationStrategyArrayOptions<Instance> {
  /**
   * Creation settings.
   */
  settings: ICreationSettingsInner<Instance>;
  /**
   * An array of elements.
   */
  elements: Instance[];
}

export interface ICreationStrategySupplierOptions<Instance> {
  /**
   * Creation settings.
   */
  settings: ICreationSettingsInner<Instance>;
  /**
   * A lazy instance supplier.
   */
  supplier: () => Promise<Instance>;
}

export interface ICreationStrategyPrimitiveOptions<Instance> {
  /**
   * Creation settings.
   */
  settings: ICreationSettingsInner<Instance>;
  /**
   * A string or number value.
   */
  value: string | number;
}

export interface ICreationStrategyVariableOptions<Instance> {
  /**
   * Creation settings.
   */
  settings: ICreationSettingsInner<Instance>;
  /**
   * A variable name.
   */
  variableName: string;
}
