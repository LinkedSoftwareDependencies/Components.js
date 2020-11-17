import type { Resource } from 'rdf-object';
import type { ICreationSettings, IComponentFactory } from './factory/IComponentFactory';

/**
 * Manages and creates instances of components.
 */
export interface IInstancePool {

  /**
   * Get a component config constructor based on a Resource.
   * @param configResource A config resource.
   * @returns The component factory.
   */
  getConfigConstructor: (configResource: Resource) => IComponentFactory;

  /**
   * Instantiate a component based on a Resource.
   * @param configResource A config resource.
   * @param settings The settings for creating the instance.
   * @returns {any} The run instance.
   */
  instantiate: (configResource: Resource, settings: ICreationSettings) => Promise<any>;

}
