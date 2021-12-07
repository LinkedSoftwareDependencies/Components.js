import type { Resource } from 'rdf-object';
import { ErrorResourcesContext } from '../../util/ErrorResourcesContext';
import type { GenericsContext } from '../GenericsContext';
import type { IConstructorArgumentsElementMappingHandler } from './IConstructorArgumentsElementMappingHandler';
import type { IConstructorArgumentsMapper } from './IConstructorArgumentsMapper';

/**
 * Handler for static key-value entries.
 */
export class ConstructorArgumentsElementMappingHandlerKeyValue implements IConstructorArgumentsElementMappingHandler {
  public canHandle(
    configRoot: Resource,
    constructorArgs: Resource,
    configElement: Resource,
    mapper: IConstructorArgumentsMapper,
  ): boolean {
    return Boolean((constructorArgs.property.value || constructorArgs.property.valueRawReference) &&
      !constructorArgs.property.collectEntries);
  }

  public handle(
    configRoot: Resource,
    constructorArgs: Resource,
    configElement: Resource,
    mapper: IConstructorArgumentsMapper,
    genericsContext: GenericsContext,
  ): Resource {
    if (constructorArgs.property.key) {
      // Throw if our key is not a literal
      if (constructorArgs.property.key.type !== 'Literal') {
        throw new ErrorResourcesContext(`Detected illegal IRI object key, which is only allowed with collectEntries`, {
          objectKey: constructorArgs.property.key.term.value,
          constructorArgs,
          config: configRoot,
        });
      }

      // Key-value
      return this.handleKeyValue(configRoot, constructorArgs, configElement, mapper, genericsContext);
    }
    // Only value
    return this.handleValue(configRoot, constructorArgs, configElement, mapper, genericsContext);
  }

  public handleKeyValue(
    configRoot: Resource,
    constructorArgs: Resource,
    configElement: Resource,
    mapper: IConstructorArgumentsMapper,
    genericsContext: GenericsContext,
  ): Resource {
    const value = mapper.getParameterValue(
      configRoot,
      constructorArgs.property.value || constructorArgs.property.valueRawReference,
      configElement,
      Boolean(constructorArgs.property.valueRawReference),
      genericsContext,
    );
    return mapper.objectLoader.createCompactedResource({
      key: constructorArgs.property.key,
      ...value ? { value } : {},
    });
  }

  public handleValue(
    configRoot: Resource,
    constructorArgs: Resource,
    configElement: Resource,
    mapper: IConstructorArgumentsMapper,
    genericsContext: GenericsContext,
  ): Resource {
    const value = mapper.getParameterValue(
      configRoot,
      constructorArgs.property.value || constructorArgs.property.valueRawReference,
      configElement,
      Boolean(constructorArgs.property.valueRawReference),
      genericsContext,
    );
    if (!value) {
      return mapper.objectLoader.createCompactedResource({ undefined: true });
    }
    return value;
  }
}
