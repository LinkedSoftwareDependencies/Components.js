import type { Resource } from 'rdf-object';
import type { IConstructionSettings } from '../IConstructionSettings.js';
import type { IArgumentConstructorHandler } from './IArgumentConstructorHandler.js';
import type { IArgumentsConstructor } from './IArgumentsConstructor.js';

/**
 * Handles IRI and blank node arguments as reference to another argument or instance.
 */
export class ArgumentConstructorHandlerReference implements IArgumentConstructorHandler {
  public canHandle<Instance, InstanceOut = Instance>(
    value: Resource,
    settings: IConstructionSettings,
    argsCreator: IArgumentsConstructor<Instance, InstanceOut>,
  ): boolean {
    return Boolean(value.type === 'NamedNode' || value.type === 'BlankNode');
  }

  public async handle<Instance, InstanceOut = Instance>(
    value: Resource,
    settings: IConstructionSettings,
    argsCreator: IArgumentsConstructor<Instance, InstanceOut>,
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
