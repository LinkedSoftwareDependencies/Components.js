import type { Resource } from 'rdf-object';
import type { IConstructionSettingsInner } from './IConstructionSettings';

/**
 * Manages and creates instances of components.
 */
export interface IConfigConstructorPool {
  /**
   * Instantiate a component based on a Resource.
   * @param configResource A config resource.
   * @param settings The settings for creating the instance.
   * @returns {any} The run instance.
   */
  instantiate: <Instance>(
    configResource: Resource,
    settings: IConstructionSettingsInner<Instance>,
  ) => Promise<Instance>;

}
