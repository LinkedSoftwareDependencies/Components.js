import type { Resource } from 'rdf-object';
import { ErrorResourcesContext } from '../../util/ErrorResourcesContext.js';
import type { IConstructionSettings } from '../IConstructionSettings.js';
import type { IArgumentConstructorHandler } from './IArgumentConstructorHandler.js';
import type { IArgumentsConstructor } from './IArgumentsConstructor.js';

/**
 * Handles arguments with elements as array.
 */
export class ArgumentConstructorHandlerArray implements IArgumentConstructorHandler {
  public canHandle<Instance, InstanceOut = Instance>(
    value: Resource,
    settings: IConstructionSettings,
    argsCreator: IArgumentsConstructor<Instance, InstanceOut>,
  ): boolean {
    return Boolean(value.property.elements);
  }

  public async handle<Instance, InstanceOut = Instance>(
    argument: Resource,
    settings: IConstructionSettings,
    argsCreator: IArgumentsConstructor<Instance, InstanceOut>,
  ): Promise<Instance> {
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
