import type { Resource } from 'rdf-object';
import type { IInstantiationSettingsInner } from '../IInstantiationSettings';
import type { IArgumentCreationHandler } from './IArgumentCreationHandler';
import type { IArgumentsCreator } from './IArgumentsCreator';

/**
 * Handles value references, by recursively calling the args creator with the referred value.
 */
export class ArgumentCreationHandlerValue implements IArgumentCreationHandler {
  public canHandle<Instance>(
    value: Resource,
    settings: IInstantiationSettingsInner<Instance>,
    argsCreator: IArgumentsCreator,
  ): boolean {
    return Boolean(value.property.value);
  }

  public async handle<Instance>(
    value: Resource,
    settings: IInstantiationSettingsInner<Instance>,
    argsCreator: IArgumentsCreator,
  ): Promise<Instance> {
    return await argsCreator.getArgumentValues(value.properties.value, settings);
  }
}
