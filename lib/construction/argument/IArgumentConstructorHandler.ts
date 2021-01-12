import type { Resource } from 'rdf-object';
import type { IConstructionSettings } from '../IConstructionSettings';
import type { IArgumentsConstructor } from './IArgumentsConstructor';

/**
 * Creates instances for specific types of arguments.
 */
export interface IArgumentConstructorHandler {
  /**
   * Check if this can handle the given argument.
   * @param value An argument value.
   * @param settings Creation settings.
   * @param argsCreator Instance of the arguments creator that can be used to handle recursive args.
   */
  canHandle: <Instance>(
    value: Resource,
    settings: IConstructionSettings,
    argsCreator: IArgumentsConstructor<Instance>,
  ) => boolean;

  /**
   * Create an instance for the given argument.
   * @param value An argument value.
   * @param settings Creation settings.
   * @param argsCreator Instance of the arguments creator that can be used to handle recursive args.
   */
  handle: <Instance>(
    value: Resource,
    settings: IConstructionSettings,
    argsCreator: IArgumentsConstructor<Instance>,
  ) => Promise<Instance>;
}
