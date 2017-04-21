import {Resource} from "./rdf/Resource";

/**
 * Factory for component definitions with explicit arguments.
 */
export class UnnamedComponentFactory {

    _componentDefinition: any;
    _constructable: boolean;

    constructor(componentDefinition: Resource, constructable: boolean) {
        this._componentDefinition = componentDefinition;
        this._constructable = constructable;
        // TODO: validate params
    }

    static getArgumentValue(value: any): any {
        if (value.termType === 'NamedNode') {
            // TODO: Make factory to distinguish between named and non-named component definitions.
            return new UnnamedComponentFactory(value, true).create();
        } else if (value.termType === 'Literal') {
            return value.value;
        } else {
            throw new Error(value + ' was not recognized as a valid argument value.');
        }
    }

    /**
     * @returns New instantiations of the provided arguments.
     * @private
     */
    _makeArguments(): any[] {
        return this._componentDefinition.arguments.list.map((resource: any, i: number) => {
            if (resource.fields) {
                // The parameter is an object
                return resource.fields.reduce((data: any, entry: any) => {
                    if (entry.k.termType !== 'Literal') {
                        throw new Error('Parameter object keys must be literals, but found type ' + entry.k.termType
                            + ' for ' + entry.k.value + ' while constructing: ' + resource);
                    }
                    data[entry.k.value] = UnnamedComponentFactory.getArgumentValue(entry.v);
                    return data;
                }, {});
            } else {
                return UnnamedComponentFactory.getArgumentValue(resource);
            }
        });
    }

    /**
     * @returns A new instance of the component.
     */
    create(): any {
        let object: any = require(this._componentDefinition.requireName.value);
        if (this._componentDefinition.requireElement) {
            object = object[this._componentDefinition.requireElement.value];
        }
        let instance: any;
        if (this._constructable) {
            let args: any[] = this._makeArguments();
            instance = new (Function.prototype.bind.apply(object, args));
        } else {
            instance = object;
        }
        return instance;
    }
}