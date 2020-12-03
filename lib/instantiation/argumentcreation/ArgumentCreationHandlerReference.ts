import type { Resource } from 'rdf-object';
import type { IInstantiationSettingsInner } from '../IInstantiationSettings';
import type { IArgumentCreationHandler } from './IArgumentCreationHandler';
import type { IArgumentsCreator } from './IArgumentsCreator';

/**
 * Handles IRI and blank node arguments as reference to another argument or instance.
 */
export class ArgumentCreationHandlerReference implements IArgumentCreationHandler {
  public canHandle<Instance>(
    value: Resource,
    settings: IInstantiationSettingsInner<Instance>,
    argsCreator: IArgumentsCreator,
  ): boolean {
    return Boolean(value.type === 'NamedNode' || value.type === 'BlankNode');
  }

  public async handle<Instance>(
    value: Resource,
    settings: IInstantiationSettingsInner<Instance>,
    argsCreator: IArgumentsCreator,
  ): Promise<Instance> {
    // Don't instantiate if we ask for shallow instantiation
    if (settings.shallow) {
      return settings.creationStrategy.createHash({ settings, entries: []});
    }

    // Apply lazy instantiation if needed
    if (value.property.lazy && value.property.lazy.value === 'true') {
      const supplier = (): Promise<Instance> => argsCreator.instancePool.instantiate(value, settings);
      return await settings.creationStrategy.createLazySupplier({ settings, supplier });
    }

    // Regular instantiation
    return await argsCreator.instancePool.instantiate(value, settings);
  }
}
