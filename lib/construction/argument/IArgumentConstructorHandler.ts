import type { Resource } from 'rdf-object';
import type { IConstructionSettings } from '../IConstructionSettings.js';
import type { IArgumentsConstructor } from './IArgumentsConstructor.js';

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
  canHandle: <Instance, InstanceOut = Instance>(
    value: Resource,
    settings: IConstructionSettings,
    argsCreator: IArgumentsConstructor<Instance, InstanceOut>,
  ) => boolean;

  /**
   * Create an instance for the given argument.
   * @param value An argument value.
   * @param settings Creation settings.
   * @param argsCreator Instance of the arguments creator that can be used to handle recursive args.
   */
  handle: <Instance, InstanceOut = Instance>(
    value: Resource,
    settings: IConstructionSettings,
    argsCreator: IArgumentsConstructor<Instance, InstanceOut>,
  ) => Promise<Instance>;
}
