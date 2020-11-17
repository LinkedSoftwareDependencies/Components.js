import type { Resource, RdfObjectLoader } from 'rdf-object';
import type { IInstancePool } from '../IInstancePool';

export type ComponentFactoryOptions = IComponentFactoryOptionsBase | IComponentFactoryOptionsNamed;

export interface IComponentFactoryOptionsBase {
  objectLoader: RdfObjectLoader;
  config: Resource;
  constructable: boolean;
  overrideRequireNames: Record<string, string>;
  instancePool: IInstancePool;
}

export interface IComponentFactoryOptionsNamed extends IComponentFactoryOptionsBase {
  moduleDefinition: Resource;
  componentDefinition: Resource;
}
