import type { Resource } from 'rdf-object';
import type { IInstantiationSettingsInner } from '../IInstantiationSettings';
import type { IArgumentCreationHandler } from './IArgumentCreationHandler';
import type { IArgumentsCreator } from './IArgumentsCreator';

/**
 * Handles primitive argument values.
 */
export class ArgumentCreationHandlerPrimitive implements IArgumentCreationHandler {
  public canHandle<Instance>(
    value: Resource,
    settings: IInstantiationSettingsInner<Instance>,
    argsCreator: IArgumentsCreator,
  ): boolean {
    return Boolean(value.type === 'Literal');
  }

  public async handle<Instance>(
    value: Resource,
    settings: IInstantiationSettingsInner<Instance>,
    argsCreator: IArgumentsCreator,
  ): Promise<Instance> {
    // ValueRaw can be set in Util.captureType
    // TODO: improve this, so that the hacked valueRaw is not needed
    const rawValue: any = 'valueRaw' in value.term ? (<any> value.term).valueRaw : value.value;

    // Apply lazy instantiation if needed
    if (value.property.lazy && value.property.lazy.value === 'true') {
      const supplier = (): Promise<Instance> => Promise.resolve(settings.creationStrategy
        .createPrimitive({ settings, value: rawValue }));
      return await settings.creationStrategy.createLazySupplier({ settings, supplier });
    }

    return settings.creationStrategy.createPrimitive({ settings, value: rawValue });
  }
}
