import type { Resource, RdfObjectLoader } from 'rdf-object';
import type { IConfigConstructorPool } from '../IConfigConstructorPool';
import type { IConstructionSettings } from '../IConstructionSettings';
import type { IConstructionStrategy } from '../strategy/IConstructionStrategy';

/**
 * Instances of this interfaces can instantiate argument values.
 * This is mainly used by {@link IArgumentConstructorHandler}.
 */
export interface IArgumentsConstructor<Instance, InstanceOut = Instance> {
  readonly objectLoader: RdfObjectLoader;
  readonly configConstructorPool: IConfigConstructorPool<Instance>;
  readonly constructionStrategy: IConstructionStrategy<Instance, InstanceOut>;

  /**
   * Convert the given argument values resource into a JavaScript object or primitive.
   * @param values An array of argument values.
   * @param settings Creation settings.
   */
  getArgumentValues: (
    values: Resource[],
    settings: IConstructionSettings,
  ) => Promise<Instance>;

  /**
   * Convert the given argument value resource into a JavaScript object or primitive.
   * @param value An argument value.
   * @param settings Creation settings.
   */
  getArgumentValue: (
    value: Resource,
    settings: IConstructionSettings,
  ) => Promise<Instance>;
}
