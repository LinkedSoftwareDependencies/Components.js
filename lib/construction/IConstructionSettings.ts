/**
 * Settings for the construction of a specific config.
 */
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
  /**
   * Whether to use the ESM module format.
   */
  esm?: boolean;
}
