"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const UnnamedComponentFactory_1 = require("./UnnamedComponentFactory");
const Resource_1 = require("../rdf/Resource");
const _ = require("lodash");
/**
 * Factory for component definitions with semantic arguments and without constructor mappings.
 */
class UnmappedNamedComponentFactory extends UnnamedComponentFactory_1.UnnamedComponentFactory {
    constructor(moduleDefinition, componentDefinition, config, constructable) {
        // TODO: validate parameters
        super(UnmappedNamedComponentFactory.makeUnnamedDefinitionConstructor(moduleDefinition, componentDefinition)(config), constructable);
    }
    /**
     * Create an unnamed component definition resource constructor.
     * The component definition's parameters will be delegated to the component constructor.
     * @param moduleDefinition The module definition with parameter definitions.
     * @param componentDefinition The component definition with parameter instances.
     * @returns {(params:any)=>Resource} A function that takes a parameter object for mapping parameter names to values
     *                                   like { 'http://example.org/param0': Resource.newString('abc') }
     *                                   and returns an unnamed component definition resource.
     */
    static makeUnnamedDefinitionConstructor(moduleDefinition, componentDefinition) {
        // TODO: validate param types
        return ((params) => {
            return new Resource_1.Resource(componentDefinition.value, {
                requireName: moduleDefinition.requireName || componentDefinition.requireName,
                requireElement: componentDefinition.requireElement,
                arguments: new Resource_1.Resource(null, {
                    list: [
                        new Resource_1.Resource("_:param_0", {
                            fields: (componentDefinition.hasParameter || []).map((parameterUri) => {
                                return { k: _.assignIn(parameterUri, { termType: 'Literal' }), v: params[parameterUri.value] };
                            })
                        })
                    ]
                })
            });
        });
    }
}
exports.UnmappedNamedComponentFactory = UnmappedNamedComponentFactory;
//# sourceMappingURL=UnmappedNamedComponentFactory.js.map