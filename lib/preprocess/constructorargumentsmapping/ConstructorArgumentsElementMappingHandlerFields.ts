import type { Resource } from 'rdf-object';
import { ErrorResourcesContext } from '../../util/ErrorResourcesContext';
import type { GenericsContext } from '../GenericsContext';
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
    genericsContext: GenericsContext,
  ): Resource {
    if (constructorArgs.properties.fields.length > 1) {
      throw new ErrorResourcesContext(`Invalid fields: Only one value can be defined, or an RDF list must be provided`, {
        constructorArgs,
        config: configRoot,
      });
    }
    const fields = constructorArgs.properties.fields[0];

    // Recursively handle all field values.
    const entries: Resource[] = [];
    for (const field of fields.list || [ fields ]) {
      const mapped = mapper
        .applyConstructorArgumentsParameters(configRoot, field, configElement, genericsContext);
      for (const entry of mapped.list || [ mapped ]) {
        entries.push(entry);
      }
    }
    return mapper.objectLoader.createCompactedResource({ fields: { list: entries }});
  }
}
