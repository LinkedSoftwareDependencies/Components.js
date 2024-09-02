import type { Resource } from 'rdf-object';
import type { GenericsContext } from '../GenericsContext.js';

/**
 * Transforms a parameter value based on some kind of parameter property.
 */
export interface IParameterPropertyHandler {
  /**
   * Check if this can handle the given parameter, and possibly modify the given parameter value.
   * @param value The current parameter value obtained from the config.
   *              This may have already been modified by other handlers before this one.
   * @param configRoot The root config resource that we are working in.
   * @param parameter The parameter resource to get the value for.
   * @param configElement Part of the config resource to look for parameter instantiations as predicates.
   * @param genericsContext Context for generic types.
   */
  canHandle: (
    value: Resource | undefined,
    configRoot: Resource,
    parameter: Resource,
    configElement: Resource,
    genericsContext: GenericsContext,
  ) => boolean;
  /**
   * Transform the given parameter value.
   * @param value The current parameter value obtained from the config.
   *              This may have already been modified by other handlers before this one.
   * @param configRoot The root config resource that we are working in.
   * @param parameter The parameter resource to get the value for.
   * @param configElement Part of the config resource to look for parameter instantiations as predicates.
   * @param genericsContext Context for generic types.
   */
  handle: (
    value: Resource | undefined,
    configRoot: Resource,
    parameter: Resource,
    configElement: Resource,
    genericsContext: GenericsContext,
  ) => Resource | undefined;
}
