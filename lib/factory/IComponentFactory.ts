import type { ICreationStrategy } from '../creationstrategy/ICreationStrategy';
import type { IModuleState } from '../ModuleStateBuilder';

/**
 * Creates an instance of a given component.
 */
export interface IComponentFactory {
  /**
     * @param settings The settings for creating the instance.
     * @returns New instantiations of the provided arguments.
     */
  createArguments: <Instance>(settings: ICreationSettingsInner<Instance>) => Promise<Instance[]>;
  /**
     * @param settings The settings for creating the instance.
     * @returns A new instance of the component.
     */
  createInstance: <Instance>(settings: ICreationSettingsInner<Instance>) => Promise<Instance>;
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
   * Mapping of variable id's to values.
   */
  variables?: Record<string, any>;
}

export interface ICreationSettingsInner<Instance> extends ICreationSettings {
  /**
   * The current module state.
   */
  moduleState: IModuleState;
  /**
   * The strategy for creating instances.
   */
  creationStrategy: ICreationStrategy<Instance>;
}
