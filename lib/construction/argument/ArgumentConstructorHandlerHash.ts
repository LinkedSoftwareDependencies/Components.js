import type { Resource } from 'rdf-object';
import { ErrorResourcesContext } from '../../util/ErrorResourcesContext';
import type { IConstructionSettings } from '../IConstructionSettings';
import type { IArgumentConstructorHandler } from './IArgumentConstructorHandler';
import type { IArgumentsConstructor } from './IArgumentsConstructor';

/**
 * Handles arguments with fields as hashes.
 */
export class ArgumentConstructorHandlerHash implements IArgumentConstructorHandler {
  public canHandle<TInstance>(
    value: Resource,
    _settings: IConstructionSettings,
    _argsCreator: IArgumentsConstructor<TInstance>,
  ): boolean {
    return Boolean(value.property.fields);
  }

  public async handle<TInstance>(
    argument: Resource,
    settings: IConstructionSettings,
    argsCreator: IArgumentsConstructor<TInstance>,
  ): Promise<TInstance> {
    const fields = argument.property.fields.list ?? [];

    // Determine all key-value pairs
    const entries = await Promise.all(fields.map(async(entry: Resource) => {
      // Validate entry
      if (!entry.property.key) {
        throw new ErrorResourcesContext(`Missing key in fields entry`, { entry, argument });
      }

      const key = await argsCreator.getArgumentValues(entry.properties.key, settings);
      if (typeof key !== 'string') {
        throw new ErrorResourcesContext(`Illegal non-string key (${entry.property.key.value} as ${entry.property.key.type}) in fields entry`, { entry, argument });
      }

      // Recursively get value arg value
      if (entry.property.value) {
        const subValue = await argsCreator.getArgumentValues(entry.properties.value, settings);
        return { key, value: subValue };
      }

      // Ignore cases where value may not be set, because params may be optional
    }));

    // Create a hash containing the key-value pairs
    return argsCreator.constructionStrategy.createHash({ settings, entries });
  }
}
