import type { Resource } from 'rdf-object';
import type { IConstructorArgumentsMapper } from './IConstructorArgumentsMapper';

/**
 * Handles a specific type of a constructor argument element.
 */
export interface IConstructorArgumentsElementMappingHandler {
  /**
   * Check if this can handle the given constructor argument.
   * @param configRoot The root config resource that we are working in.
   * @param constructorArgs Object mapping definition inside the constructor arguments.
   * @param configElement Part of the config resource to look for parameter instantiations as predicates.
   * @param mapper Instance of the constructor arguments mapper that can be used to handle recursive args.
   */
  canHandle: (
    configRoot: Resource,
    constructorArgs: Resource,
    configElement: Resource,
    mapper: IConstructorArgumentsMapper,
  ) => boolean;
  /**
   * Map the given config element with param instantiations
   * to a raw config according to the given constructor arguments definition.
   * @param configRoot The root config resource that we are working in.
   * @param constructorArgs Object mapping definition inside the constructor arguments.
   * @param configElement Part of the config resource to look for parameter instantiations as predicates.
   * @param mapper Instance of the constructor arguments mapper that can be used to handle recursive args.
   */
  handle: (
    configRoot: Resource,
    constructorArgs: Resource,
    configElement: Resource,
    mapper: IConstructorArgumentsMapper,
  ) => Resource;
}
