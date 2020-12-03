import type { Resource } from 'rdf-object';
import { resourceToString } from '../../Util';
import type { IConstructorArgumentsElementMappingHandler } from './IConstructorArgumentsElementMappingHandler';
import type { IConstructorArgumentsMapper } from './IConstructorArgumentsMapper';

/**
 * Handler for element definition that represents an array.
 */
export class ConstructorArgumentsElementMappingHandlerElements implements IConstructorArgumentsElementMappingHandler {
  public canHandle(
    configRoot: Resource,
    constructorArgs: Resource,
    configElement: Resource,
    mapper: IConstructorArgumentsMapper,
  ): boolean {
    return Boolean(constructorArgs.property.elements);
  }

  public handle(
    configRoot: Resource,
    constructorArgs: Resource,
    configElement: Resource,
    mapper: IConstructorArgumentsMapper,
  ): Resource[] {
    // Elements must have RDF list values.
    if (!constructorArgs.property.elements.list) {
      throw new Error(`Illegal non-RDF-list elements.
Elements: ${resourceToString(constructorArgs.property.elements)}
Constructor arguments: ${resourceToString(constructorArgs)}
Parsed config: ${resourceToString(configRoot)}`);
    }

    // Recursively handle all values in the array
    const ret = mapper.objectLoader.createCompactedResource({});
    for (const element of constructorArgs.property.elements.list) {
      if (element.type !== 'NamedNode' && !element.property.value && !element.property.valueRawReference) {
        throw new Error(`Illegal elements value, must be an IRI or resource with value/valueRawReference.
Elements value: ${resourceToString(element)}
Elements: ${resourceToString(constructorArgs.property.elements)}
Constructor arguments: ${resourceToString(constructorArgs)}
Parsed config: ${resourceToString(configRoot)}`);
      }
      for (const value of mapper.getParameterValue(
        configRoot,
        element,
        configElement,
        Boolean(element.property.valueRawReference),
      )) {
        ret.properties.value.push(value);
      }
    }

    return [ ret ];
  }
}
