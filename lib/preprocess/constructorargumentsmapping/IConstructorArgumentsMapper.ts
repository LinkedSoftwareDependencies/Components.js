import type { RdfObjectLoader, Resource } from 'rdf-object';

/**
 * Instances of this interfaces can apply constructor arguments on configs.
 * This is mainly used by {@link IConstructorArgumentsElementMappingHandler}.
 */
export interface IConstructorArgumentsMapper {
  readonly objectLoader: RdfObjectLoader;

  /**
   * Map config with param instantiations to a raw config according to the given constructor arguments definition.
   *
   * For example, the constructor arg { key: '"param0"', value: 'http://example.org/param0' }
   * with config { 'http://example.org/param0': '"abc"' }
   * will be mapped to { key: '"param0"', value: '"abc"' }.
   *
   * @param configRoot The root config resource that we are working in.
   * @param constructorArgs Object mapping definition inside the constructor arguments.
   * @param configElement Part of the config resource to look for parameter instantiations as predicates.
   */
  applyConstructorArgumentsParameters: (
    configRoot: Resource,
    constructorArgs: Resource,
    configElement: Resource,
  ) => Resource[];

  /**
   * Obtain the value(s) of the given parameter in the given config.
   * @param configRoot The root config resource that we are working in.
   * @param parameter The parameter resource to get the value for.
   * @param configElement Part of the config resource to look for parameter instantiations as predicates.
   * @param rawValue If the IRI represents a raw string value instead of a parameter reference.
   */
  getParameterValue: (
    configRoot: Resource,
    parameter: Resource,
    configElement: Resource,
    rawValue: boolean,
  ) => Resource[];
}
