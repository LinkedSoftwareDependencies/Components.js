import type { Resource } from 'rdf-object';
import { ErrorResourcesContext } from '../../util/ErrorResourcesContext.js';
import type { IConstructionSettings } from '../IConstructionSettings.js';
import type { IArgumentConstructorHandler } from './IArgumentConstructorHandler.js';
import type { IArgumentsConstructor } from './IArgumentsConstructor.js';

/**
 * Handles arguments with fields as hashes.
 */
export class ArgumentConstructorHandlerHash implements IArgumentConstructorHandler {
  public canHandle<Instance, InstanceOut = Instance>(
    value: Resource,
    settings: IConstructionSettings,
    argsCreator: IArgumentsConstructor<Instance, InstanceOut>,
  ): boolean {
    return Boolean(value.property.fields);
  }

  public async handle<Instance, InstanceOut = Instance>(
    argument: Resource,
    settings: IConstructionSettings,
    argsCreator: IArgumentsConstructor<Instance, InstanceOut>,
  ): Promise<Instance> {
    const fields = argument.property.fields.list || [];

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
