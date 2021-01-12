import type { Resource } from 'rdf-object';

/**
 * Transforms an enhanced config of a certain form into a raw config
 * so that it can be instantiated by {@link ConfigConstructor}.
 */
export interface IConfigPreprocessor<HR> {
  /**
   * Check if this transformer can handle the given resource shape.
   * @param config Config to transform.
   */
  canHandle: (config: Resource) => HR | undefined;
  /**
   * Transform the given config into a raw config resource.
   * @param config Config to transform.
   * @param handleResponse Return value of the {#canHandle}.
   */
  transform: (config: Resource, handleResponse: HR) => Resource;
}
