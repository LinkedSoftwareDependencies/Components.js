import type { Resource } from 'rdf-object';

/**
 * Transforms a resource based on the contents of an override step.
 */
export interface IOverrideStep {
  /**
   * Determines if this handler can apply the given override step to the resource.
   *
   * @param config - The resource to override.
   * @param step - The override step to apply.
   *
   * @returns true if this handler should be used.
   */
  canHandle: (config: Resource, step: Resource) => boolean;

  /**
   * Applies the changes described in the given override step to the resource.
   *
   * @param config - The resource to override.
   * @param step - The override step to apply.
   *
   * @returns The modified resource.
   */
  handle: (config: Resource, step: Resource) => Resource;
}
