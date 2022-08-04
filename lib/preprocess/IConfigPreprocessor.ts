import type { Resource } from 'rdf-object';

export interface IConfigPreprocessorTransform {
  /**
   * If the result is final or other preprocessors are allowed to continue.
   */
  finishTransformation: boolean;
  /**
   * The result of the transform.
   */
  rawConfig: Resource;
}

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
  transform: (config: Resource, handleResponse: HR) => IConfigPreprocessorTransform;
  /**
   * Resets any internal state to what it originally was.
   * Used when new components are added inbetween 2 instantiations.
   */
  reset: () => void;
}
