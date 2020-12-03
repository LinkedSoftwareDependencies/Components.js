import type { Resource } from 'rdf-object';
import type { IConstructionSettingsInner } from '../IConstructionSettings';
import type { IArgumentConstructorHandler } from './IArgumentConstructorHandler';
import type { IArgumentsConstructor } from './IArgumentsConstructor';

/**
 * Handles value references, by recursively calling the args creator with the referred value.
 */
export class ArgumentConstructorHandlerValue implements IArgumentConstructorHandler {
  public canHandle<Instance>(
    value: Resource,
    settings: IConstructionSettingsInner<Instance>,
    argsCreator: IArgumentsConstructor,
  ): boolean {
    return Boolean(value.property.value);
  }

  public async handle<Instance>(
    value: Resource,
    settings: IConstructionSettingsInner<Instance>,
    argsCreator: IArgumentsConstructor,
  ): Promise<Instance> {
    return await argsCreator.getArgumentValues(value.properties.value, settings);
  }
}
