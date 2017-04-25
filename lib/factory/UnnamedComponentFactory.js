"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Factory for component definitions with explicit arguments.
 */
class UnnamedComponentFactory {
    constructor(componentDefinition, constructable) {
        this._componentDefinition = componentDefinition;
        this._constructable = constructable;
        // TODO: validate params
    }
    static getArgumentValue(value) {
        if (value instanceof Array) {
            return value.map((element) => UnnamedComponentFactory.getArgumentValue(element));
        }
        else if (value.termType === 'NamedNode') {
            // TODO: Make factory to distinguish between named and non-named component definitions.
            return new UnnamedComponentFactory(value, true).create();
        }
        else if (value.termType === 'Literal') {
            return value.value;
        }
        else {
            throw new Error(JSON.stringify(value) + ' was not recognized as a valid argument value.');
        }
    }
    /**
     * @returns New instantiations of the provided arguments.
     * @private
     */
    _makeArguments() {
        return this._componentDefinition.arguments ? this._componentDefinition.arguments.list.map((resource, i) => {
            if (resource.fields) {
                // The parameter is an object
                return resource.fields.reduce((data, entry) => {
                    if (entry.k.termType !== 'Literal') {
                        throw new Error('Parameter object keys must be literals, but found type ' + entry.k.termType
                            + ' for ' + entry.k.value + ' while constructing: ' + resource);
                    }
                    if (entry.v) {
                        data[entry.k.value] = UnnamedComponentFactory.getArgumentValue(entry.v);
                    }
                    return data;
                }, {});
            }
            else {
                return UnnamedComponentFactory.getArgumentValue(resource);
            }
        }) : [];
    }
    /**
     * @returns A new instance of the component.
     */
    create() {
        let object = require(this._componentDefinition.requireName.value);
        if (!object) {
            throw new Error('Failed to require() a module by name ' + this._componentDefinition.requireName.value);
        }
        if (this._componentDefinition.requireElement) {
            object = object[this._componentDefinition.requireElement.value];
        }
        if (!object) {
            throw new Error('Failed to get module element ' + this._componentDefinition.requireElement.value + ' from module ' + this._componentDefinition.requireName.value);
        }
        let instance;
        if (this._constructable) {
            let args = this._makeArguments();
            instance = new (Function.prototype.bind.apply(object, [{}].concat(args)));
        }
        else {
            instance = object;
        }
        return instance;
    }
}
exports.UnnamedComponentFactory = UnnamedComponentFactory;
//# sourceMappingURL=UnnamedComponentFactory.js.map