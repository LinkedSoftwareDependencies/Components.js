import type { Resource } from 'rdf-object';
import type { IConstructionSettings } from '../IConstructionSettings';
import type { IArgumentConstructorHandler } from './IArgumentConstructorHandler';
import type { IArgumentsConstructor } from './IArgumentsConstructor';

/**
 * Handles arguments with RDF list values.
 */
export class ArgumentConstructorHandlerList implements IArgumentConstructorHandler {
  public canHandle<Instance, InstanceOut = Instance>(
    value: Resource,
    settings: IConstructionSettings,
    argsCreator: IArgumentsConstructor<Instance, InstanceOut>,
  ): boolean {
    return Boolean(value.list);
  }

  public async handle<Instance, InstanceOut = Instance>(
    argument: Resource,
    settings: IConstructionSettings,
    argsCreator: IArgumentsConstructor<Instance, InstanceOut>,
  ): Promise<Instance> {
    // Recursively handle all sub-args in the list
    const elements = await Promise.all(argument.list!
      .map((entry: Resource) => argsCreator.getArgumentValue(entry, settings)));

    return argsCreator.constructionStrategy.createArray({ settings, elements });
  }
}
