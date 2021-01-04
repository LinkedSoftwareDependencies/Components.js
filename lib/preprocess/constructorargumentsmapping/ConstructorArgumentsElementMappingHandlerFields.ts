import type { Resource } from 'rdf-object';
import type { IConstructorArgumentsElementMappingHandler } from './IConstructorArgumentsElementMappingHandler';
import type { IConstructorArgumentsMapper } from './IConstructorArgumentsMapper';

/**
 * Handler for field definitions that contain key-value pairs to form a hash.
 */
export class ConstructorArgumentsElementMappingHandlerFields implements IConstructorArgumentsElementMappingHandler {
  public canHandle(
    configRoot: Resource,
    constructorArgs: Resource,
    configElement: Resource,
    mapper: IConstructorArgumentsMapper,
  ): boolean {
    return Boolean(constructorArgs.property.fields);
  }

  public handle(
    configRoot: Resource,
    constructorArgs: Resource,
    configElement: Resource,
    mapper: IConstructorArgumentsMapper,
  ): Resource[] {
    // Recursively handle all field values.
    const ret = mapper.objectLoader.createCompactedResource({});
    for (const field of constructorArgs.properties.fields) {
      for (const mappedResource of mapper.applyConstructorArgumentsParameters(configRoot, field, configElement)) {
        ret.properties.fields.push(mappedResource);
      }
    }
    ret.property.unique = mapper.objectLoader.createCompactedResource('"true"');
    // Hack to enforce ArgumentConstructorHandlerHash
    ret.property.hasFields = mapper.objectLoader.createCompactedResource('"true"');
    return [ ret ];
  }
}
