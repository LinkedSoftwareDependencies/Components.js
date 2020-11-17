import type { Resource } from 'rdf-object';
import type { RdfObjectLoader } from 'rdf-object/lib/RdfObjectLoader';
import Util = require('../Util');
import { resourceIdToString, resourceToString } from '../Util';
import type { IComponentFactoryOptionsNamed } from './ComponentFactoryOptions';
import { UnnamedComponentFactory } from './UnnamedComponentFactory';

/**
 * Factory for component definitions with semantic parameters and with constructor mappings.
 */
export class MappedNamedComponentFactory extends UnnamedComponentFactory {
  public constructor(options: IComponentFactoryOptionsNamed) {
    // TODO: check if constructorArguments param references are defined in parameters
    super({
      ...options,
      config: MappedNamedComponentFactory.makeUnnamedDefinitionConstructor(
        options.moduleDefinition,
        options.componentDefinition,
        options.objectLoader,
      )(options.config),
    });
  }

  /**
   * Map a value resource.
   * @param resourceScope The resource scope to map in.
   * @param valueIn The value resource to map.
   * @param params The parameters object.
   * @param rawValue If the IRI represents a raw string value instead of a parameter reference.
   * @param objectLoader The RDF object loader.
   */
  public static mapValue(
    resourceScope: Resource,
    valueIn: Resource,
    params: Resource,
    rawValue: boolean,
    objectLoader: RdfObjectLoader,
  ): Resource[] {
    let valueOut: Resource[];

    if (valueIn.type === 'NamedNode' && valueIn.value === `${Util.PREFIXES.rdf}subject`) {
      valueOut = [ objectLoader.createCompactedResource(`"${params.value}"`) ];
      valueOut[0].property.unique = objectLoader.createCompactedResource('"true"');
    } else if (valueIn.type === 'NamedNode') {
      valueOut = Util.applyParameterValues(resourceScope, valueIn, params, objectLoader);
    } else {
      valueOut = MappedNamedComponentFactory.mapObject(resourceScope, valueIn, params, objectLoader);
    }
    if (rawValue) {
      valueOut = [ objectLoader.createCompactedResource(`"${valueOut[0].value}"`) ];
      valueOut[0].property.unique = objectLoader.createCompactedResource('"true"');
    }
    return valueOut;
  }

  /**
   * Map an object resource.
   * Only the values of object-resources will be mapped to its parameter value.
   * For example, the resource { key: Resource.newString('param0'), value: new Resource('http://example.org/param0') }
   * with params { 'http://example.org/param0': Resource.newString('abc') }
   * will be mapped to { key: Resource.newString('param0'), value: Resource.newString('abc') }.
   * @param resourceScope The resource scope to map in.
   * @param objectMapping The resource to map.
   * @param params The parameters object.
   * @param objectLoader The RDF object loader.
   */
  public static mapObject(
    resourceScope: Resource,
    objectMapping: Resource,
    params: Resource,
    objectLoader: RdfObjectLoader,
  ): Resource[] {
    if (objectMapping.property.value || objectMapping.property.valueRawReference) {
      if (objectMapping.property.key &&
        objectMapping.property.key.type === 'Literal' &&
        !objectMapping.property.collectEntries) {
        const ret = objectLoader.createCompactedResource({});
        ret.property.key = objectMapping.property.key;
        for (const value of MappedNamedComponentFactory.mapValue(
          resourceScope,
          objectMapping.property.value || objectMapping.property.valueRawReference,
          params,
          Boolean(objectMapping.property.valueRawReference),
          objectLoader,
        )) {
          ret.properties.value.push(value);
        }
        return [ ret ];
      }
      if (!objectMapping.property.key && !objectMapping.property.collectEntries) {
        return MappedNamedComponentFactory.mapValue(
          resourceScope,
          objectMapping.property.value || objectMapping.property.valueRawReference,
          params,
          Boolean(objectMapping.property.valueRawReference),
          objectLoader,
        );
      }
      if (!objectMapping.property.collectEntries) {
        throw new Error(`If an object key is a URI, it must provide dynamic entries using the oo:collectEntries predicate: ${resourceToString(objectMapping)}`);
      }
      return objectMapping.properties.collectEntries.reduce((data: Resource[], entry: Resource) => {
        if (entry.type !== 'NamedNode') {
          throw new Error(`Dynamic entry identifiers must be URI's: ${resourceToString(entry)}`);
        }
        for (const value of Util.applyParameterValues(resourceScope, entry, params, objectLoader)) {
          data.push(value);
        }
        return data;
      }, [])
        .map((entryResource: Resource) => {
          let key: Resource | undefined;
          let value: Resource;
          if (objectMapping.property.key) {
            if (objectMapping.property.key.type === 'NamedNode' && objectMapping.property.key.value === `${Util.PREFIXES.rdf}subject`) {
              key = objectLoader.getOrMakeResource(Util.DF.literal(entryResource.value));
            } else if (entryResource.properties[objectMapping.property.key.value].length !== 1) {
              throw new Error(`Expected exactly one label definition for a dynamic entry ${resourceIdToString(objectMapping.property.key, objectLoader)} in ${resourceIdToString(entryResource, objectLoader)}\nFound:${resourceToString(entryResource)}`);
            } else {
              key = entryResource.properties[objectMapping.property.key.value][0];
            }
          }

          if (objectMapping.property.value.type === 'NamedNode' && objectMapping.property.value.value === `${Util.PREFIXES.rdf}subject`) {
            value = objectLoader.getOrMakeResource(Util.DF.literal(entryResource.value));
          } else if (objectMapping.property.value.type === 'NamedNode' && objectMapping.property.value.value === `${Util.PREFIXES.rdf}object`) {
            value = MappedNamedComponentFactory.mapObject(resourceScope, entryResource, params, objectLoader)[0];
          } else if (objectMapping.property.value && (objectMapping.property.value.property.fields ||
            objectMapping.property.value.property.elements)) {
            // Nested mapping should reduce the parameter scope
            value = this.mapValue(resourceScope, objectMapping.property.value, entryResource, false, objectLoader)[0];
          } else if (entryResource.properties[objectMapping.property.value.value].length !== 1) {
            throw new Error(`Expected exactly one value definition for a dynamic entry ${resourceIdToString(objectMapping.property.value, objectLoader)} in ${resourceIdToString(entryResource, objectLoader)}\nFound: ${resourceToString(entryResource)}`);
          } else {
            value = entryResource.properties[objectMapping.property.value.value][0];
          }
          if (key) {
            const ret = objectLoader.getOrMakeResource(Util.DF.blankNode());
            ret.property.key = key;
            value.property.unique = objectLoader.createCompactedResource('"true"');
            ret.property.value = value;
            return ret;
          }
          return value;
        });
    }
    if (objectMapping.property.fields) {
      const ret = objectLoader.createCompactedResource({});
      for (const field of objectMapping.properties.fields) {
        for (const mappedResource of MappedNamedComponentFactory
          .mapObject(resourceScope, field, params, objectLoader)) {
          ret.properties.fields.push(mappedResource);
        }
      }
      ret.property.unique = objectLoader.createCompactedResource('"true"');
      return [ ret ];
    }
    if (objectMapping.property.elements) {
      if (!objectMapping.property.elements.list) {
        throw new Error(`Parameter array elements musts be lists, but found: ${resourceToString(objectMapping.property.elements)}`);
      }
      const ret = objectLoader.createCompactedResource({});
      for (const element of objectMapping.property.elements.list) {
        if (element.type !== 'NamedNode' && !element.property.value && !element.property.valueRawReference) {
          throw new Error(`Parameter array elements must be URI's, but found: ${resourceToString(element)}`);
        }
        for (const value of MappedNamedComponentFactory.mapValue(
          resourceScope,
          element,
          params,
          Boolean(element.property.valueRawReference),
          objectLoader,
        )) {
          ret.properties.value.push(value);
        }
      }
      return [ ret ];
    }
    if (objectMapping.list) {
      const ret = objectLoader.createCompactedResource({});
      ret.list = [];
      for (const argument of objectMapping.list) {
        const mapped = argument.property.fields || argument.property.elements ?
          MappedNamedComponentFactory.mapObject(resourceScope, argument, params, objectLoader) :
          MappedNamedComponentFactory.mapValue(resourceScope, argument, params, false, objectLoader);
        if (mapped.length > 0) {
          ret.list.push(mapped[0]);
        }
      }
      return [ ret ];
    }
    return [ objectMapping ];
  }

  /**
   * Create an unnamed component definition resource constructor.
   * The component definition's parameters will first be mapped, and then delegated to the component constructor.
   * @param moduleDefinition The module definition with parameter definitions.
   * @param componentDefinition The component definition with parameter instances.
   * @param objectLoader The RDF object loader.
   * @returns {(params:Resource)=>Resource} A function that takes a parameter object for mapping parameter names
   *                                        to values like { 'http://example.org/param0': Resource.newString('abc') }
   *                                        and returns an unnamed component definition resource.
   */
  public static makeUnnamedDefinitionConstructor(
    moduleDefinition: Resource,
    componentDefinition: Resource,
    objectLoader: RdfObjectLoader,
  ): ((params: Resource) => Resource) {
    // TODO: validate param types
    return (params: Resource) => {
      const resource = objectLoader.createCompactedResource({});
      resource.property.originalInstance = params;
      resource.property.requireName = moduleDefinition.property.requireName || componentDefinition.property.requireName;
      resource.property.requireElement = componentDefinition.property.requireElement;
      if (componentDefinition.property.constructorArguments) {
        resource.properties.arguments = MappedNamedComponentFactory
          .mapObject(params, componentDefinition.property.constructorArguments, params, objectLoader);
      }
      return resource;
    };
  }
}
