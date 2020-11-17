import type { IModuleState } from '../ModuleStateBuilder';

/**
 * Creates an instance of a given component.
 */
export interface IComponentFactory {
  /**
     * @param settings The settings for creating the instance.
     * @returns New instantiations of the provided arguments.
     */
  createArguments: (settings: ICreationSettingsInner) => Promise<any[]>;
  /**
     * @param settings The settings for creating the instance.
     * @returns A new instance of the component.
     */
  createInstance: (settings: ICreationSettingsInner) => Promise<any>;
}

export interface ICreationSettings {
  /**
   * @param shallow If no component constructors should recursively be called.
   */
  shallow?: boolean;
  /**
   * The config resource id's to ignore in parameters. Used for avoiding infinite recursion.
   */
  resourceBlacklist?: Record<string, boolean>;
  /**
   * An array of code lines representing an instantiation.
   * This may only be non-falsy if the instance should be serialized.
   */
  serializations?: string[];
  /**
   * If the exported instance should be exposed as a function, which accepts an optional hash of variables.
   * Only applicable during serialization.
   * If this is true, variables will be extracted from the `variables` hash.
   */
  asFunction?: boolean;
  /**
   * Mapping of variable id's to values.
   */
  variables?: Record<string, any>;
}

export interface ICreationSettingsInner extends ICreationSettings {
  /**
   * The current module state.
   */
  moduleState: IModuleState;
}
