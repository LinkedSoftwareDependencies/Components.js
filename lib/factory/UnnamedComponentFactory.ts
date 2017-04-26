import {Resource} from "../rdf/Resource";
import {IComponentFactory} from "./IComponentFactory";

/**
 * Factory for component definitions with explicit arguments.
 */
export class UnnamedComponentFactory implements IComponentFactory {

    _componentDefinition: any;
    _constructable: boolean;
    _overrideRequireNames: {[id: string]: string};

    constructor(componentDefinition: Resource, constructable: boolean, overrideRequireNames?: {[id: string]: string}) {
        this._componentDefinition = componentDefinition;
        this._constructable = constructable;
        this._overrideRequireNames = overrideRequireNames || {};
        // TODO: validate params
    }

    static getArgumentValue(value: any): any {
        if (value instanceof Array) {
            return value.map((element) => UnnamedComponentFactory.getArgumentValue(element));
        } else if (value.termType === 'NamedNode') {
            // TODO: Make factory to distinguish between named and non-named component definitions.
            return new UnnamedComponentFactory(value, true).create();
        } else if (value.termType === 'Literal') {
            return value.value;
        } else {
            throw new Error(JSON.stringify(value) + ' was not recognized as a valid argument value.');
        }
    }

    /**
     * @returns New instantiations of the provided arguments.
     * @private
     */
    _makeArguments(): any[] {
        return this._componentDefinition.arguments ? this._componentDefinition.arguments.list.map((resource: any, i: number) => {
            if (resource.fields) {
                // The parameter is an object
                return resource.fields.reduce((data: any, entry: any) => {
                    if (entry.k.termType !== 'Literal') {
                        throw new Error('Parameter object keys must be literals, but found type ' + entry.k.termType
                            + ' for ' + entry.k.value + ' while constructing: ' + resource);
                    }
                    if (entry.v) {
                        data[entry.k.value] = UnnamedComponentFactory.getArgumentValue(entry.v);
                    }
                    return data;
                }, {});
            } else {
                return UnnamedComponentFactory.getArgumentValue(resource);
            }
        }) : [];
    }

    /**
     * @returns A new instance of the component.
     */
    create(): any {
        let requireName: string = this._componentDefinition.requireName.value;
        requireName = this._overrideRequireNames[requireName] || requireName;
        let object: any = require(requireName);
        if (!object) {
            throw new Error('Failed to require() a module by name ' + requireName);
        }
        if (this._componentDefinition.requireElement) {
            object = object[this._componentDefinition.requireElement.value];
        }
        if (!object) {
            throw new Error('Failed to get module element ' + this._componentDefinition.requireElement.value + ' from module ' + requireName);
        }
        let instance: any;
        if (this._constructable) {
            let args: any[] = this._makeArguments();
            instance = new (Function.prototype.bind.apply(object, [{}].concat(args)));
        } else {
            instance = object;
        }
        return instance;
    }
}