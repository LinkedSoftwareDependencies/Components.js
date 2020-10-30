import {UnnamedComponentFactory} from "./UnnamedComponentFactory";
import {Resource} from "rdf-object";
import {Loader} from "../Loader";
import NodeUtil = require('util');
import Util = require('../Util');
import { RdfObjectLoader } from 'rdf-object/lib/RdfObjectLoader';

/**
 * Factory for component definitions with semantic arguments and with constructor mappings.
 */
export class MappedNamedComponentFactory extends UnnamedComponentFactory {

    constructor(moduleDefinition: Resource, componentDefinition: Resource, config: Resource, constructable: boolean,
                overrideRequireNames: {[id: string]: string}, componentRunner: Loader) {
        // TODO: check if constructorArguments param references are defined in parameters
        super(MappedNamedComponentFactory.makeUnnamedDefinitionConstructor(moduleDefinition, componentDefinition, componentRunner.objectLoader)(config), constructable, overrideRequireNames, componentRunner);
    }

    static mapValue(resourceScope: Resource, v: Resource, params: Resource, rawValue: boolean, objectLoader: RdfObjectLoader): Resource[] {
        let value: Resource[];

        if (v.type === 'NamedNode' && v.value === Util.PREFIXES['rdf'] + 'subject') {
            value = [ objectLoader.createCompactedResource(`"${params.value}"`) ];
            value[0].property.unique = objectLoader.createCompactedResource('"true"');
        }
        else if (v.type === 'NamedNode') {
            value = Util.applyParameterValues(resourceScope, v, params, objectLoader);
        } else {
            value = MappedNamedComponentFactory.map(resourceScope, v, params, objectLoader);
        }
        if (rawValue) {
            value = [ objectLoader.createCompactedResource(`"${params.value}"`) ];
        }
        return value;
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
    static map(resourceScope: Resource, resource: Resource, params: Resource, objectLoader: RdfObjectLoader): Resource[] {
        if (resource.property.value) {
            if (resource.property.key && resource.property.key.type === 'Literal' && !resource.property.collectEntries) {
                const ret = objectLoader.createCompactedResource({});
                ret.property.key = resource.property.key;
                for (const value of MappedNamedComponentFactory.mapValue(resourceScope, resource.property.value, params, resource.property.value.type === 'Literal', objectLoader)) {
                    ret.properties.value.push(value);
                }
                return [ ret ];
            } else if (!resource.property.key && !resource.property.collectEntries) {
                return MappedNamedComponentFactory.mapValue(resourceScope, resource.property.value, params, resource.property.value.type === 'Literal', objectLoader);
            } else {
                if (!resource.property.collectEntries) {
                    throw new Error('If an object key is a URI, it must provide dynamic entries using the oo:collectEntries predicate: ' + resource);
                }
                return resource.properties.collectEntries.reduce((data: Resource[], entry: Resource) => {
                    if (entry.type !== 'NamedNode') {
                        throw new Error('Dynamic entry identifiers must be URI\'s: ' + entry);
                    }
                    Util.applyParameterValues(resourceScope, entry, params, objectLoader).forEach((value: Resource) => data.push(value));
                    return data;
                }, [])
                    .map((entryResource: Resource) => {
                        let k: Resource;
                        let v: Resource;
                        if (resource.property.key) {
                            if (resource.property.key.type === 'NamedNode' && resource.property.key.value === Util.PREFIXES['rdf'] + 'subject') {
                                k = objectLoader.getOrMakeResource(Util.DF.literal(entryResource.value));
                            }
                            else if (entryResource.properties[resource.property.key.value].length !== 1) {
                                throw new Error('Expected exactly one label definition for a dynamic entry '
                                    + resource.property.key.value + ' in ' + entryResource.value + '\nFound:' + entryResource.toString());
                            }
                            else {
                                k = entryResource.properties[resource.property.key.value][0];
                            }
                        }

                        if (resource.property.value.type === 'NamedNode' && resource.property.value.value === Util.PREFIXES['rdf'] + 'subject') {
                            v = objectLoader.getOrMakeResource(Util.DF.literal(entryResource.value));
                        }
                        else if (resource.property.value.type === 'NamedNode' && resource.property.value.value === Util.PREFIXES['rdf'] + 'object') {
                            v = MappedNamedComponentFactory.map(resourceScope, entryResource, params, objectLoader)[0];
                        }
                        else {
                            if (resource.property.value && (resource.property.value.property.fields || resource.property.value.property.elements)) {
                                // Nested mapping should reduce the parameter scope
                                v = this.mapValue(resourceScope, resource.property.value, entryResource, false, objectLoader)[0];
                            }
                            else if (entryResource.properties[resource.property.value.value].length !== 1) {
                                throw new Error('Expected exactly one value definition for a dynamic entry '
                                    + resource.property.value.value + ' in ' + entryResource.value + '\nFound: ' + entryResource.toString());
                            }
                            else {
                                v = entryResource.properties[resource.property.value.value][0];
                            }
                        }
                        if (resource.property.key) {
                            const ret = objectLoader.getOrMakeResource(Util.DF.blankNode());
                            ret.property.key = k;
                            v.property.unique = objectLoader.createCompactedResource('"true"');
                            ret.property.value = v;
                            return ret;
                        } else {
                            return v;
                        }
                    });
            }
        }
        else if (resource.property.fields) {
            const ret = objectLoader.createCompactedResource({});
            for (const field of resource.properties.fields) {
                for (const mappedResource of MappedNamedComponentFactory.map(resourceScope, field, params, objectLoader)) {
                    ret.properties.fields.push(mappedResource);
                }
            }
            ret.property.unique = objectLoader.createCompactedResource('"true"');
            return [ ret ];
        }
        else if (resource.property.elements) {
            if (!resource.property.elements.list) {
                throw new Error('Parameter array elements musts be lists, but found: ' + NodeUtil.inspect(resource.property.elements));
            }
            const ret = objectLoader.createCompactedResource({});
            for (const element of resource.property.elements.list) {
                if (element.type !== 'NamedNode' && !element.property.value) {
                    throw new Error('Parameter array elements must be URI\'s, but found: ' + NodeUtil.inspect(element));
                }
                for (const value of MappedNamedComponentFactory.mapValue(resourceScope, element, params, resource.property.value && resource.property.value.type === 'Literal', objectLoader)) {
                    ret.properties.value.push(value);
                }
            }
            return [ ret ];
        }
        else if (resource.list) {
            const ret = objectLoader.createCompactedResource({});
            for (const argument of resource.list) {
                ret.list = (argument.property.fields || argument.property.elements)
                  ? MappedNamedComponentFactory.map(resourceScope, argument, params, objectLoader)
                  : MappedNamedComponentFactory.mapValue(resourceScope, argument, params, false, objectLoader);
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
    static makeUnnamedDefinitionConstructor(moduleDefinition: Resource, componentDefinition: Resource, objectLoader: RdfObjectLoader): ((params: Resource) => Resource) {
        // TODO: validate param types
        return ((params: Resource) => {
            const resource = objectLoader.createCompactedResource({});
            resource.property.requireName = moduleDefinition.property.requireName || componentDefinition.property.requireName;
            resource.property.requireElement = componentDefinition.property.requireElement;
            resource.properties.arguments = componentDefinition.property.constructorArguments ? MappedNamedComponentFactory.map(params, componentDefinition.property.constructorArguments, params, objectLoader) : null;
            return resource;
        });
    }

}
