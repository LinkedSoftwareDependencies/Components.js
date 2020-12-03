import type { Resource } from 'rdf-object';
import { resourceIdToString, resourceToString } from '../../Util';
import * as Util from '../../Util';
import type { IConstructorArgumentsElementMappingHandler } from './IConstructorArgumentsElementMappingHandler';
import type { IConstructorArgumentsMapper } from './IConstructorArgumentsMapper';

/**
 * Handler for dynamic key-value pairs via collectEntries.
 */
export class ConstructorArgumentsElementMappingHandlerCollectEntries
implements IConstructorArgumentsElementMappingHandler {
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
  ): Resource[] {
    // Obtain all entry values
    const entryResources = [];
    for (const entry of constructorArgs.properties.collectEntries) {
      if (entry.type !== 'NamedNode') {
        throw new Error(`Detected illegal collectEntries value (${entry.type}), must be an IRI.
Constructor arguments: ${resourceToString(constructorArgs)}
Parsed config: ${resourceToString(configRoot)}`);
      }
      for (const value of Util.applyParameterValues(configRoot, entry, configElement, mapper.objectLoader)) {
        entryResources.push(value);
      }
    }

    // Map all entries to values
    return entryResources.map((entryResource: Resource) => this
      .handleCollectEntry(entryResource, configRoot, constructorArgs, configElement, mapper));
  }

  public handleCollectEntry(
    entryResource: Resource,
    configRoot: Resource,
    constructorArgs: Resource,
    configElement: Resource,
    mapper: IConstructorArgumentsMapper,
  ): Resource {
    // Determine the (optional) entry key
    let key: Resource | undefined;
    if (constructorArgs.property.key) {
      if (constructorArgs.property.key.type === 'NamedNode' &&
        constructorArgs.property.key.value === `${Util.PREFIXES.rdf}subject`) {
        // Key is the entry id as string
        key = mapper.objectLoader.getOrMakeResource(Util.DF.literal(entryResource.value));
      } else if (entryResource.properties[constructorArgs.property.key.value].length !== 1) {
        // Error if we find more than one entry key value
        throw new Error(`Detected more than one key value in collectEntries.
Key: ${resourceIdToString(constructorArgs.property.key, mapper.objectLoader)}
Key values: ${entryResource.properties[constructorArgs.property.key.value].map(res => res.term.value)} 
Collect entry: ${resourceToString(entryResource)}
Constructor arguments: ${resourceToString(constructorArgs)}
Parsed config: ${resourceToString(configRoot)}`);
      } else {
        // Key is the first entry key value
        key = entryResource.properties[constructorArgs.property.key.value][0];
      }
    }

    // Determin the entry value
    let value: Resource;
    if (constructorArgs.property.value.type === 'NamedNode' &&
      constructorArgs.property.value.value === `${Util.PREFIXES.rdf}subject`) {
      // Value is the entry id as string
      value = mapper.objectLoader.getOrMakeResource(Util.DF.literal(entryResource.value));
    } else if (constructorArgs.property.value.type === 'NamedNode' &&
      constructorArgs.property.value.value === `${Util.PREFIXES.rdf}object`) {
      // Value is the entry value
      value = mapper.applyConstructorArgumentsParameters(configRoot, entryResource, configElement)[0];
    } else if (constructorArgs.property.value &&
      (constructorArgs.property.value.property.fields || constructorArgs.property.value.property.elements)) {
      // Nested mapping should reduce the parameter scope
      // TODO: in the case of elements, perhaps we don't always just want the first
      value = mapper.getParameterValue(configRoot, constructorArgs.property.value, entryResource, false)[0];
    } else if (entryResource.properties[constructorArgs.property.value.value].length !== 1) {
      throw new Error(`Detected more than one value value in collectEntries.
Value: ${resourceIdToString(constructorArgs.property.value, mapper.objectLoader)}
Value values: ${entryResource.properties[constructorArgs.property.value.value].map(res => res.term.value)} 
Collect entry: ${resourceToString(entryResource)}
Constructor arguments: ${resourceToString(constructorArgs)}
Parsed config: ${resourceToString(configRoot)}`);
    } else {
      value = entryResource.properties[constructorArgs.property.value.value][0];
    }

    // If we have a key, create a key-value mapping
    if (key) {
      const ret = mapper.objectLoader.getOrMakeResource(Util.DF.blankNode());
      ret.property.key = key;
      value.property.unique = mapper.objectLoader.createCompactedResource('"true"');
      ret.property.value = value;
      return ret;
    }

    // Otherwise, return the value directly
    return value;
  }
}
