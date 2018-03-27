import {Resource} from "../rdf/Resource";
import {IComponentFactory, ICreationSettings} from "./IComponentFactory";
import {Loader} from "../Loader";
import * as Path from "path";
import NodeUtil = require('util');
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

    static getArgumentValue(value: any, componentRunner: Loader, settings?: ICreationSettings): Promise<any> {
        settings = settings || {};
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
                        return UnnamedComponentFactory.getArgumentValue(entry.v, componentRunner, settings)
                            .then((v) => { return { k: entry.k.value, v: v }});
                    } else {
                        // TODO: only throw an error if the parameter is required
                        //return Promise.reject(new Error('Parameter object entries must have values, but found: ' + JSON.stringify(entry, null, '  ')));
                        return Promise.resolve(null);
                    }
                })).then((entries) => {
                    return entries.reduce((data: any, entry: any) => {
                        if (entry) {
                            if (settings.serializations) {
                                entry.k = '\'' + entry.k + '\'';
                            }
                            data[entry.k] = entry.v;
                        }
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
                        return UnnamedComponentFactory.getArgumentValue(entry.v, componentRunner, settings);
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
                    (element) => UnnamedComponentFactory.getArgumentValue(element, componentRunner, settings)))
                    .then(resolve).catch(reject);
            } else if (value.termType === 'NamedNode' || value.termType === 'BlankNode') {
                if (value.v) {
                    return resolve(UnnamedComponentFactory.getArgumentValue(value.v, componentRunner, settings));
                }
                if (settings.shallow) {
                    return resolve({});
                }
                return componentRunner.instantiate(value, settings).catch(reject).then(resolve);
            } else if (value.termType === 'Literal') {
                if (settings.serializations && typeof value.value === 'string') {
                    return resolve('\'' + value.value + '\'');
                } else {
                    return resolve(value.value);
                }
            }
            return reject(new Error('An invalid argument value was found:' + NodeUtil.inspect(value)));
        });
    }

    /**
     * @param settings The settings for creating the instance.
     * @returns New instantiations of the provided arguments.
     */
    makeArguments(settings?: ICreationSettings): Promise<any[]> {
        return this._componentDefinition.arguments ? Promise.all(this._componentDefinition.arguments.list
            .map((resource: Resource) => resource ? UnnamedComponentFactory.getArgumentValue(resource, this._componentRunner, settings) : undefined)) : Promise.resolve([]);
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
     * @return {string} The index module path of the current running module.
     * @private
     */
    _getCurrentRunningModuleMain(): string {
        let path: string = Util.getMainModulePath();
        let pckg: any = Util.getPackageJson(Path.join(path, 'package.json'));
        return Path.join(path, pckg.main);
    }

    /**
     * @param settings The settings for creating the instance.
     * @returns A new instance of the component.
     */
    create(settings?: ICreationSettings): Promise<any> {
        settings = settings || {};
        const serialize: boolean = !!settings.serializations;
        return new Promise(async (resolve, reject) => {
            let requireName: string = this._componentDefinition.requireName.value;
            requireName = this._overrideRequireNames[requireName] || requireName;
            let object: any = null;
            let resultingRequirePath = null;
            try {
                try {
                    // Always require relative from main module, because Components.js will in most cases just be dependency.
                    object = require.main.require(requireName);
                    if (serialize) resultingRequirePath = requireName;
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
                } else if (serialize) {
                    resultingRequirePath = '.' + Path.sep
                        + Path.relative(Util.getMainModulePath(), this._getCurrentRunningModuleMain());
                }
            }

            var serialization = serialize ? 'require(\'' + resultingRequirePath.replace(/\\/g, '\\\\') + '\')' : null;

            var subObject;
            if (this._componentDefinition.requireElement) {
                let requireElementPath = this._componentDefinition.requireElement.value.split('.');
                if (serialize) serialization += '.' + this._componentDefinition.requireElement.value;
                try {
                    subObject = requireElementPath.reduce((object: any, requireElement: string) => object[requireElement], object);
                } catch (e) {
                    return reject(new Error('Failed to get module element ' + this._componentDefinition.requireElement.value + ' from module ' + requireName + "\n" + NodeUtil.inspect(object)));
                }
            }
            else {
                subObject = object;
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
                try {
                    const args: any[] = await this.makeArguments(settings);
                    if (serialize) {
                        serialization = 'new (' + serialization + ')(' + args.map((arg) => JSON.stringify(arg, null, '  ').replace(/(^|[^\\])"/g, '$1')).join(',') + ')';
                    } else {
                        object = new (Function.prototype.bind.apply(object, [{}].concat(args)));
                    }
                } catch (e) {
                    reject(e);
                }
            }
            if (serialize) {
                const serializationVariableName = Util.uriToVariableName(this._componentDefinition.value);
                serialization = 'const ' + serializationVariableName + ' = ' + serialization + ';';
                settings.serializations.push(serialization);
                serialization = serializationVariableName;
            }
            serialize ? resolve(serialization) : resolve(object);
        });
    }
}