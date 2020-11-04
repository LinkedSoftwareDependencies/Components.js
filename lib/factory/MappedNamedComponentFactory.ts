import NodeUtil = require('util');
import type { Resource } from 'rdf-object';
import type { RdfObjectLoader } from 'rdf-object/lib/RdfObjectLoader';
import type { Loader } from '../Loader';
import Util = require('../Util');
import { UnnamedComponentFactory } from './UnnamedComponentFactory';

/**
 * Factory for component definitions with semantic arguments and with constructor mappings.
 */
export class MappedNamedComponentFactory extends UnnamedComponentFactory {
  public constructor(
    moduleDefinition: Resource,
    componentDefinition: Resource,
    config: Resource,
    constructable: boolean,
    overrideRequireNames: Record<string, string>,
    componentRunner: Loader,
  ) {
    // TODO: check if constructorArguments param references are defined in parameters
    super(MappedNamedComponentFactory.makeUnnamedDefinitionConstructor(
      moduleDefinition,
      componentDefinition,
      componentRunner.objectLoader,
    )(config), constructable, overrideRequireNames, componentRunner);
  }

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
      valueOut = MappedNamedComponentFactory.map(resourceScope, valueIn, params, objectLoader);
    }
    if (rawValue) {
      valueOut = [ objectLoader.createCompactedResource(`"${params.value}"`) ];
    }
    return valueOut;
  }

  /**
     * Map a resource object.
     * Only the values of object-resources will be mapped to its parameter value.
     * For example, the resource { k: Resource.newString('param0'), v: new Resource('http://example.org/param0') }
     * with params { 'http://example.org/param0': Resource.newString('abc') }
     * will be mapped to { k: Resource.newString('param0'), v: Resource.newString('abc') }.
     * @param resourceScope The resource scope to map in.
     * @param resource The resource to map.
     * @param params The parameters object.
     * @param objectLoader The RDF object loader.
     * @returns {any} The mapped resource.
     */
  public static map(
    resourceScope: Resource,
    resource: Resource,
    params: Resource,
    objectLoader: RdfObjectLoader,
  ): Resource[] {
    if (resource.property.value) {
      if (resource.property.key && resource.property.key.type === 'Literal' && !resource.property.collectEntries) {
        const ret = objectLoader.createCompactedResource({});
        ret.property.key = resource.property.key;
        for (const value of MappedNamedComponentFactory.mapValue(
          resourceScope,
          resource.property.value,
          params,
          resource.property.value.type === 'Literal',
          objectLoader,
        )) {
          ret.properties.value.push(value);
        }
        return [ ret ];
      }
      if (!resource.property.key && !resource.property.collectEntries) {
        return MappedNamedComponentFactory.mapValue(
          resourceScope,
          resource.property.value,
          params,
          resource.property.value.type === 'Literal',
          objectLoader,
        );
      }
      if (!resource.property.collectEntries) {
        throw new Error(`If an object key is a URI, it must provide dynamic entries using the oo:collectEntries predicate: ${resource}`);
      }
      return resource.properties.collectEntries.reduce((data: Resource[], entry: Resource) => {
        if (entry.type !== 'NamedNode') {
          throw new Error(`Dynamic entry identifiers must be URI's: ${entry}`);
        }
        Util.applyParameterValues(resourceScope, entry, params, objectLoader)
          .forEach((value: Resource) => data.push(value));
        return data;
      }, [])
        .map((entryResource: Resource) => {
          let key: Resource | undefined;
          let value: Resource;
          if (resource.property.key) {
            if (resource.property.key.type === 'NamedNode' && resource.property.key.value === `${Util.PREFIXES.rdf}subject`) {
              key = objectLoader.getOrMakeResource(Util.DF.literal(entryResource.value));
            } else if (entryResource.properties[resource.property.key.value].length !== 1) {
              throw new Error(`Expected exactly one label definition for a dynamic entry ${
                resource.property.key.value} in ${entryResource.value}\nFound:${entryResource.toString()}`);
            } else {
              key = entryResource.properties[resource.property.key.value][0];
            }
          }

          if (resource.property.value.type === 'NamedNode' && resource.property.value.value === `${Util.PREFIXES.rdf}subject`) {
            value = objectLoader.getOrMakeResource(Util.DF.literal(entryResource.value));
          } else if (resource.property.value.type === 'NamedNode' && resource.property.value.value === `${Util.PREFIXES.rdf}object`) {
            value = MappedNamedComponentFactory.map(resourceScope, entryResource, params, objectLoader)[0];
          } else if (resource.property.value && (resource.property.value.property.fields ||
            resource.property.value.property.elements)) {
            // Nested mapping should reduce the parameter scope
            value = this.mapValue(resourceScope, resource.property.value, entryResource, false, objectLoader)[0];
          } else if (entryResource.properties[resource.property.value.value].length !== 1) {
            throw new Error(`Expected exactly one value definition for a dynamic entry ${
              resource.property.value.value} in ${entryResource.value}\nFound: ${entryResource.toString()}`);
          } else {
            value = entryResource.properties[resource.property.value.value][0];
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
    if (resource.property.fields) {
      const ret = objectLoader.createCompactedResource({});
      for (const field of resource.properties.fields) {
        for (const mappedResource of MappedNamedComponentFactory.map(resourceScope, field, params, objectLoader)) {
          ret.properties.fields.push(mappedResource);
        }
      }
      ret.property.unique = objectLoader.createCompactedResource('"true"');
      return [ ret ];
    }
    if (resource.property.elements) {
      if (!resource.property.elements.list) {
        throw new Error(`Parameter array elements musts be lists, but found: ${NodeUtil.inspect(resource.property.elements)}`);
      }
      const ret = objectLoader.createCompactedResource({});
      for (const element of resource.property.elements.list) {
        if (element.type !== 'NamedNode' && !element.property.value) {
          throw new Error(`Parameter array elements must be URI's, but found: ${NodeUtil.inspect(element)}`);
        }
        for (const value of MappedNamedComponentFactory.mapValue(resourceScope, element, params, false, objectLoader)) {
          ret.properties.value.push(value);
        }
      }
      return [ ret ];
    }
    if (resource.list) {
      const ret = objectLoader.createCompactedResource({});
      for (const argument of resource.list) {
        ret.list = argument.property.fields || argument.property.elements ?
          MappedNamedComponentFactory.map(resourceScope, argument, params, objectLoader) :
          MappedNamedComponentFactory.mapValue(resourceScope, argument, params, false, objectLoader);
      }
      return [ ret ];
    }
    return [ resource ];
  }

  /**
     * Create an unnamed component definition resource constructor.
     * The component definition's parameters will first be mapped, and then delegated to the component constructor.
     * @param moduleDefinition The module definition with parameter definitions.
     * @param componentDefinition The component definition with parameter instances.
     * @param objectLoader The RDF object loader.
     * @returns {(params:any)=>Resource} A function that takes a parameter object for mapping parameter names to values
     *                                   like { 'http://example.org/param0': Resource.newString('abc') }
     *                                   and returns an unnamed component definition resource.
     */
  public static makeUnnamedDefinitionConstructor(
    moduleDefinition: Resource,
    componentDefinition: Resource,
    objectLoader: RdfObjectLoader,
  ): ((params: Resource) => Resource) {
    // TODO: validate param types
    return (params: Resource) => {
      const resource = objectLoader.createCompactedResource({});
      resource.property.requireName = moduleDefinition.property.requireName || componentDefinition.property.requireName;
      resource.property.requireElement = componentDefinition.property.requireElement;
      if (componentDefinition.property.constructorArguments) {
        resource.properties.arguments = MappedNamedComponentFactory
          .map(params, componentDefinition.property.constructorArguments, params, objectLoader);
      }
      return resource;
    };
  }
}
