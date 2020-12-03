import type { Resource } from 'rdf-object';
import * as Util from '../../Util';
import type { IInstantiationSettingsInner } from '../IInstantiationSettings';
import type { IArgumentCreationHandler } from './IArgumentCreationHandler';
import type { IArgumentsCreator } from './IArgumentsCreator';

/**
 * Handles arguments with elements as array.
 */
export class ArgumentCreationHandlerArray implements IArgumentCreationHandler {
  public canHandle<Instance>(
    value: Resource,
    settings: IInstantiationSettingsInner<Instance>,
    argsCreator: IArgumentsCreator,
  ): boolean {
    return Boolean(value.property.elements);
  }

  public async handle<Instance>(
    value: Resource,
    settings: IInstantiationSettingsInner<Instance>,
    argsCreator: IArgumentsCreator,
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
