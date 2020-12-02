import type { ICreationStrategy } from '../creationstrategy/ICreationStrategy';
import type { IModuleState } from '../ModuleStateBuilder';

export interface IInstantiationSettings {
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

export interface IInstantiationSettingsInner<Instance> extends IInstantiationSettings {
  /**
   * The current module state.
   */
  moduleState: IModuleState;
  /**
   * The strategy for creating instances.
   */
  creationStrategy: ICreationStrategy<Instance>;
}
