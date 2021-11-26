import type { Resource } from 'rdf-object';
import { ErrorResourcesContext } from '../../util/ErrorResourcesContext';
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
  ): Resource {
    // Elements must have RDF list values.
    if (!constructorArgs.property.elements.list) {
      throw new ErrorResourcesContext(`Illegal non-RDF-list elements`, {
        elements: constructorArgs.property.elements,
        constructorArgs,
        config: configRoot,
      });
    }

    // Recursively handle all values in the array
    const entries: Resource[] = [];
    for (const element of constructorArgs.property.elements.list) {
      if (element.type !== 'NamedNode' && !element.property.value && !element.property.valueRawReference) {
        throw new ErrorResourcesContext(`Illegal elements value, must be an IRI or resource with value/valueRawReference`, {
          elementValue: element,
          elements: constructorArgs.property.elements,
          constructorArgs,
          config: configRoot,
        });
      }
      const value = mapper.getParameterValue(
        configRoot,
        element,
        configElement,
        Boolean(element.property.valueRawReference),
      );
      if (value) {
        for (const entry of value.list || [ value ]) {
          entries.push(entry);
        }
      }
    }

    return mapper.objectLoader.createCompactedResource({ value: { list: entries }});
  }
}
