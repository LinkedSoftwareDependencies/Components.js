import { Readable } from "stream";
import { RdfObjectLoader, Resource } from "rdf-object";
import {ComponentFactory} from "./factory/ComponentFactory";
import _ = require("lodash");
import Util = require("./Util");
import {IComponentFactory, ICreationSettings} from "./factory/IComponentFactory";
import NodeUtil = require('util');
import { RdfParser } from './rdf/RdfParser';
import * as RDF from 'rdf-js';
import * as fs from "fs";

/**
 * A loader class for component configs.
 * Modules must first be registered to this loader.
 * After that, components can be instantiated.
 * Components with the same URI will only be instantiated once.
 */
export class Loader {

    public readonly objectLoader: RdfObjectLoader;

    _properties: LoaderProperties;

    _componentResources: {[id: string]: Resource} = {};
    /**
     * Require overrides.
     * Require name as path, require override as value.
     */
    overrideRequireNames: {[id: string]: string} = {};

    _runTypeConfigs: {[id: string]: Resource[]} = {};
    _instances: {[id: string]: any} = {};
    _registrationFinalized: boolean = false;

    constructor(properties?: LoaderProperties) {
        this._properties = properties || {};

        this.objectLoader = new RdfObjectLoader({
            context: JSON.parse(fs.readFileSync(__dirname + '/../components/context.jsonld', 'utf8')),
        })

        if (this._properties.mainModulePath) {
            Util.setMainModulePath(this._properties.mainModulePath);
        }
        if (!('absolutizeRelativePaths' in this._properties)) {
            this._properties.absolutizeRelativePaths = true;
        }
        if (!this._properties.contexts) {
            this._properties.contexts = <{[id: string]: any}> <any> Util.getAvailableContexts(this._properties.scanGlobal);
        }
        if (!this._properties.importPaths) {
            this._properties.importPaths = <{[id: string]: string}> <any> Util.getAvailableImportPaths(this._properties.scanGlobal);
        }
    }

    _getContexts(): Promise<{[id: string]: any}> {
        return Promise.resolve(this._properties.contexts).then((contexts) => {
            this._properties.contexts = contexts;
            return contexts;
        })
    }

    _getImportPaths(): Promise<{[id: string]: string}> {
        return Promise.resolve(this._properties.importPaths).then((configPrefixes) => {
            this._properties.importPaths = configPrefixes;
            return configPrefixes;
        })
    }

    /**
     * Register a new component.
     * This will ensure that component configs referring to this component as type are recognized.
     * @param componentResource A component resource.
     * @private
     */
    _registerComponentResource(componentResource: Resource) {
        if (this._registrationFinalized) {
            throw new Error('Tried registering a component ' + componentResource.value
                + ' after the loader has been finalized.');
        }
        this._requireValidComponent(componentResource);
        this._componentResources[componentResource.value] = componentResource;
    }

    /**
     * Check if the given resource is a valid component.
     * @param componentResource A resource.
     * @returns {boolean} If the resource is a valid component.
     * @private
     */
    _isValidComponent(componentResource: Resource) {
        return componentResource.isA(Util.IRI_ABSTRACT_CLASS)
            || componentResource.isA(Util.IRI_CLASS)
            || componentResource.isA(Util.IRI_COMPONENT_INSTANCE);
    }

    /**
     * Require that the given resource is a valid component,
     * otherwise and error is thrown.
     * @param componentResource A resource.
     * @param referencingComponent The optional component referencing the given component.
     * @private
     */
    _requireValidComponent(componentResource: Resource, referencingComponent?: Resource) {
        if (!this._isValidComponent(componentResource)) {
            throw new Error('The referenced resource ' + componentResource.value + ' is not a valid ' +
                'component resource, either it is not defined or incorrectly referenced'
            + (referencingComponent ? ' by ' + referencingComponent.value + '.' : '.'));
        }
    }

    /**
     * Let the given component inherit parameters from the given component(s) if applicable.
     * @param componentResource The component resource
     * @param inheritValues The component inheritValues to inherit from.
     * @private
     */
    _inheritParameters(componentResource: Resource, inheritValues?: Resource[]) {
        if (inheritValues) {
            inheritValues.forEach((component: Resource) => {
                this._requireValidComponent(component, componentResource);
                if (this._isValidComponent(component)) {
                    if (component.property.parameters) {
                        component.properties.parameters.forEach((parameter: Resource) => {
                            if (componentResource.properties.parameters.indexOf(parameter) < 0) {
                                componentResource.properties.parameters.push(parameter);
                            }
                        });
                        this._inheritParameters(componentResource, component.properties.inheritValues);
                    }
                }
            });
        }
    }

    /**
     * Let the given component inherit constructor mappings from the given component(s) if applicable.
     * @param componentResource The component resource
     * @private
     */
    _inheritConstructorParameters(componentResource: Resource) {
        if (componentResource.property.constructorArguments) {
            componentResource.property.constructorArguments.list.forEach((object: Resource) => {
                if (object.property.inheritValues) {
                    this._inheritObjectFields(object, object.properties.inheritValues);
                }
            });
        }
    }

    /**
     * Let the given object inherit the given fields from the given component(s) if applicable.
     * @param object The object resource
     * @param inheritValues The objects to inherit from.
     * @private
     */
    _inheritObjectFields(object: Resource, inheritValues?: Resource[]) {
        if (inheritValues) {
            inheritValues.forEach((superObject: Resource) => {
                if (superObject.property.fields) {
                    superObject.properties.fields.forEach((field: Resource) => {
                        if (object.properties.fields.indexOf(field) < 0) {
                            object.properties.fields.push(field);
                        }
                    });
                } else if (!superObject.isA(Util.DF.namedNode(Util.PREFIXES['om'] + 'ObjectMapping')) && !superObject.property.inheritValues && !superObject.property.onParameter) {
                    throw new Error('The referenced constructor mappings object ' + superObject.value
                        + ' from ' + object.value + ' is not valid, i.e., it doesn\'t contain mapping fields '
                        + ', has the om:ObjectMapping type or has a superclass. '
                        + 'It possibly is incorrectly referenced or not defined at all.');
                }
                if (superObject.property.inheritValues) {
                    this._inheritObjectFields(object, superObject.properties.inheritValues);
                }
            });
        }
    }

    /**
     * Register a new module and its components.
     * This will ensure that component configs referring to components as types of this module are recognized.
     * @param moduleResource A module resource.
     */
    registerModuleResource(moduleResource: Resource) {
        if (this._registrationFinalized) {
            throw new Error('Tried registering a module ' + moduleResource.value
                + ' after the loader has been finalized.');
        }
        if (moduleResource.properties.components) {
            moduleResource.properties.components.forEach((component: Resource) => {
                component.property.module = moduleResource;
                this._registerComponentResource(component);
            });
        } else if (!moduleResource.property.imports) {
            throw new Error('Tried to register the module ' + moduleResource.value + ' that has no components.');
        }
    }

    /**
     * Register new modules and their components.
     * This will ensure that component configs referring to components as types of these modules are recognized.
     * @param moduleResourceStream A triple stream containing modules.
     * @returns {Promise<T>} A promise that resolves once loading has finished.
     */
    async registerModuleResourcesStream(moduleResourceStream: RDF.Stream & Readable): Promise<void> {
        await this.objectLoader.import(moduleResourceStream);
        for (const resource of Object.values(this.objectLoader.resources)) {
            if (resource.isA(Util.IRI_MODULE)) {
                this.registerModuleResource(resource);
            }
        }
    }

    /**
     * Register new modules and their components.
     * This will ensure that component configs referring to components as types of these modules are recognized.
     * @param moduleResourceUrl An RDF document URL
     * @param fromPath The path to base relative paths on. This will typically be __dirname.
     * @returns {Promise<T>} A promise that resolves once loading has finished.
     */
    registerModuleResourcesUrl(moduleResourceUrl: string, fromPath?: string): Promise<void> {
        return Promise.all([this._getContexts(), this._getImportPaths()])
            .then(([contexts, importPaths]: {[id: string]: string}[]) => {
                return Util.getContentsFromUrlOrPath(moduleResourceUrl, fromPath)
                    .then((data: Readable) => this.registerModuleResourcesStream(
                new RdfParser().parse(data, {
                    fromPath: fromPath,
                    path: moduleResourceUrl,
                    contexts,
                    importPaths,
                    ignoreImports: false,
                    absolutizeRelativePaths: this._properties.absolutizeRelativePaths,
                })));
            });
    }

    /**
     * Register all reachable modules and their components.
     * This will interpret the package.json from the main module and all its dependencies for discovering modules.
     * This will ensure that component configs referring to components as types of these modules are recognized.
     * @returns {Promise<T>} A promise that resolves once loading has finished.
     */
    registerAvailableModuleResources(): Promise<void> {
        return Util.getAvailableModuleComponentPaths(this._properties.scanGlobal)
            .catch((e) => e)
            .then((data: {[id: string]: string}) => {
                return Promise.all(_.values(data).map((moduleResourceUrl: string) => this.registerModuleResourcesUrl(moduleResourceUrl)))
                    .then(() => null);
            });
    }

    /**
     * Get a component config constructor based on a Resource.
     * @param configResource A config resource.
     * @returns The component factory.
     */
    getConfigConstructor(configResource: Resource): IComponentFactory {
        let allTypes : string[] = [];
        let componentTypes: Resource[] = configResource.properties.types.reduce((types: Resource[], typeUri: Resource) => {
            let componentResource: Resource = this._componentResources[typeUri.value];
            allTypes.push(typeUri.value);
            if (componentResource) {
                types.push(componentResource);
                if (!this._runTypeConfigs[componentResource.value]) {
                    this._runTypeConfigs[componentResource.value] = [];
                }
                this._runTypeConfigs[componentResource.value].push(configResource);
            }
            return types;
        }, []);
        if (componentTypes.length !== 1 && !configResource.property.requireName && !configResource.property.requireElement) {
            throw new Error('Could not run config ' + configResource.value + ' because exactly one valid component type ' +
                'was expected, while ' + componentTypes.length + ' were found in the defined types [' + allTypes + ']. ' +
                'Alternatively, the requireName and requireElement must be provided.\nFound: '
                + configResource.toString() + '\nAll available usable types: [\n'
                + Object.keys(this._componentResources).join(',\n') + '\n]');
        }
        let componentResource: Resource;
        let moduleResource: Resource;
        if (componentTypes.length) {
            componentResource = componentTypes[0];
            moduleResource = componentResource.property.module;
            if (!moduleResource) {
                throw new Error('No module was found for the component ' + componentResource.value);
            }

            this._inheritParameterValues(configResource, componentResource);
        }

        return new ComponentFactory(moduleResource, componentResource, configResource, this.overrideRequireNames, this);
    }

    /**
     * Instantiate a component based on a Resource.
     * @param configResource A config resource.
     * @param settings The settings for creating the instance.
     * @returns {any} The run instance.
     */
    instantiate(configResource: Resource, settings?: ICreationSettings): Promise<any> {
        settings = settings || {};
        // Check if this resource is required as argument in its own chain,
        // if so, return a dummy value, to avoid infinite recursion.
        const resourceBlacklist = settings.resourceBlacklist || {};
        if (resourceBlacklist[configResource.value]) {
            return Promise.resolve({});
        }

        // Before instantiating, first check if the resource is a variable
        if (configResource.isA(Util.IRI_VARIABLE)) {
            if (settings.serializations) {
                if (settings.asFunction) {
                    return Promise.resolve(`getVariableValue('${configResource.value}')`);
                } else {
                    return Promise.reject(new Error('Detected a variable during config compilation: ' + configResource.value + '. Variables are not supported, but require the -f flag to expose the compiled config as function.'));
                }
            } else {
                const value = settings.variables ? settings.variables[configResource.value] : undefined;
                if (value === undefined) {
                    return Promise.reject(new Error('Undefined variable: ' + configResource.value));
                }
                return Promise.resolve(value);
            }
        }

        if (!this._instances[configResource.value]) {
            let subBlackList: {[id: string]: boolean} = _.clone(resourceBlacklist || {});
            subBlackList[configResource.value] = true;
            this._instances[configResource.value] = this.getConfigConstructor(configResource).create(
                _.defaults({ resourceBlacklist: subBlackList }, settings));
        }
        return Promise.resolve(this._instances[configResource.value]);
    }

    /**
     * Let then given config inherit parameter values from referenced passed configs.
     * @param configResource The config
     * @param componentResource The component
     * @private
     */
    _inheritParameterValues(configResource: Resource, componentResource: Resource) {
        // Inherit parameter values from passed instances of the given types
        if (componentResource.property.parameters) {
            componentResource.properties.parameters.forEach((parameter: Resource) => {
                // Collect all owl:Restriction's
                let restrictions: Resource[] = parameter.properties.inheritValues.reduce((acc: Resource[], clazz: Resource) => {
                    if (clazz.properties.types.reduce((acc: boolean, type: Resource) => acc || type.value === Util.PREFIXES['owl'] + 'Restriction', false)) {
                        acc.push(clazz);
                    }
                    return acc;
                }, []);

                restrictions.forEach((restriction: Resource) => {
                    if (restriction.property.from) {
                        if (!restriction.property.onParameter) {
                            throw new Error('Parameters that inherit values must refer to a property: ' + NodeUtil.inspect(parameter));
                        }

                        restriction.properties.from.forEach((componentType: Resource) => {
                            if (componentType.type !== 'NamedNode') {
                                throw new Error('Parameter inheritance values must refer to component type identifiers, not literals: ' + NodeUtil.inspect(componentType));
                            }

                            let typeInstances: Resource[] = this._runTypeConfigs[componentType.value];
                            if (typeInstances) {
                                typeInstances.forEach((instance: Resource) => {
                                    restriction.properties.onParameter.forEach((parentParameter: Resource) => {
                                        // TODO: this might be a bug in the JSON-LD parser
                                        /*if (parentParameter.termType !== 'NamedNode') {
                                         throw new Error('Parameters that inherit values must refer to sub properties as URI\'s: ' + JSON.stringify(parentParameter));
                                         }*/
                                        if (instance.property[parentParameter.value]) {
                                            // Copy the parameters
                                            for (const value of instance.properties[parentParameter.value]) {
                                                configResource.properties[parentParameter.value].push(value);
                                            }

                                            // Also add the parameter to the parameter type list
                                            if (componentResource.properties.parameters.indexOf(parentParameter) < 0) {
                                                componentResource.properties.parameters.push(parentParameter);
                                            }
                                        }
                                    });
                                });
                            }
                        });
                    }
                });
            });
        }
    }

    /**
     * Set the loader to a state where it doesn't accept anymore module and component registrations.
     * This is required for post-processing the components, for actions such as parameter inheritance,
     * index creation and cleanup.
     */
    finalizeRegistration() {
        if (this._registrationFinalized) {
            throw new Error('Attempted to finalize and already finalized loader.');
        }

        // Component parameter inheritance
        for (let componentResource of _.values(this._componentResources)) {
            this._inheritParameters(componentResource, componentResource.properties.inheritValues);
            this._inheritConstructorParameters(componentResource);
        }

        // Freeze component resources
        this._componentResources = Object.freeze(this._componentResources);

        this._registrationFinalized = true;

        Util.NODE_MODULES_PACKAGE_CONTENTS = {};
    }

    _checkFinalizeRegistration() {
        if (!this._registrationFinalized) {
            this.finalizeRegistration();
        }
    }

    /**
     * Get a component config constructor based on a config URI.
     * @param configResourceUri The config resource URI.
     * @param configResourceStream A triple stream containing at least the given config.
     * @returns {Promise<T>} A promise resolving to the component constructor.
     */
    async getConfigConstructorFromStream(configResourceUri: string, configResourceStream: RDF.Stream & Readable): Promise<IComponentFactory> {
        this._checkFinalizeRegistration();
        await this.objectLoader.import(configResourceStream);

        let configResource: Resource = this.objectLoader.resources[configResourceUri];
        if (!configResource) {
            throw new Error('Could not find a component config with URI ' + configResourceUri + ' in the triple stream.');
        }
        return this.getConfigConstructor(configResource);
    }

    /**
     * Instantiate a component based on a config URI and a stream.
     * @param configResourceUri The config resource URI.
     * @param configResourceStream A triple stream containing at least the given config.
     * @param settings The settings for creating the instance.
     * @returns {Promise<T>} A promise resolving to the run instance.
     */
    async instantiateFromStream(configResourceUri: string, configResourceStream: RDF.Stream & Readable, settings?: ICreationSettings): Promise<any> {
        this._checkFinalizeRegistration();
        await this.objectLoader.import(configResourceStream);

        let configResource: Resource = this.objectLoader.resources[configResourceUri];
        if (!configResource) {
            throw new Error('Could not find a component config with URI ' + configResourceUri + ' in the triple stream.');
        }
        return this.instantiate(configResource, settings);
    }

    /**
     * Run a component config based on a config URI.
     * @param configResourceUri The config resource URI.
     * @param configResourceUrl An RDF document URL
     * @param fromPath The path to base relative paths on. This will typically be __dirname.
     *                 Default is the current running directory.
     * @returns {Promise<T>} A promise resolving to the run instance.
     */
    getConfigConstructorFromUrl(configResourceUri: string, configResourceUrl: string, fromPath?: string): Promise<IComponentFactory> {
        this._checkFinalizeRegistration();
        return Promise.all([this._getContexts(), this._getImportPaths()])
            .then(([contexts, importPaths]: {[id: string]: string}[]) => {
                return Util.getContentsFromUrlOrPath(configResourceUrl, fromPath)
                    .then((data: Readable) => this.getConfigConstructorFromStream(configResourceUri,
                      new RdfParser().parse(data, {
                          fromPath: fromPath,
                          path: configResourceUrl,
                          contexts,
                          importPaths,
                          ignoreImports: false,
                          absolutizeRelativePaths: this._properties.absolutizeRelativePaths,
                      })));
            });
    }

    /**
     * Instantiate a component based on a config URI.
     * @param configResourceUri The config resource URI.
     * @param configResourceUrl An RDF document URL
     * @param fromPath The path to base relative paths on. This will typically be __dirname.
     *                 Default is the current running directory.
     * @param settings The settings for creating the instance.
     * @returns {Promise<T>} A promise resolving to the run instance.
     */
    instantiateFromUrl(configResourceUri: string, configResourceUrl: string, fromPath?: string, settings?: ICreationSettings): Promise<any> {
        return Promise.all([this._getContexts(), this._getImportPaths()])
            .then(([contexts, importPaths]: {[id: string]: string}[]) => {
                return Util.getContentsFromUrlOrPath(configResourceUrl, fromPath)
                    .then((data: Readable) => this.instantiateFromStream(configResourceUri,
                      new RdfParser().parse(data, {
                          fromPath: fromPath,
                          path: configResourceUrl,
                          contexts,
                          importPaths,
                          ignoreImports: false,
                          absolutizeRelativePaths: this._properties.absolutizeRelativePaths,
                      }), settings));
            });
    }

    /**
     * Instantiate a component based on component URI and a set of parameters.
     * @param componentUri The URI of a component.
     * @param params A dictionary with named parameters.
     * @param settings The settings for creating the instance.
     * @returns {any} The run instance.
     */
    instantiateManually(componentUri: string, params: {[id: string]: string}, settings?: ICreationSettings): any {
        this._checkFinalizeRegistration();
        let componentResource: Resource = this._componentResources[componentUri];
        if (!componentResource) {
            throw new Error('Could not find a component for URI ' + componentUri);
        }
        let moduleResource: Resource = componentResource.property.module;
        if (!moduleResource) {
            throw new Error('No module was found for the component ' + componentResource.value);
        }
        const configResource = this.objectLoader.createCompactedResource({});
        Object.keys(params).forEach((key: string) => {
            configResource.property[key] = this.objectLoader.createCompactedResource(`"${params[key]}"`);
        });
        let constructor: ComponentFactory = new ComponentFactory(moduleResource, componentResource,
          configResource, this.overrideRequireNames, this);
        return constructor.create(settings);
    }

}

export interface LoaderProperties {
    scanGlobal?: boolean;
    absolutizeRelativePaths?: boolean;
    contexts?: {[id: string]: any};
    importPaths?: {[id: string]: string};
    mainModulePath?: string;
}
