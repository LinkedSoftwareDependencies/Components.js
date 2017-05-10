import {UnnamedComponentFactory} from "./UnnamedComponentFactory";
import {Resource} from "../rdf/Resource";
import _ = require('lodash');
import {Loader} from "../Loader";
import Util = require("../Util");

/**
 * Factory for component definitions with semantic arguments and with constructor mappings.
 */
export class MappedNamedComponentFactory extends UnnamedComponentFactory {

    constructor(moduleDefinition: Resource, componentDefinition: Resource, config: any, constructable: boolean,
                overrideRequireNames?: {[id: string]: string}, componentRunner?: Loader) {
        // TODO: check if constructorMappings param references are defined in hasParameters
        // TODO: validate parameters
        super(MappedNamedComponentFactory.makeUnnamedDefinitionConstructor(moduleDefinition, componentDefinition)(config), constructable, overrideRequireNames, componentRunner);
    }

    static mapValue(v: any, params: any): any {
        let value: any;
        if (v.termType === 'NamedNode' && v.value === Util.PREFIXES['rdf'] + 'subject') {
            value = Resource.newString(params.value);
        }
        else if (v.termType === 'NamedNode') {
            value = Util.applyParameterValues(v, params);
        } else {
            value = MappedNamedComponentFactory.map(v, params);
        }
        return value;
    }

    /**
     * Map a resource object.
     * Only the values of object-resources will be mapped to its parameter value.
     * For example, the resource { k: Resource.newString('param0'), v: new Resource('http://example.org/param0') }
     * with params { 'http://example.org/param0': Resource.newString('abc') }
     * will be mapped to { k: Resource.newString('param0'), v: Resource.newString('abc') }.
     * @param resource The resource to map.
     * @param params The parameters object.
     * @returns {any} The mapped resource.
     */
    static map(resource: any, params: any): any {
        if (resource.k && resource.v) {
            if (resource.k.termType === 'Literal' && !resource.collectEntriesFrom) {
                return { k: resource.k, v: MappedNamedComponentFactory.mapValue(resource.v, params) };
            } else {
                if (!resource.collectEntriesFrom) {
                    throw new Error('If an object key is a URI, it must provide dynamic entries using the lsdc:collectEntriesFrom predicate: ' + resource);
                }
                return resource.collectEntriesFrom.reduce((data: Resource[], entry: Resource) => {
                    if (entry.termType !== 'NamedNode') {
                        throw new Error('Dynamic entry identifiers must be URI\'s: ' + entry);
                    }
                    let values: any = Util.applyParameterValues(entry, params);
                    if (values) {
                        values.forEach((value: any) => data.push(value));
                    }
                    return data;
                }, [])
                    .map((entryResource: any) => {
                        let k: any;
                        let v: any;
                        if (resource.k.termType === 'NamedNode' && resource.k.value === Util.PREFIXES['rdf'] + 'subject') {
                            k = Resource.newString(entryResource.value);
                        }
                        else if (!entryResource[resource.k.value] || entryResource[resource.k.value].length !== 1) {
                            throw new Error('Expected exactly one label definition for a dynamic entry ' + resource.k.value + ' in: ' + JSON.stringify(entryResource));
                        }
                        else {
                            k = entryResource[resource.k.value][0];
                        }

                        if (resource.v.termType === 'NamedNode' && resource.v.value === Util.PREFIXES['rdf'] + 'subject') {
                            v = Resource.newString(entryResource.value);
                        }
                        else if (resource.v.termType === 'NamedNode' && resource.v.value === Util.PREFIXES['rdf'] + 'object') {
                            v = MappedNamedComponentFactory.map(entryResource, params);
                        }
                        else if (!entryResource[resource.v.value] || entryResource[resource.v.value].length !== 1) {
                            throw new Error('Expected exactly one value definition for a dynamic entry ' + resource.v.value + ' in: ' + JSON.stringify(entryResource));
                        }
                        else {
                            v = entryResource[resource.v.value][0];
                        }
                        return { k: k, v: v };
                    });
            }
        }
        else if (resource.fields) {
            return new Resource(null, {
                fields: resource.fields.reduce((fields: any[], field: any) => {
                    let mapped: any = MappedNamedComponentFactory.map(field, params);
                    if (mapped instanceof Array) {
                        fields = fields.concat(mapped);
                    } else {
                        fields.push(mapped);
                    }
                    return fields;
                }, [])
            });
        }
        else if (resource.elements) {
            return new Resource(null, {
                elements: resource.elements.reduce((elements: any[], element: any) => {
                    if (!element.v) {
                        throw new Error('Parameter array elements must have values, but found: ' + JSON.stringify(element, null, '  '));
                    }
                    let mapped: any = { v: MappedNamedComponentFactory.mapValue(element.v, params) };
                    elements.push(mapped);
                    return elements;
                }, [])
            });
        }
        else if (resource.list) {
            return new Resource(null, {
                list: resource.list.map(
                    (argument: any) => (argument.fields || argument.elements) ? MappedNamedComponentFactory.map(argument, params) : argument
                )
            });
        }
        return resource;
    }

    /**
     * Create an unnamed component definition resource constructor.
     * The component definition's parameters will first be mapped, and then delegated to the component constructor.
     * @param moduleDefinition The module definition with parameter definitions.
     * @param componentDefinition The component definition with parameter instances.
     * @returns {(params:any)=>Resource} A function that takes a parameter object for mapping parameter names to values
     *                                   like { 'http://example.org/param0': Resource.newString('abc') }
     *                                   and returns an unnamed component definition resource.
     */
    static makeUnnamedDefinitionConstructor(moduleDefinition: any, componentDefinition: any): ((params: any) => Resource) {
        // TODO: validate param types
        return ((params: any) => {
            return new Resource(componentDefinition.value, {
                requireName: moduleDefinition.requireName || componentDefinition.requireName,
                requireElement: componentDefinition.requireElement,
                arguments: componentDefinition.constructorMapping ? MappedNamedComponentFactory.map(_.cloneDeep(componentDefinition.constructorMapping), params) : null
            })
        });
    }

}