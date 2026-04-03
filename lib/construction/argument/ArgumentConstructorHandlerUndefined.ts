import type { Resource } from 'rdf-object';
import type { IConstructionSettings } from '../IConstructionSettings';
import type { IArgumentConstructorHandler } from './IArgumentConstructorHandler';
import type { IArgumentsConstructor } from './IArgumentsConstructor';

/**
 * Handles undefined values.
 */
export class ArgumentConstructorHandlerUndefined implements IArgumentConstructorHandler {
  public canHandle<TInstance>(
    value: Resource,
    _settings: IConstructionSettings,
    _argsCreator: IArgumentsConstructor<TInstance>,
  ): boolean {
    return Boolean(value.property.undefined);
  }

  public async handle<TInstance>(
    value: Resource,
    settings: IConstructionSettings,
    argsCreator: IArgumentsConstructor<TInstance>,
  ): Promise<TInstance> {
    return argsCreator.constructionStrategy.createUndefined();
  }
}
