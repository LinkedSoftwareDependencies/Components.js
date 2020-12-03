import type { Resource, RdfObjectLoader } from 'rdf-object';
import type { IInstancePool } from '../IInstancePool';
import type { IInstantiationSettingsInner } from '../IInstantiationSettings';

/**
 * Instances of this interfaces can instantiate argument values.
 * This is mainly used by {@link IArgumentCreationHandler}.
 */
export interface IArgumentsCreator {
  readonly objectLoader: RdfObjectLoader;
  readonly instancePool: IInstancePool;

  /**
   * Convert the given argument values resource into a JavaScript object or primitive.
   * @param values An array of argument values.
   * @param settings Creation settings.
   */
  getArgumentValues: <Instance>(
    values: Resource[],
    settings: IInstantiationSettingsInner<Instance>,
  ) => Promise<Instance>;

  /**
   * Convert the given argument value resource into a JavaScript object or primitive.
   * @param value An argument value.
   * @param settings Creation settings.
   */
  getArgumentValue: <Instance>(
    value: Resource,
    settings: IInstantiationSettingsInner<Instance>,
  ) => Promise<Instance>;
}
