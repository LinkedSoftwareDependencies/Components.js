import type { Resource } from 'rdf-object';
import type { IInstantiationSettingsInner } from './IInstantiationSettings';

/**
 * Manages and creates instances of components.
 */
export interface IInstancePool {
  /**
   * Instantiate a component based on a Resource.
   * @param configResource A config resource.
   * @param settings The settings for creating the instance.
   * @returns {any} The run instance.
   */
  instantiate: <Instance>(
    configResource: Resource,
    settings: IInstantiationSettingsInner<Instance>,
  ) => Promise<Instance>;

}
