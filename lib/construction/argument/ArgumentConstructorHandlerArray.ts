import type { Resource } from 'rdf-object';
import { ErrorResourcesContext } from '../../util/ErrorResourcesContext';
import type { IConstructionSettings } from '../IConstructionSettings';
import type { IArgumentConstructorHandler } from './IArgumentConstructorHandler';
import type { IArgumentsConstructor } from './IArgumentsConstructor';

/**
 * Handles arguments with elements as array.
 */
export class ArgumentConstructorHandlerArray implements IArgumentConstructorHandler {
  public canHandle<TInstance>(
    value: Resource,
    _settings: IConstructionSettings,
    _argsCreator: IArgumentsConstructor<TInstance>,
  ): boolean {
    return Boolean(value.property.elements);
  }

  public async handle<TInstance>(
    argument: Resource,
    settings: IConstructionSettings,
    argsCreator: IArgumentsConstructor<TInstance>,
  ): Promise<TInstance> {
    // Recursively handle all sub-args in the array
    const elements = await Promise.all(argument.properties.elements.map(async(entry: Resource) => {
      if (!entry.property.value) {
        throw new ErrorResourcesContext(`Missing value in array elements entry`, { entry, argument });
      }
      return await argsCreator.getArgumentValue(entry.property.value, settings);
    }));

    return argsCreator.constructionStrategy.createArray({ settings, elements });
  }
}
