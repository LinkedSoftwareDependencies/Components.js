import type { Resource } from 'rdf-object';
import * as Util from '../../Util';
import type { IConstructionSettings } from '../IConstructionSettings';
import type { IArgumentConstructorHandler } from './IArgumentConstructorHandler';
import type { IArgumentsConstructor } from './IArgumentsConstructor';

/**
 * Handles arguments with elements as array.
 */
export class ArgumentConstructorHandlerArray implements IArgumentConstructorHandler {
  public canHandle<Instance>(
    value: Resource,
    settings: IConstructionSettings,
    argsCreator: IArgumentsConstructor<Instance>,
  ): boolean {
    return Boolean(value.property.elements);
  }

  public async handle<Instance>(
    value: Resource,
    settings: IConstructionSettings,
    argsCreator: IArgumentsConstructor<Instance>,
  ): Promise<Instance> {
    // Recursively handle all sub-args in the array
    const elements = await Promise.all(value.properties.elements.map(async(entry: Resource) => {
      if (!entry.property.value) {
        throw new Error(`Missing value in array elements entry.
Entry: ${Util.resourceToString(entry)}
Elements: ${Util.resourceToString(value)}`);
      }
      return await argsCreator.getArgumentValue(entry.property.value, settings);
    }));

    return argsCreator.constructionStrategy.createArray({ settings, elements });
  }
}
