import { Resource } from "rdf-object";
import {IComponentFactory, ICreationSettings} from "./IComponentFactory";
import {Loader} from "../Loader";
import * as Path from "path";
import NodeUtil = require('util');
import Util = require("../Util");
import Dict = NodeJS.Dict;

/**
 * Factory for component definitions with explicit arguments.
 */
export class UnnamedComponentFactory implements IComponentFactory {

    _componentDefinition: Resource;
    _constructable: boolean;
    _overrideRequireNames: Dict<string>;
    _componentRunner: Loader;

    constructor(componentDefinition: Resource, constructable: boolean, overrideRequireNames: {[id: string]: string},
                componentRunner: Loader) {
        this._componentDefinition = componentDefinition;
        this._constructable = constructable;
        this._overrideRequireNames = overrideRequireNames || {};
        this._componentRunner = componentRunner || new Loader();

        // Validate params
        this._validateParam(this._componentDefinition, 'requireName', 'Literal');
        this._validateParam(this._componentDefinition, 'requireElement', 'Literal', true);
        this._validateParam(this._componentDefinition, 'requireNoConstructor', 'Literal', true);
    }

    _validateParam(resource: Resource, field: string, type: string, optional?: boolean) {
        if (!resource.property[field]) {
            if (!optional) {
                throw new Error('Expected ' + field + ' to exist in ' + NodeUtil.inspect(resource));
            } else {
                return;
            }
        }
        if (resource.property[field].type !== type) {
            throw new Error('Expected ' + field + ' in ' + NodeUtil.inspect(resource) + ' to be of type ' + type);
        }
    }

    public static async getArgumentValue(value: Resource | Resource[], componentRunner: Loader, settings?: ICreationSettings): Promise<any> {
        settings = settings || {};
        if (value instanceof Array) {
            // Unwrap unique values out of the array
            if (value[0].property.unique && value[0].property.unique.value === 'true') {
                return UnnamedComponentFactory.getArgumentValue(value[0], componentRunner, settings);
            }
            // Otherwise, keep the array form
            return await Promise.all(value.map((element) => UnnamedComponentFactory.getArgumentValue(element, componentRunner, settings)));
        } else if (value.property.fields || value.property.hasFields) { // hasFields is a hack for making UnmappedNamedComponentFactory work
            // The parameter is an object
            const entries = await Promise.all(value.properties.fields.map(async (entry: Resource) => {
                if (!entry.property.key) {
                    throw new Error('Parameter object entries must have keys, but found: ' + NodeUtil.inspect(entry));
                }
                if (entry.property.key.type !== 'Literal') {
                    throw new Error('Parameter object keys must be literals, but found type ' + entry.property.key.type
                      + ' for ' + entry.property.key.value + ' while constructing: ' + NodeUtil.inspect(value));
                }
                if (entry.property.value) {
                    const v = await UnnamedComponentFactory.getArgumentValue(entry.properties.value, componentRunner, settings)
                    return { key: entry.property.key.value, value: v };
                } else {
                    // TODO: only throw an error if the parameter is required
                    //return Promise.reject(new Error('Parameter object entries must have values, but found: ' + JSON.stringify(entry, null, '  ')));
                    return null;
                }
            }));
            return entries.reduce((data: any, entry: any) => {
                if (entry) {
                    if (settings.serializations) {
                        entry.key = '\'' + entry.key + '\'';
                    }
                    data[entry.key] = entry.value;
                }
                return data;
            }, {});
        } else if (value.property.elements) {
            // The parameter is a dynamic array
            const elements = await Promise.all(value.properties.elements.map(async (entry: Resource) => {
                if (!entry.property.value) {
                    throw new Error('Parameter array elements must have values, but found: ' + NodeUtil.inspect(entry));
                } else {
                    return await UnnamedComponentFactory.getArgumentValue(entry.property.value, componentRunner, settings);
                }
            }));
            var ret: any[] = [];
            elements.forEach((element) => {
                if (element instanceof Array) {
                    ret = ret.concat(element);
                } else {
                    ret.push(element);
                }
            });
            return ret;
        } else if (value.type === 'NamedNode' || value.type === 'BlankNode') {
            if (value.property.value) {
                return await UnnamedComponentFactory.getArgumentValue(value.properties.value, componentRunner, settings);
            }
            if (settings.shallow) {
                return {};
            }
            if (value.property.lazy && value.property.lazy.value === 'true') {
                return () => componentRunner.instantiate(value, settings);
            } else {
                return await componentRunner.instantiate(value, settings);
            }
        } else if (value.type === 'Literal') {
            // valueRaw can be set in Util.captureType
            // TODO: improve this, so that the hacked valueRaw is not needed
            const rawValue: any = 'valueRaw' in value.term ? (<any> value.term).valueRaw : value.value;
            if (value.property.lazy && value.property.lazy.value === 'true') {
                if (settings.serializations && typeof value.value === 'string') {
                    return 'new function() { return Promise.resolve(\'' + rawValue + '\'); }';
                } else {
                    return () => Promise.resolve(rawValue);
                }
            } else {
                if (settings.serializations && typeof rawValue === 'string') {
                    return '\'' + rawValue + '\'';
                } else {
                    return rawValue;
                }
            }
        }
        throw new Error('An invalid argument value was found:' + NodeUtil.inspect(value));
    }

    /**
     * @param settings The settings for creating the instance.
     * @returns New instantiations of the provided arguments.
     */
    public async makeArguments(settings?: ICreationSettings): Promise<any[]> {
        if (this._componentDefinition.property.arguments) {
            return await Promise.all(this._componentDefinition.property.arguments.list
              .map((resource: Resource) => resource ? UnnamedComponentFactory.getArgumentValue(resource, this._componentRunner, settings) : undefined));
        }
        return [];
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
    public async create(settings?: ICreationSettings): Promise<any> {
        settings = settings || {};
        const serialize: boolean = !!settings.serializations;
        let requireName: string = this._componentDefinition.property.requireName.value;
        requireName = this._overrideRequireNames[requireName] || requireName;
        let object: any = null;
        let resultingRequirePath = null;
        try {
            object = this._requireCurrentRunningModuleIfCurrent(this._componentDefinition.property.requireName.value);
            if (!object) {
                throw new Error('Component is not the main module');
            } else if (serialize) {
                resultingRequirePath = '.' + Path.sep
                  + Path.relative(Util.getMainModulePath(), this._getCurrentRunningModuleMain());
            }
        } catch (e) {
            try {
                // Always require relative from main module, because Components.js will in most cases just be dependency.
                object = require.main.require(requireName.charAt(0) === '.'
                  ? Path.join(process.cwd(), requireName)
                  : requireName);
                if (serialize) resultingRequirePath = requireName;
            } catch (e) {
                if (this._componentRunner._properties.scanGlobal) {
                    object = require('requireg')(requireName);
                } else {
                    throw e;
                }
            }
        }

        var serialization = serialize ? 'require(\'' + resultingRequirePath.replace(/\\/g, '/') + '\')' : null;

        var subObject;
        if (this._componentDefinition.property.requireElement) {
            let requireElementPath = this._componentDefinition.property.requireElement.value.split('.');
            if (serialize) serialization += '.' + this._componentDefinition.property.requireElement.value;
            try {
                subObject = requireElementPath.reduce((object: any, requireElement: string) => object[requireElement], object);
            } catch (e) {
                throw new Error('Failed to get module element ' + this._componentDefinition.property.requireElement.value + ' from module ' + requireName);
            }
        }
        else {
            subObject = object;
        }
        if (!subObject) {
            throw new Error('Failed to get module element ' + this._componentDefinition.property.requireElement.value + ' from module ' + requireName);
        }
        object = subObject;
        if (!this._componentDefinition.property.requireNoConstructor || this._componentDefinition.property.requireNoConstructor.value !== 'true') {
            if (this._constructable) {
                if (!(object instanceof Function)) {
                    throw new Error('ConstructableComponent is not a function: ' + NodeUtil.inspect(object)
                      + "\n" + NodeUtil.inspect(this._componentDefinition));
                }
                const args: any[] = await this.makeArguments(settings);
                if (serialize) {
                    serialization = 'new (' + serialization + ')(' + args.map((arg) => JSON.stringify(arg, null, '  ').replace(/(^|[^\\])"/g, '$1')).join(',') + ')';
                } else {
                    object = new (Function.prototype.bind.apply(object, [{}].concat(args)));
                }
            }
        }
        if (serialize) {
            const serializationVariableName = Util.uriToVariableName(this._componentDefinition.value);
            serialization = 'const ' + serializationVariableName + ' = ' + serialization + ';';
            settings.serializations.push(serialization);
            serialization = serializationVariableName;
        }
        return serialize ? serialization : object;
    }
}
