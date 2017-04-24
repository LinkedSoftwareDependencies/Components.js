import {UnnamedComponentFactory} from "./UnnamedComponentFactory";
import {Resource} from "./rdf/Resource";
import _ = require('lodash');

/**
 * Factory for component definitions with semantic arguments and without constructor mappings.
 */
export class NamedComponentFactory extends UnnamedComponentFactory {

    constructor(moduleDefinition: Resource, componentDefinition: Resource, config: any, constructable: boolean) {
        super(NamedComponentFactory.makeUnnamedDefinitionConstructor(moduleDefinition, componentDefinition)(config), constructable);
    }

    static makeUnnamedDefinitionConstructor(moduleDefinition: any, componentDefinition: any): ((params: any) => Resource) {
        return ((params: any) => {
            return new Resource(componentDefinition.value, {
                requireName: moduleDefinition.requireName || componentDefinition.requireName,
                requireElement: componentDefinition.requireElement,
                arguments: new Resource(null, {
                    list: [
                        new Resource("_:param_0", {
                            fields: (componentDefinition.hasParameter || []).map((parameterUri: Resource) => {
                                return { k: _.assignIn(parameterUri, { termType: 'Literal' }), v: params[parameterUri.value] };
                            })
                        })
                    ]
                })
            })
        });
    }

}