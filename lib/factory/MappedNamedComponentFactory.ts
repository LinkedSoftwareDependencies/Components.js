import {UnnamedComponentFactory} from "./UnnamedComponentFactory";
import {Resource} from "../rdf/Resource";
import _ = require('lodash');

/**
 * Factory for component definitions with semantic arguments and with constructor mappings.
 */
export class MappedNamedComponentFactory extends UnnamedComponentFactory {

    constructor(moduleDefinition: Resource, componentDefinition: Resource, config: any, constructable: boolean) {
        // TODO: check if constructorMappings param references are defined in hasParameters
        // TODO: validate parameters
        super(MappedNamedComponentFactory.makeUnnamedDefinitionConstructor(moduleDefinition, componentDefinition)(config), constructable);
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
            return { k: resource.k, v: params[resource.v.value] };
        }
        else if (resource.fields) {
            return new Resource(null, {
                fields: resource.fields.map(
                    (field: any) => MappedNamedComponentFactory.map(field, params)
                )
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