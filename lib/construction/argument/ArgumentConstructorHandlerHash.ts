import type { Resource } from 'rdf-object';
import { ErrorResourcesContext } from '../../util/ErrorResourcesContext';
import type { IConstructionSettings } from '../IConstructionSettings';
import type { IArgumentConstructorHandler } from './IArgumentConstructorHandler';
import type { IArgumentsConstructor } from './IArgumentsConstructor';

/**
 * Handles arguments with fields as hashes.
 */
export class ArgumentConstructorHandlerHash implements IArgumentConstructorHandler {
  public canHandle<Instance>(
    value: Resource,
    settings: IConstructionSettings,
    argsCreator: IArgumentsConstructor<Instance>,
  ): boolean {
    return Boolean(value.property.fields || value.property.hasFields);
  }

  public async handle<Instance>(
    argument: Resource,
    settings: IConstructionSettings,
    argsCreator: IArgumentsConstructor<Instance>,
  ): Promise<Instance> {
    // Determine all key-value pairs
    const entries = await Promise.all(argument.properties.fields.map(async(entry: Resource) => {
      // Validate entry
      if (!entry.property.key) {
        throw new ErrorResourcesContext(`Missing key in fields entry`, { entry, argument });
      }
      if (entry.property.key.type !== 'Literal') {
        throw new ErrorResourcesContext(`Illegal non-literal key (${entry.property.key.value} as ${entry.property.key.type}) in fields entry`, { entry, argument });
      }

      // Recursively get value arg value
      if (entry.property.value) {
        const subValue = await argsCreator.getArgumentValues(entry.properties.value, settings);
        return { key: entry.property.key.value, value: subValue };
      }

      // Ignore cases where value may not be set, because params may be optional
    }));

    // Create a hash containing the key-value pairs
    return argsCreator.constructionStrategy.createHash({ settings, entries });
  }
}
