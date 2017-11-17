import {Resource} from "../rdf/Resource";
import {IComponentFactory} from "./IComponentFactory";
import {Loader} from "../Loader";
import NodeUtil = require('util');
import * as Path from "path";
import Util = require("../Util");

/**
 * Factory for component definitions with explicit arguments.
 */
export class UnnamedComponentFactory implements IComponentFactory {

    _componentDefinition: any;
    _constructable: boolean;
    _overrideRequireNames: {[id: string]: string};
    _componentRunner: Loader;

    constructor(componentDefinition: Resource, constructable: boolean, overrideRequireNames?: {[id: string]: string},
                componentRunner?: Loader) {
        this._componentDefinition = componentDefinition;
        this._constructable = constructable;
        this._overrideRequireNames = overrideRequireNames || {};
        this._componentRunner = componentRunner || new Loader();

        // Validate params
        this._validateParam(this._componentDefinition, 'requireName', 'Literal');
        this._validateParam(this._componentDefinition, 'requireElement', 'Literal', true);
    }

    _validateParam(resource: any, field: string, type: string, optional?: boolean) {
        if (!resource[field]) {
            if (!optional) {
                throw new Error('Expected ' + field + ' to exist in ' + NodeUtil.inspect(resource));
            } else {
                return;
            }
        }
        if (resource[field].termType !== type) {
            throw new Error('Expected ' + field + ' in ' + NodeUtil.inspect(resource) + ' to be of type ' + type);
        }
    }

    static getArgumentValue(value: any, componentRunner: Loader, shallow?: boolean, resourceBlacklist?: {[id: string]: boolean}): Promise<any> {
        return new Promise((resolve, reject) => {
            if (value.fields) {
                // The parameter is an object
                return Promise.all(value.fields.map((entry: any) => {
                    if (!entry.k) {
                        return reject(new Error('Parameter object entries must have keys, but found: ' + NodeUtil.inspect(entry)));
                    }
                    if (entry.k.termType !== 'Literal') {
                        return reject(new Error('Parameter object keys must be literals, but found type ' + entry.k.termType
                            + ' for ' + entry.k.value + ' while constructing: ' + NodeUtil.inspect(value)));
                    }
                    if (entry.v) {
                        return UnnamedComponentFactory.getArgumentValue(entry.v, componentRunner, shallow, resourceBlacklist)
                            .then((v) => { return { k: entry.k.value, v: v }});
                    } else {
                        // TODO: only throw an error if the parameter is required
                        //return Promise.reject(new Error('Parameter object entries must have values, but found: ' + JSON.stringify(entry, null, '  ')));
                        return Promise.resolve(null);
                    }
                })).then((entries) => {
                    return entries.reduce((data: any, entry: any) => {
                        if (entry)
                            data[entry.k] = entry.v;
                        return data;
                    }, {});
                }).then(resolve).catch(reject);
            } else if (value.elements) {
                // The parameter is a dynamic array
                return Promise.all(value.elements.map((entry: any) => {
                    if (!entry.v) {
                        return Promise.reject(new Error('Parameter array elements must have values, but found: ' + NodeUtil.inspect(entry)));
                    }
                    if (entry.v) {
                        return UnnamedComponentFactory.getArgumentValue(entry.v, componentRunner, shallow, resourceBlacklist);
                    }
                })).then((elements: any[]) => {
                    var ret: any[] = [];
                    elements.forEach((element) => {
                        if (element instanceof Array) {
                            ret = ret.concat(element);
                        } else {
                            ret.push(element);
                        }
                    });
                    resolve(ret);
                }).catch(reject);
            } else if (value instanceof Array) {
                return Promise.all(value.map(
                    (element) => UnnamedComponentFactory.getArgumentValue(element, componentRunner, shallow, resourceBlacklist)))
                    .then(resolve).catch(reject);
            } else if (value.termType === 'NamedNode' || value.termType === 'BlankNode') {
                if (value.v || value.vRaw) {
                    return resolve(UnnamedComponentFactory.getArgumentValue(value.v || value.vRaw, componentRunner, shallow, resourceBlacklist));
                }
                if (shallow) {
                    return resolve({});
                }
                return componentRunner.instantiate(value, resourceBlacklist).catch(reject).then(resolve);
            } else if (value.termType === 'Literal') {
                return resolve(value.value);
            }
            return reject(new Error('An invalid argument value was found:' + NodeUtil.inspect(value)));
        });
    }

    /**
     * @param shallow If instances should not be created.
     * @param resourceBlacklist The config resource id's to ignore in parameters. Used for avoiding infinite recursion.
     * @returns New instantiations of the provided arguments.
     */
    makeArguments(shallow?: boolean, resourceBlacklist?: {[id: string]: boolean}): Promise<any[]> {
        return this._componentDefinition.arguments ? Promise.all(this._componentDefinition.arguments.list
            .map((resource: Resource) => resource ? UnnamedComponentFactory.getArgumentValue(resource, this._componentRunner, shallow, resourceBlacklist) : undefined)) : Promise.resolve([]);
    }

    /**
     * Require a package if the module that was invoked has the given module name.
     * This is done by looking for the nearest package.json.
     * @param requireName The module name that should be required.
     * @returns {any} The require() result
     * @private
     */
    _requireCurrentRunningModuleIfCurrent(requireName: string) {
        let path: string = Util.getMainModulePath();
        let pckg: any = Util.getPackageJson(Path.join(path, 'package.json'));
        if (pckg) {
            if (requireName === pckg.name) {
                let mainPath: string = Path.join(path, pckg.main);
                return require(mainPath);
            }
        }
    }

    /**
     * @param resourceBlacklist The config resource id's to ignore in parameters. Used for avoiding infinite recursion.
     * @returns A new instance of the component.
     */
    create(resourceBlacklist?: {[id: string]: boolean}): Promise<any> {
        return new Promise((resolve, reject) => {
            let requireName: string = this._componentDefinition.requireName.value;
            requireName = this._overrideRequireNames[requireName] || requireName;
            let object: any = null;
            try {
                try {
                    // Always require relative from main module, because Components.js will in most cases just be dependency.
                    object = require.main.require(requireName);
                } catch (e) {
                    if (this._componentRunner._properties.scanGlobal) {
                        object = require('requireg')(requireName);
                    } else {
                        throw e;
                    }
                }
            } catch (e) {
                object = this._requireCurrentRunningModuleIfCurrent(this._componentDefinition.requireName.value);
                if (!object) {
                    return reject(e);
                }
            }

            var subObject;
            if (this._componentDefinition.requireElement) {
                let requireElementPath = this._componentDefinition.requireElement.value.split('.');
                try {
                    subObject = requireElementPath.reduce((object: any, requireElement: string) => object[requireElement], object);
                } catch (e) {
                    return reject(new Error('Failed to get module element ' + this._componentDefinition.requireElement.value + ' from module ' + requireName + "\n" + NodeUtil.inspect(object)));
                }
            }
            else {
                return reject(new Error('No oo:componentPath was defined on a component.\n' + NodeUtil.inspect(this._componentDefinition)));
            }
            if (!subObject) {
                return reject(new Error('Failed to get module element ' + this._componentDefinition.requireElement.value + ' from module ' + requireName + "\n" + NodeUtil.inspect(object)));
            }
            object = subObject;
            if (this._constructable) {
                if (!(object instanceof Function)) {
                    return reject(new Error('ConstructableComponent is not a function: ' + NodeUtil.inspect(object)
                        + "\n" + NodeUtil.inspect(this._componentDefinition)));
                }
                this.makeArguments(false, resourceBlacklist).then((args: any[]) => {
                    resolve(new (Function.prototype.bind.apply(object, [{}].concat(args))));
                }).catch(reject);
            } else {
                resolve(object);
            }
        });
    }
}