import type { Resource } from 'rdf-object';
import { ErrorResourcesContext } from '../../util/ErrorResourcesContext';
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
      return this.handleKeyValue(configRoot, constructorArgs, configElement, mapper);
    }
    // Only value
    return this.handleValue(configRoot, constructorArgs, configElement, mapper);
  }

  public handleKeyValue(
    configRoot: Resource,
    constructorArgs: Resource,
    configElement: Resource,
    mapper: IConstructorArgumentsMapper,
  ): Resource {
    const value = mapper.getParameterValue(
      configRoot,
      constructorArgs.property.value || constructorArgs.property.valueRawReference,
      configElement,
      Boolean(constructorArgs.property.valueRawReference),
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
  ): Resource {
    const value = mapper.getParameterValue(
      configRoot,
      constructorArgs.property.value || constructorArgs.property.valueRawReference,
      configElement,
      Boolean(constructorArgs.property.valueRawReference),
    );
    if (!value) {
      return mapper.objectLoader.createCompactedResource({ undefined: true });
    }
    return value;
  }
}
