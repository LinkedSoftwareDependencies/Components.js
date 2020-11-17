import type { Resource, RdfObjectLoader } from 'rdf-object';
import type { IInstancePool } from '../IInstancePool';

/**
 * Options for a component factory.
 */
export type ComponentFactoryOptions = IComponentFactoryOptionsBase | IComponentFactoryOptionsNamed;

/**
 * Options for a component factory without a defined component and module definition.
 */
export interface IComponentFactoryOptionsBase {
  /**
   * The RDF object loader.
   */
  objectLoader: RdfObjectLoader;
  /**
   * The config to instantiate.
   */
  config: Resource;
  /**
   * If the given config refers to a constructable instance.
   */
  constructable: boolean;
  /**
   * Overrides for `require()` calls.
   * For example, an override entry `abc -> def` will map all calls from `require('abc')` to `require('def')`.
   */
  overrideRequireNames: Record<string, string>;
  /**
   * The instance pool.
   */
  instancePool: IInstancePool;
}

/**
 * Options for component factories with a defined component and module definition.
 */
export interface IComponentFactoryOptionsNamed extends IComponentFactoryOptionsBase {
  /**
   * Definition for a module.
   */
  moduleDefinition: Resource;
  /**
   * Definition for a component.
   */
  componentDefinition: Resource;
}
