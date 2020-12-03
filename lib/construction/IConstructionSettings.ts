import type { IModuleState } from '../ModuleStateBuilder';
import type { IConstructionStrategy } from './strategy/IConstructionStrategy';

export interface IConstructionSettings {
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

export interface IConstructionSettingsInner<Instance> extends IConstructionSettings {
  /**
   * The current module state.
   */
  moduleState: IModuleState;
  /**
   * The strategy for creating instances.
   */
  creationStrategy: IConstructionStrategy<Instance>;
}
