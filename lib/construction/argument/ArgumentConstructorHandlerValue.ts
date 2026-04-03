import type { Resource } from 'rdf-object';
import type { IConstructionSettings } from '../IConstructionSettings';
import type { IArgumentConstructorHandler } from './IArgumentConstructorHandler';
import type { IArgumentsConstructor } from './IArgumentsConstructor';

/**
 * Handles value references, by recursively calling the args creator with the referred value.
 */
export class ArgumentConstructorHandlerValue implements IArgumentConstructorHandler {
  public canHandle<TInstance>(
    value: Resource,
    _settings: IConstructionSettings,
    _argsCreator: IArgumentsConstructor<TInstance>,
  ): boolean {
    return Boolean(value.property.value);
  }

  public async handle<TInstance>(
    value: Resource,
    settings: IConstructionSettings,
    argsCreator: IArgumentsConstructor<TInstance>,
  ): Promise<TInstance> {
    return await argsCreator.getArgumentValues(value.properties.value, settings);
  }
}
