import {Resource} from "../rdf/Resource";
import {IComponentFactory} from "./IComponentFactory";
import {ComponentRunner} from "../ComponentRunner";
import * as Path from "path";

/**
 * Factory for component definitions with explicit arguments.
 */
export class UnnamedComponentFactory implements IComponentFactory {

    _componentDefinition: any;
    _constructable: boolean;
    _overrideRequireNames: {[id: string]: string};
    _componentRunner: ComponentRunner;

    constructor(componentDefinition: Resource, constructable: boolean, overrideRequireNames?: {[id: string]: string},
                componentRunner?: ComponentRunner) {
        this._componentDefinition = componentDefinition;
        this._constructable = constructable;
        this._overrideRequireNames = overrideRequireNames || {};
        this._componentRunner = componentRunner || new ComponentRunner();

        // Validate params
        this._validateParam(this._componentDefinition, 'requireName', 'Literal');
        this._validateParam(this._componentDefinition, 'requireElement', 'Literal', true);
    }

    _validateParam(resource: any, field: string, type: string, optional?: boolean) {
        if (!resource[field]) {
            if (!optional) {
                throw new Error('Expected ' + field + ' to exist in ' + JSON.stringify(resource));
            } else {
                return;
            }
        }
        if (resource[field].termType !== type) {
            throw new Error('Expected ' + field + ' in ' + JSON.stringify(resource) + ' to be of type ' + type);
        }
    }

    static getArgumentValue(value: any, componentRunner: ComponentRunner): any {
        if (value.fields) {
            // The parameter is an object
            return value.fields.reduce((data: any, entry: any) => {
                if (!entry.k) {
                    throw new Error('Parameter object entries must have keys, but found: ' + JSON.stringify(entry, null, '  '));
                }
                if (entry.k.termType !== 'Literal') {
                    throw new Error('Parameter object keys must be literals, but found type ' + entry.k.termType
                        + ' for ' + entry.k.value + ' while constructing: ' + JSON.stringify(value, null, '  '));
                }
                if (entry.v) {
                    data[entry.k.value] = UnnamedComponentFactory.getArgumentValue(entry.v, componentRunner);
                } else {
                    // TODO: only throw an error if the parameter is required
                    //throw new Error('Parameter object entries must have values, but found: ' + JSON.stringify(entry, null, '  '));
                }
                return data;
            }, {});
        } else if (value instanceof Array) {
            return value.map((element) => UnnamedComponentFactory.getArgumentValue(element, componentRunner));
        } else if (value.termType === 'NamedNode' || value.termType === 'BlankNode') {
            try {
                return componentRunner.runConfig(value);
            } catch (e) {
                console.error(e);
            }
        } else if (value.termType === 'Literal') {
            return value.value;
        }
        console.error('An invalid argument value was found:' + JSON.stringify(value));
        return JSON.stringify(value);
    }

    /**
     * @returns New instantiations of the provided arguments.
     * @private
     */
    _makeArguments(): any[] {
        return this._componentDefinition.arguments ? this._componentDefinition.arguments.list
            .map((resource: Resource) => UnnamedComponentFactory.getArgumentValue(resource, this._componentRunner)) : [];
    }

    /**
     * Require a package if the module that was invoked has the given module name.
     * This is done by looking for the nearest package.json.
     * @param requireName The module name that should be required.
     * @returns {any} The require() result
     * @private
     */
    _requireCurrentRunningModuleIfCurrent(requireName: string) {
        // TODO: improve performance if needed
        let pckg: any = null;
        let path: string;
        for (let nodeModulesPath of (<any> global.process.mainModule).paths) {
            path = nodeModulesPath.replace(/node_modules$/, 'package.json');
            try {
                pckg = require(path);
                break;
            } catch (e) {}
        }
        if (pckg) {
            if (requireName === pckg.name) {
                let mainPath: string = path.replace(/package\.json$/, pckg.main);
                return require(mainPath);
            }
        }
    }

    /**
     * @returns A new instance of the component.
     */
    create(): any {
        let requireName: string = this._componentDefinition.requireName.value;
        requireName = this._overrideRequireNames[requireName] || requireName;
        let object: any = null;
        try {
            object = require(requireName);
        } catch (e) {
            object = this._requireCurrentRunningModuleIfCurrent(this._componentDefinition.requireName.value);
            if (!object) {
                throw e;
            }
        }

        if (this._componentDefinition.requireElement) {
            let requireElementPath = this._componentDefinition.requireElement.value.split('.');
            object = requireElementPath.reduce((object: any, requireElement: string) => object[requireElement], object);
        }
        if (!object) {
            throw new Error('Failed to get module element ' + this._componentDefinition.requireElement.value + ' from module ' + requireName);
        }
        let instance: any;
        if (this._constructable) {
            if (!(object instanceof Function)) {
                console.error(JSON.stringify(this._componentDefinition, null, '  '));
                throw new Error('ConstructableComponent is not a function: ' + JSON.stringify(object));
            }
            let args: any[] = this._makeArguments();
            instance = new (Function.prototype.bind.apply(object, [{}].concat(args)));
        } else {
            instance = object;
        }
        return instance;
    }
}