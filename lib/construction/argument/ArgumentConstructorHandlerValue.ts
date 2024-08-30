import type { Resource } from 'rdf-object';
import type { IConstructionSettings } from '../IConstructionSettings.js';
import type { IArgumentConstructorHandler } from './IArgumentConstructorHandler.js';
import type { IArgumentsConstructor } from './IArgumentsConstructor.js';

/**
 * Handles value references, by recursively calling the args creator with the referred value.
 */
export class ArgumentConstructorHandlerValue implements IArgumentConstructorHandler {
  public canHandle<Instance, InstanceOut = Instance>(
    value: Resource,
    settings: IConstructionSettings,
    argsCreator: IArgumentsConstructor<Instance, InstanceOut>,
  ): boolean {
    return Boolean(value.property.value);
  }

  public async handle<Instance, InstanceOut = Instance>(
    value: Resource,
    settings: IConstructionSettings,
    argsCreator: IArgumentsConstructor<Instance, InstanceOut>,
  ): Promise<Instance> {
    return await argsCreator.getArgumentValues(value.properties.value, settings);
  }
}
