import type { Resource } from 'rdf-object';
import * as Util from '../../Util';
import type { IConstructionSettingsInner } from '../IConstructionSettings';
import type { IArgumentConstructorHandler } from './IArgumentConstructorHandler';
import type { IArgumentsConstructor } from './IArgumentsConstructor';

/**
 * Handles arguments with elements as array.
 */
export class ArgumentConstructorHandlerArray implements IArgumentConstructorHandler {
  public canHandle<Instance>(
    value: Resource,
    settings: IConstructionSettingsInner<Instance>,
    argsCreator: IArgumentsConstructor,
  ): boolean {
    return Boolean(value.property.elements);
  }

  public async handle<Instance>(
    value: Resource,
    settings: IConstructionSettingsInner<Instance>,
    argsCreator: IArgumentsConstructor,
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

    return settings.creationStrategy.createArray({ settings, elements });
  }
}
