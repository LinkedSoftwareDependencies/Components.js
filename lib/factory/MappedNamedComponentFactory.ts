import {UnnamedComponentFactory} from "./UnnamedComponentFactory";
import {Resource} from "../rdf/Resource";
import _ = require('lodash');

/**
 * Factory for component definitions with semantic arguments and with constructor mappings.
 */
export class MappedNamedComponentFactory extends UnnamedComponentFactory {

    constructor(moduleDefinition: Resource, componentDefinition: Resource, config: any, constructable: boolean,
                overrideRequireNames?: {[id: string]: string}) {
        // TODO: check if constructorMappings param references are defined in hasParameters
        // TODO: validate parameters
        super(MappedNamedComponentFactory.makeUnnamedDefinitionConstructor(moduleDefinition, componentDefinition)(config), constructable, overrideRequireNames);
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
            if (resource.k.termType === 'Literal' && !resource.dynamicEntriesFrom) {
                let value: any;
                if (resource.v.termType === 'NamedNode') {
                    value = params[resource.v.value];
                    if (resource.v.unique && resource.v.unique.value === 'true' && value instanceof Array) {
                        value = value[0];
                    }
                } else {
                    value = MappedNamedComponentFactory.map(resource.v, params);
                }
                return { k: resource.k, v: value };
            } else {
                if (!resource.dynamicEntriesFrom) {
                    throw new Error('If an object key is a URI, it must provide dynamic entries using the lsdc:dynamicEntriesFrom predicate: ' + resource);
                }
                return resource.dynamicEntriesFrom.reduce((data: Resource[], entry: Resource) => {
                    if (entry.termType !== 'NamedNode') {
                        throw new Error('Dynamic entry identifiers must be URI\'s: ' + entry);
                    }
                    let values: any = params[entry.value];
                    if (values) {
                        values.forEach((value: any) => data.push(value));
                    }
                    return data;
                }, [])
                    .map((entryResource: any) => {
                        if (entryResource[resource.k.value].length !== 1) {
                            throw new Error('Expected exactly one label definition for a dynamic entry: ' + resource.k); // TODO: this check also for regular entries?
                        }
                        if (entryResource[resource.v.value].length !== 1) {
                            throw new Error('Expected exactly one value for a dynamic entry: ' + resource.v);
                        }
                        return { k: entryResource[resource.k.value][0], v: entryResource[resource.v.value][0] };
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
        else if (resource.list) {
            return new Resource(null, {
                list: resource.list.map(
                    (argument: any) => argument.fields ? MappedNamedComponentFactory.map(argument, params) : argument
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