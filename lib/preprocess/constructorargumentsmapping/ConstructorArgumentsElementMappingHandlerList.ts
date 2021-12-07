import type { Resource } from 'rdf-object';
import type { GenericsContext } from '../GenericsContext';
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
    genericsContext: GenericsContext,
  ): Resource {
    // Recursively handle all field values.
    const ret = mapper.objectLoader.createCompactedResource({});
    ret.list = [];
    for (const argument of (<Resource[]> constructorArgs.list)) {
      if (argument.property.fields || argument.property.elements) {
        ret.list.push(mapper
          .applyConstructorArgumentsParameters(configRoot, argument, configElement, genericsContext));
      } else {
        const value = mapper
          .getParameterValue(configRoot, argument, configElement, false, genericsContext);
        if (value) {
          ret.list.push(value);
        } else {
          ret.list.push(mapper.objectLoader.createCompactedResource({ undefined: true }));
        }
      }
    }
    return ret;
  }
}
