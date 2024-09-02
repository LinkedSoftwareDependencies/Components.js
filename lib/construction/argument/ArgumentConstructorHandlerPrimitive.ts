import type { Resource } from 'rdf-object';
import type { IConstructionSettings } from '../IConstructionSettings.js';
import type { IArgumentConstructorHandler } from './IArgumentConstructorHandler.js';
import type { IArgumentsConstructor } from './IArgumentsConstructor.js';

/**
 * Handles primitive argument values.
 */
export class ArgumentConstructorHandlerPrimitive implements IArgumentConstructorHandler {
  public canHandle<Instance, InstanceOut = Instance>(
    value: Resource,
    settings: IConstructionSettings,
    argsCreator: IArgumentsConstructor<Instance, InstanceOut>,
  ): boolean {
    return Boolean(value.type === 'Literal');
  }

  public async handle<Instance, InstanceOut = Instance>(
    value: Resource,
    settings: IConstructionSettings,
    argsCreator: IArgumentsConstructor<Instance, InstanceOut>,
  ): Promise<Instance> {
    // ValueRaw can be set in Util.captureType
    // TODO: improve this, so that the hacked valueRaw is not needed
    const rawValue: any = 'valueRaw' in value.term ? (<any> value.term).valueRaw : value.value;

    // Apply lazy construction if needed
    if (value.property.lazy && value.property.lazy.value === 'true') {
      const supplier = (): Promise<Instance> => Promise.resolve(argsCreator.constructionStrategy
        .createPrimitive({ settings, value: rawValue }));
      return await argsCreator.constructionStrategy.createLazySupplier({ settings, supplier });
    }

    return argsCreator.constructionStrategy.createPrimitive({ settings, value: rawValue });
  }
}
