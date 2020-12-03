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

}
