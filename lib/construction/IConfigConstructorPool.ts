import type { Resource } from 'rdf-object';
import type { IConstructionSettings } from './IConstructionSettings';

/**
 * Manages and creates instances of components.
 */
export interface IConfigConstructorPool<Instance> {
  /**
   * Instantiate a component based on a Resource.
   * @param configResource A config resource.
   * @param settings The settings for creating the instance.
   * @returns {any} The run instance.
   */
  instantiate: (
    configResource: Resource,
    settings: IConstructionSettings,
  ) => Promise<Instance>;

  /**
   * Return the instance regsitry.
   * This is a hash from registered id to a Promise of the Instance.
   */
  getInstanceRegistry: () => Record<string, Promise<Instance>>;

  /**
   * Resets any internal state to what it originally was.
   * Used when new components are added inbetween 2 instantiations.
   */
  reset: () => void;
}
