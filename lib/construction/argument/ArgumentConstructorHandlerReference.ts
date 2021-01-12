import type { Resource } from 'rdf-object';
import type { IConstructionSettings } from '../IConstructionSettings';
import type { IArgumentConstructorHandler } from './IArgumentConstructorHandler';
import type { IArgumentsConstructor } from './IArgumentsConstructor';

/**
 * Handles IRI and blank node arguments as reference to another argument or instance.
 */
export class ArgumentConstructorHandlerReference implements IArgumentConstructorHandler {
  public canHandle<Instance>(
    value: Resource,
    settings: IConstructionSettings,
    argsCreator: IArgumentsConstructor<Instance>,
  ): boolean {
    return Boolean(value.type === 'NamedNode' || value.type === 'BlankNode');
  }

  public async handle<Instance>(
    value: Resource,
    settings: IConstructionSettings,
    argsCreator: IArgumentsConstructor<Instance>,
  ): Promise<Instance> {
    // Don't instantiate if we ask for shallow construction
    if (settings.shallow) {
      return argsCreator.constructionStrategy.createHash({ settings, entries: []});
    }

    // Apply lazy construction if needed
    if (value.property.lazy && value.property.lazy.value === 'true') {
      const supplier = (): Promise<Instance> => argsCreator.configConstructorPool.instantiate(value, settings);
      return await argsCreator.constructionStrategy.createLazySupplier({ settings, supplier });
    }

    // Regular construction
    return await argsCreator.configConstructorPool.instantiate(value, settings);
  }
}
