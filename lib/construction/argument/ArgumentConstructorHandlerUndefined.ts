import type { Resource } from 'rdf-object';
import type { IConstructionSettings } from '../IConstructionSettings';
import type { IArgumentConstructorHandler } from './IArgumentConstructorHandler';
import type { IArgumentsConstructor } from './IArgumentsConstructor';

/**
 * Handles undefined values.
 */
export class ArgumentConstructorHandlerUndefined implements IArgumentConstructorHandler {
  public canHandle<Instance, InstanceOut = Instance>(
    value: Resource,
    settings: IConstructionSettings,
    argsCreator: IArgumentsConstructor<Instance, InstanceOut>,
  ): boolean {
    return Boolean(value.property.undefined);
  }

  public async handle<Instance, InstanceOut = Instance>(
    value: Resource,
    settings: IConstructionSettings,
    argsCreator: IArgumentsConstructor<Instance, InstanceOut>,
  ): Promise<Instance> {
    return argsCreator.constructionStrategy.createUndefined();
  }
}
