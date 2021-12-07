import type { Resource } from 'rdf-object';
import { IRIS_RDF } from '../../rdf/Iris';
import { ErrorResourcesContext } from '../../util/ErrorResourcesContext';
import type { GenericsContext } from '../GenericsContext';
import type { ParameterHandler } from '../ParameterHandler';
import type { IConstructorArgumentsElementMappingHandler } from './IConstructorArgumentsElementMappingHandler';
import type { IConstructorArgumentsMapper } from './IConstructorArgumentsMapper';

/**
 * Handler for dynamic key-value pairs via collectEntries.
 */
export class ConstructorArgumentsElementMappingHandlerCollectEntries
implements IConstructorArgumentsElementMappingHandler {
  private readonly parameterHandler: ParameterHandler;

  public constructor(parameterHandler: ParameterHandler) {
    this.parameterHandler = parameterHandler;
  }

  public canHandle(
    configRoot: Resource,
    constructorArgs: Resource,
    configElement: Resource,
    mapper: IConstructorArgumentsMapper,
  ): boolean {
    return Boolean((constructorArgs.property.value || constructorArgs.property.valueRawReference) &&
      constructorArgs.property.collectEntries);
  }

  public handle(
    configRoot: Resource,
    constructorArgs: Resource,
    configElement: Resource,
    mapper: IConstructorArgumentsMapper,
    genericsContext: GenericsContext,
  ): Resource {
    if (constructorArgs.properties.collectEntries.length > 1) {
      throw new ErrorResourcesContext(`Invalid collectEntries: Only one value can be defined, or an RDF list must be provided`, {
        constructorArgs,
        config: configRoot,
      });
    }
    const collectEntries = constructorArgs.properties.collectEntries[0];

    // Obtain all entry values
    const entryResources: Resource[] = [];
    for (const entry of collectEntries.list || [ collectEntries ]) {
      if (entry.type !== 'NamedNode') {
        throw new ErrorResourcesContext(`Detected illegal collectEntries value "${entry.type}", must be an IRI`, {
          constructorArgs,
          config: configRoot,
        });
      }
      const value = this.parameterHandler.applyParameterValues(configRoot, entry, configElement, genericsContext);
      if (value) {
        for (const subValue of value.list || [ value ]) {
          entryResources.push(subValue);
        }
      }
    }

    // Map all entries to values
    return mapper.objectLoader.createCompactedResource({
      list: entryResources.map((entryResource: Resource) => this
        .handleCollectEntry(entryResource, configRoot, constructorArgs, configElement, mapper, genericsContext)),
    });
  }

  public handleCollectEntry(
    entryResource: Resource,
    configRoot: Resource,
    constructorArgs: Resource,
    configElement: Resource,
    mapper: IConstructorArgumentsMapper,
    genericsContext: GenericsContext,
  ): Resource {
    // Determine the (optional) entry key
    let key: Resource | undefined;
    if (constructorArgs.property.key) {
      // At most one key definition is allowed
      if (constructorArgs.properties.key.length > 1) {
        throw new ErrorResourcesContext(`Detected more than one key definition in collectEntries`, {
          constructorArgs,
          collectEntry: entryResource,
          config: configRoot,
        });
      }

      if (constructorArgs.property.key.type === 'NamedNode' &&
        constructorArgs.property.key.value === IRIS_RDF.subject) {
        // Key is the entry id as string
        key = mapper.objectLoader.createCompactedResource(`"${entryResource.value}"`);
      } else if (entryResource.properties[constructorArgs.property.key.value].length !== 1) {
        // Error if we find more than one entry key value
        throw new ErrorResourcesContext(`Detected more than one key value in collectEntries`, {
          key: constructorArgs.property.key.value,
          keyValues: entryResource.properties[constructorArgs.property.key.value].map(res => res.term.value).join(', '),
          collectEntry: entryResource,
          constructorArgs,
          config: configRoot,
        });
      } else {
        // Key is the first entry key value
        key = entryResource.properties[constructorArgs.property.key.value][0];
      }
    }

    // At most one value definition is allowed
    if (constructorArgs.properties.value.length > 1) {
      throw new ErrorResourcesContext(`Detected more than one value definition in collectEntries`, {
        constructorArgs,
        collectEntry: entryResource,
        config: configRoot,
      });
    }

    // Determine the entry value
    let value: Resource;
    if (constructorArgs.property.value.type === 'NamedNode' &&
      constructorArgs.property.value.value === IRIS_RDF.subject) {
      // Value is the entry id as string
      value = mapper.objectLoader.createCompactedResource(`"${entryResource.value}"`);
    } else if (constructorArgs.property.value.type === 'NamedNode' &&
      constructorArgs.property.value.value === IRIS_RDF.object) {
      // Value is the entry value
      value = mapper
        .applyConstructorArgumentsParameters(configRoot, entryResource, configElement, genericsContext);
    } else if (constructorArgs.property.value &&
      (constructorArgs.property.value.property.fields || constructorArgs.property.value.property.elements)) {
      // Nested mapping should reduce the parameter scope
      // ! at the end of the line, because will always be truthy
      value = mapper
        .getParameterValue(configRoot, constructorArgs.property.value, entryResource, false, genericsContext)!;
    } else if (entryResource.properties[constructorArgs.property.value.value].length !== 1) {
      throw new ErrorResourcesContext(`Detected more than one value value in collectEntries`, {
        value: constructorArgs.property.value,
        valueValues: entryResource.properties[constructorArgs.property.value.value]
          .map(res => res.term.value).join(', '),
        collectEntry: entryResource,
        constructorArgs,
        config: configRoot,
      });
    } else {
      value = entryResource.properties[constructorArgs.property.value.value][0];
    }

    // If we have a key, create a key-value mapping
    if (key) {
      const ret = mapper.objectLoader.createCompactedResource({});
      ret.property.key = key;
      ret.property.value = value;
      return ret;
    }

    // Otherwise, return the value directly
    return value;
  }
}
