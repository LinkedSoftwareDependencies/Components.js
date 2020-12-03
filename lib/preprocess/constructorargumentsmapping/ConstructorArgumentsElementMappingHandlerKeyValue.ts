import type { Resource } from 'rdf-object';
import { resourceToString } from '../../Util';
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
  ): Resource[] {
    if (constructorArgs.property.key) {
      // Throw if our key is not a literal
      if (constructorArgs.property.key.type !== 'Literal') {
        throw new Error(`Detected illegal IRI object key '${constructorArgs.property.key.term.value}', which is only allowed with collectEntries.
Constructor arguments: ${resourceToString(constructorArgs)}
Parsed config: ${resourceToString(configRoot)}`);
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
  ): Resource[] {
    const ret = mapper.objectLoader.createCompactedResource({});
    ret.property.key = constructorArgs.property.key;
    for (const value of mapper.getParameterValue(
      configRoot,
      constructorArgs.property.value || constructorArgs.property.valueRawReference,
      configElement,
      Boolean(constructorArgs.property.valueRawReference),
    )) {
      ret.properties.value.push(value);
    }
    return [ ret ];
  }

  public handleValue(
    configRoot: Resource,
    constructorArgs: Resource,
    configElement: Resource,
    mapper: IConstructorArgumentsMapper,
  ): Resource[] {
    return mapper.getParameterValue(
      configRoot,
      constructorArgs.property.value || constructorArgs.property.valueRawReference,
      configElement,
      Boolean(constructorArgs.property.valueRawReference),
    );
  }
}
