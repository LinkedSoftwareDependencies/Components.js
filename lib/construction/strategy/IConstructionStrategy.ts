import type { IModuleState } from '../../loading/ModuleStateBuilder';
import type { IConstructionSettings } from '../IConstructionSettings';

/**
 * Implementations of this interface represent a certain strategy for creating instances.
 */
export interface IConstructionStrategy<TInstance> {
  /**
   * Create a new instance of the given referenced element.
   * @param options Options
   */
  createInstance: (options: ICreationStrategyInstanceOptions<TInstance>) => TInstance;
  /**
   * Create a hash object.
   * @param options Options
   */
  createHash: (options: ICreationStrategyHashOptions<TInstance>) => TInstance;
  /**
   * Create an array.
   * @param options Options
   */
  createArray: (options: ICreationStrategyArrayOptions<TInstance>) => TInstance;
  /**
   * Create a lazy supplier, i.e., a zero-args lambda that returns a promise.
   * @param options Options
   */
  createLazySupplier: (options: ICreationStrategySupplierOptions<TInstance>) => Promise<TInstance>;
  /**
   * Create a primitive string or number value.
   * @param options Options
   */
  createPrimitive: (options: ICreationStrategyPrimitiveOptions<TInstance>) => TInstance;
  /**
   * Create a representation for something undefined.
   */
  createUndefined: () => TInstance;
  /**
   * Get the value of a variable.
   * @param options Options
   */
  getVariableValue: (options: ICreationStrategyVariableOptions<TInstance>) => TInstance;
}

export interface ICreationStrategyInstanceOptions<TInstance> {
  /**
   * Creation settings.
   */
  settings: IConstructionSettings;
  /**
   * The module state.
   */
  moduleState: IModuleState;
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
  args: TInstance[];
  /**
   * An identifier for the instance.
   * This may for example be used for determining variable names.
   */
  instanceId: string;
}

export interface ICreationStrategyHashOptions<TInstance> {
  /**
   * Creation settings.
   */
  settings: IConstructionSettings;
  /**
   * An array of key-value entries for the hash.
   */
  entries: ({ key: string; value: TInstance } | undefined)[];
}

export interface ICreationStrategyArrayOptions<TInstance> {
  /**
   * Creation settings.
   */
  settings: IConstructionSettings;
  /**
   * An array of elements.
   */
  elements: TInstance[];
}

export interface ICreationStrategySupplierOptions<TInstance> {
  /**
   * Creation settings.
   */
  settings: IConstructionSettings;
  /**
   * A lazy instance supplier.
   */
  supplier: () => Promise<TInstance>;
}

export interface ICreationStrategyPrimitiveOptions<TInstance> {
  /**
   * Creation settings.
   */
  settings: IConstructionSettings;
  /**
   * A string, number or object value.
   */
  value: string | number | any;
}

export interface ICreationStrategyVariableOptions<TInstance> {
  /**
   * Creation settings.
   */
  settings: IConstructionSettings;
  /**
   * A variable name.
   */
  variableName: string;
}
