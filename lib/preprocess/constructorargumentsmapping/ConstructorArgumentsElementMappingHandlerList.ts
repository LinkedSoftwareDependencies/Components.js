import type { Resource } from 'rdf-object';
import type { IConstructorArgumentsElementMappingHandler } from './IConstructorArgumentsElementMappingHandler';
import type { IConstructorArgumentsMapper } from './IConstructorArgumentsMapper';

/**
 * Handler for an RDF list.
 */
export class ConstructorArgumentsElementMappingHandlerList implements IConstructorArgumentsElementMappingHandler {
  public canHandle(
    configRoot: Resource,
    constructorArgs: Resource,
    configElement: Resource,
    mapper: IConstructorArgumentsMapper,
  ): boolean {
    return Boolean(constructorArgs.list);
  }

  public handle(
    configRoot: Resource,
    constructorArgs: Resource,
    configElement: Resource,
    mapper: IConstructorArgumentsMapper,
  ): Resource[] {
    // Recursively handle all field values.
    const ret = mapper.objectLoader.createCompactedResource({});
    ret.list = [];
    for (const argument of (<Resource[]> constructorArgs.list)) {
      const mappeds = argument.property.fields || argument.property.elements ?
        mapper.applyConstructorArgumentsParameters(configRoot, argument, configElement) :
        mapper.getParameterValue(configRoot, argument, configElement, false);
      for (const mapped of mappeds) {
        ret.list.push(mapped);
      }
    }
    return [ ret ];
  }
}
