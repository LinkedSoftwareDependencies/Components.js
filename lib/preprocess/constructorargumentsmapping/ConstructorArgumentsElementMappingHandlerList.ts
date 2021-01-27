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
      if (argument.property.fields || argument.property.elements) {
        for (const mapped of mapper.applyConstructorArgumentsParameters(configRoot, argument, configElement)) {
          ret.list.push(mapped);
        }
      } else {
        const mappeds = mapper.getParameterValue(configRoot, argument, configElement, false);
        if (mappeds.length > 0) {
          if (mappeds[0].property.unique?.value === 'true') {
            // Only add a single value if param was unique
            ret.list.push(mappeds[0]);
          } else {
            // Add all values as an array if param was not unique
            ret.list.push(mapper.objectLoader.createCompactedResource({
              elements: mappeds.map(value => mapper.objectLoader.createCompactedResource({ value })),
            }));
          }
        } else {
          // Explicitly pass a single undefined value if no param value was set
          ret.list.push(mapper.objectLoader.createCompactedResource({
            undefined: true,
          }));
        }
      }
    }
    return [ ret ];
  }
}
