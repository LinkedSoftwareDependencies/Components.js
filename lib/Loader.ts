import {Stream} from "stream";
import {RdfClassLoader} from "./rdf/RdfClassLoader";
import {ComponentFactory} from "./factory/ComponentFactory";
import {Resource} from "./rdf/Resource";
import N3 = require("n3");
import _ = require("lodash");
import Triple = N3.Triple;
import Util = require("./Util");
import {IComponentFactory} from "./factory/IComponentFactory";
import NodeUtil = require('util');

/**
 * A loader class for component configs.
 * Modules must first be registered to this loader.
 * After that, components can be instantiated.
 * Components with the same URI will only be instantiated once.
 */
export class Loader {

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

    /**
     * Shared mapping from resource URI to resource instance for al RDF class loaders.
     */
    resources: {[id: string]: Resource} = {};

    constructor(properties?: LoaderProperties) {
        this._properties = properties || {};
        if (!('absolutizeRelativePaths' in this._properties)) {
            this._properties.absolutizeRelativePaths = true;
        }
        if (!this._properties.contexts) {
            this._properties.contexts = <{[id: string]: string}> <any> Util.getAvailableContexts(this._properties.scanGlobal);
        }
    }

    _getContexts(): Promise<{[id: string]: string}> {
        return Promise.resolve(this._properties.contexts).then((contexts) => {
            this._properties.contexts = contexts;
            return contexts;
        })
    }

    /**
     * @returns {RdfClassLoader} A new RDF class loader for loading modules and components
     * @private
     */
    _newModuleLoader(): RdfClassLoader {
        let loader: RdfClassLoader = new RdfClassLoader({ captureAllProperties: true, normalizeLists: true });
        loader.resources = this.resources;

        loader.bindClass('constructables', Util.PREFIXES['oo'] + 'Class');
        loader.bindClass('instances', Util.PREFIXES['oo'] + 'Instance');
        loader.bindClass('abstractConstructables', Util.PREFIXES['oo'] + 'AbstractClass');
        loader.bindClass('modules', Util.PREFIXES['oo'] + 'Module');

        loader.bindProperty('requireName', Util.PREFIXES['doap'] + 'name', true);
        loader.bindProperty('requireElement', Util.PREFIXES['oo'] + 'componentPath', true);
        loader.bindProperty('hasComponent', Util.PREFIXES['oo'] + 'component');
        loader.bindProperty('hasParameter', Util.PREFIXES['oo'] + 'parameter');
        loader.bindProperty('constructorArguments', Util.PREFIXES['oo'] + 'constructorArguments', true);
        loader.bindProperty('fields', Util.PREFIXES['om'] + 'field');
        loader.bindProperty('elements', Util.PREFIXES['om'] + 'elements', true);
        loader.bindProperty('collectEntriesFrom', Util.PREFIXES['om'] + 'collectsEntriesFrom');
        loader.bindProperty('unique', Util.PREFIXES['oo'] + 'uniqueValue', true);
        loader.bindProperty('defaults', Util.PREFIXES['oo'] + 'defaultValue');
        loader.bindProperty('defaultScoped', Util.PREFIXES['oo'] + 'defaultScoped');
        loader.bindProperty('scope', Util.PREFIXES['oo'] + 'defaultScope');
        loader.bindProperty('scopedValue', Util.PREFIXES['oo'] + 'defaultScopedValue');
        loader.bindProperty('fixed', Util.PREFIXES['oo'] + 'hasFixedValue');
        loader.bindProperty('k', Util.PREFIXES['om'] + 'fieldName', true);
        loader.bindProperty('v', Util.PREFIXES['om'] + 'fieldValue', true);
        loader.bindProperty('types', Util.PREFIXES['rdf'] + 'type');

        loader.bindProperty('classes', Util.PREFIXES['rdfs'] + 'subClassOf', false);
        loader.bindProperty('onProperty', Util.PREFIXES['owl'] + 'onProperty', false);
        loader.bindProperty('allValuesFrom', Util.PREFIXES['owl'] + 'allValuesFrom', false);
        loader.bindProperty('imports', Util.PREFIXES['owl'] + 'imports', false);
        loader.bindProperty('range', Util.PREFIXES['rdfs'] + 'range', true);

        return loader;
    }

    /**
     * @returns {RdfClassLoader} A new RDF class loader for loading component configs
     * @private
     */
    _newConfigLoader(): RdfClassLoader {
        let loader: RdfClassLoader = new RdfClassLoader({ captureAllProperties: true, captureAllClasses: true });
        loader.resources = this.resources;

        loader.bindClass('constructables', Util.PREFIXES['oo'] + 'Class');
        loader.bindClass('instances', Util.PREFIXES['oo'] + 'ComponentInstance');

        loader.bindProperty('requireName', Util.PREFIXES['doap'] + 'name', true);
        loader.bindProperty('requireElement', Util.PREFIXES['oo'] + 'componentPath', true);
        loader.bindProperty('arguments', Util.PREFIXES['oo'] + 'arguments', true);
        loader.bindProperty('fields', Util.PREFIXES['om'] + 'field');
        loader.bindProperty('elements', Util.PREFIXES['om'] + 'elements', true);
        loader.bindProperty('collectEntriesFrom', Util.PREFIXES['om'] + 'collectsEntriesFrom');
        loader.bindProperty('unique', Util.PREFIXES['oo'] + 'uniqueValue', true);
        loader.bindProperty('k', Util.PREFIXES['om'] + 'fieldName', true);
        loader.bindProperty('v', Util.PREFIXES['om'] + 'fieldValue', true);
        loader.bindProperty('types', Util.PREFIXES['rdf'] + 'type');

        loader.bindProperty('imports', Util.PREFIXES['owl'] + 'imports', false);

        return loader;
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
        return componentResource.hasType(Util.PREFIXES['oo'] + 'AbstractClass')
            || componentResource.hasType(Util.PREFIXES['oo'] + 'Class');
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
     * @param classes The component classes to inherit from.
     * @private
     */
    _inheritParameters(componentResource: any, classes?: Resource[]) {
        if (classes) {
            if (!componentResource.hasParameter) {
                componentResource.hasParameter = [];
            }
            classes.forEach((component: any) => {
                this._requireValidComponent(component, componentResource);
                if (this._isValidComponent(component)) {
                    if (component.hasParameter) {
                        component.hasParameter.forEach((parameter: Resource) => {
                            if (componentResource.hasParameter.indexOf(parameter) < 0) {
                                componentResource.hasParameter.push(parameter);
                            }
                        });
                        this._inheritParameters(componentResource, component.classes);
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
    _inheritConstructorParameters(componentResource: any) {
        if (componentResource.constructorArguments) {
            componentResource.constructorArguments.list.forEach((object: Resource) => {
                if ((<any> object).classes) {
                    this._inheritObjectFields(object, (<any> object).classes);
                }
            });
        }
    }

    /**
     * Let the given object inherit the given fields from the given component(s) if applicable.
     * @param object The object resource
     * @param classes The objects to inherit from.
     * @private
     */
    _inheritObjectFields(object: any, classes?: Resource[]) {
        if (classes) {
            if (!object.fields) {
                object.fields = [];
            }
            classes.forEach((superObject: any) => {
                if (superObject.fields) {
                    superObject.fields.forEach((field: Resource) => {
                        if (object.fields.indexOf(field) < 0) {
                            object.fields.push(field);
                        }
                    });
                } else if (!superObject.hasType(Util.PREFIXES['oo'] + 'Object')) {
                    throw new Error('The referenced constructor mappings object ' + superObject.value
                        + ' from ' + object.value + ' is not valid, i.e., it doesn\'t contain mapping fields '
                        + 'or has the oo:Object type. '
                        + 'It possibly is incorrectly referenced or not defined at all.');
                }
                if (superObject.classes) {
                    this._inheritObjectFields(object, superObject.classes);
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
        if ((<any> moduleResource).hasComponent) {
            (<any> moduleResource).hasComponent.forEach((component: any) => {
                component.module = moduleResource;
                this._registerComponentResource(component);
            });
        } else if (!(<any> moduleResource).imports) {
            throw new Error('Tried to register the module ' + moduleResource.value + ' that has no components.');
        }
    }

    /**
     * Register new modules and their components.
     * This will ensure that component configs referring to components as types of these modules are recognized.
     * @param moduleResourceStream A triple stream containing modules.
     * @returns {Promise<T>} A promise that resolves once loading has finished.
     */
    registerModuleResourcesStream(moduleResourceStream: Stream): Promise<void> {
        return new Promise<void>((resolve: any, reject: any) => {
            let loader: RdfClassLoader = this._newModuleLoader();
            moduleResourceStream
                .on('error', reject)
                .pipe(loader)
                .on('finish', () => {
                    (loader.typedResources.modules || []).forEach((module) => this.registerModuleResource(module));
                    resolve();
                })
                .on('error', reject);
        });
    }

    /**
     * Register new modules and their components.
     * This will ensure that component configs referring to components as types of these modules are recognized.
     * @param moduleResourceUrl An RDF document URL
     * @param fromPath The path to base relative paths on. This will typically be __dirname.
     * @returns {Promise<T>} A promise that resolves once loading has finished.
     */
    registerModuleResourcesUrl(moduleResourceUrl: string, fromPath?: string): Promise<void> {
        return this._getContexts().then((contexts) => {
            return Util.getContentsFromUrlOrPath(moduleResourceUrl, fromPath)
                .then((data: Stream) => this.registerModuleResourcesStream(Util.parseRdf(data, moduleResourceUrl,
                    fromPath, false, this._properties.absolutizeRelativePaths, contexts)));
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
        let componentTypes: Resource[] = ((<any> configResource).types || []).reduce((types: Resource[], typeUri: Resource) => {
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
        if (componentTypes.length !== 1 && !(<any> configResource).requireName && !(<any> configResource).requireElement) {
            throw new Error('Could not run config ' + configResource.value + ' because exactly one valid component type ' +
                'was expected, while ' + componentTypes.length + ' were found in the defined types [' + allTypes + ']. ' +
                'Alternatively, the requireName and requireElement must be provided.\nFound: '
                + configResource.toString() + '\nAll available usable types: [\n'
                + Object.keys(this._componentResources).join(',\n') + '\n]');
        }
        let componentResource: any;
        let moduleResource: any;
        if (componentTypes.length) {
            componentResource = componentTypes[0];
            moduleResource = componentResource.module;
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
     * @param resourceBlacklist The config resource id's to ignore in parameters. Used for avoiding infinite recursion.
     * @returns {any} The run instance.
     */
    instantiate(configResource: Resource, resourceBlacklist?: {[id: string]: boolean}): Promise<any> {
        // Check if this resource is required as argument in its own chain,
        // if so, return a dummy value, to avoid infinite recursion.
        resourceBlacklist = resourceBlacklist || {};
        if (resourceBlacklist[configResource.value]) {
            return Promise.resolve({});
        }

        if (!this._instances[configResource.value]) {
            let subBlackList: {[id: string]: boolean} = _.clone(resourceBlacklist || {});
            subBlackList[configResource.value] = true;
            this._instances[configResource.value] = this.getConfigConstructor(configResource).create(subBlackList);
        }
        return Promise.resolve(this._instances[configResource.value]);
    }

    /**
     * Let then given config inherit parameter values from referenced passed configs.
     * @param configResource The config
     * @param componentResource The component
     * @private
     */
    _inheritParameterValues(configResource: Resource, componentResource: any) {
        // Inherit parameter values from passed instances of the given types
        if (componentResource.hasParameter) {
            componentResource.hasParameter.forEach((parameter: any) => {
                // Collect all owl:Restriction's
                let restrictions: Resource[] = (parameter.classes || []).reduce((acc: Resource[], clazz: any) => {
                    if (clazz.types.reduce((acc: boolean, type: Resource) => acc || type.value === Util.PREFIXES['owl'] + 'Restriction', false)) {
                        acc.push(clazz);
                    }
                    return acc;
                }, []);

                restrictions.forEach((restriction: any) => {
                    if (restriction.allValuesFrom) {
                        if (!restriction.onProperty) {
                            throw new Error('Parameters that inherit values must refer to a property: ' + NodeUtil.inspect(parameter));
                        }

                        restriction.allValuesFrom.forEach((componentType: Resource) => {
                            if (componentType.termType !== 'NamedNode') {
                                throw new Error('Parameter inheritance values must refer to component type identifiers, not literals: ' + NodeUtil.inspect(componentType));
                            }

                            let typeInstances: Resource[] = this._runTypeConfigs[componentType.value];
                            if (typeInstances) {
                                typeInstances.forEach((instance: any) => {
                                    restriction.onProperty.forEach((parentParameter: Resource) => {
                                        // TODO: this might be a bug in the JSON-LD parser
                                        /*if (parentParameter.termType !== 'NamedNode') {
                                         throw new Error('Parameters that inherit values must refer to sub properties as URI\'s: ' + JSON.stringify(parentParameter));
                                         }*/
                                        if (instance[parentParameter.value]) {
                                            // Copy the parameter
                                            (<any> configResource)[parentParameter.value] = instance[parentParameter.value];

                                            // Also add the parameter to the parameter type list
                                            if (componentResource.hasParameter.indexOf(parentParameter) < 0) {
                                                componentResource.hasParameter.push(parentParameter);
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
            this._inheritParameters(componentResource, (<any> componentResource).classes);
            this._inheritConstructorParameters(componentResource);
        }

        // Freeze component resources
        this._componentResources = Object.freeze(this._componentResources);

        this._registrationFinalized = true;
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
    getConfigConstructorFromStream(configResourceUri: string, configResourceStream: Stream): Promise<IComponentFactory> {
        this._checkFinalizeRegistration();
        return new Promise((resolve, reject) => {
            let loader: RdfClassLoader = this._newConfigLoader();
            configResourceStream
                .on('error', reject)
                .pipe(loader)
                .on('finish', () => {
                    let configResource: Resource = loader.resources[configResourceUri];
                    if (!configResource) {
                        throw new Error('Could not find a component config with URI '
                            + configResourceUri + ' in the triple stream.');
                    }
                    let constructor: IComponentFactory;
                    try {
                        constructor = this.getConfigConstructor(configResource);
                    } catch (e) {
                        reject(e);
                        return;
                    }
                    resolve(constructor);
                });
        });
    }

    /**
     * Instantiate a component based on a config URI and a stream.
     * @param configResourceUri The config resource URI.
     * @param configResourceStream A triple stream containing at least the given config.
     * @returns {Promise<T>} A promise resolving to the run instance.
     */
    instantiateFromStream(configResourceUri: string, configResourceStream: Stream): Promise<any> {
        this._checkFinalizeRegistration();
        return new Promise((resolve, reject) => {
            let loader: RdfClassLoader = this._newConfigLoader();
            configResourceStream
                .on('error', reject)
                .pipe(loader)
                .on('finish', () => {
                    let configResource: Resource = loader.resources[configResourceUri];
                    if (!configResource) {
                        throw new Error('Could not find a component config with URI '
                            + configResourceUri + ' in the triple stream.');
                    }
                    let instance: any;
                    try {
                        instance = this.instantiate(configResource);
                    } catch (e) {
                        reject(e);
                        return;
                    }
                    resolve(instance);
                });
        });
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
        return this._getContexts().then((contexts) => {
            return Util.getContentsFromUrlOrPath(configResourceUrl, fromPath)
                .then((data: Stream) => this.getConfigConstructorFromStream(configResourceUri, Util.parseRdf(data,
                    configResourceUrl, fromPath, false, this._properties.absolutizeRelativePaths, contexts)));
        });
    }

    /**
     * Instantiate a component based on a config URI.
     * @param configResourceUri The config resource URI.
     * @param configResourceUrl An RDF document URL
     * @param fromPath The path to base relative paths on. This will typically be __dirname.
     *                 Default is the current running directory.
     * @returns {Promise<T>} A promise resolving to the run instance.
     */
    instantiateFromUrl(configResourceUri: string, configResourceUrl: string, fromPath?: string): Promise<any> {
        return this._getContexts().then((contexts) => {
            return Util.getContentsFromUrlOrPath(configResourceUrl, fromPath)
                .then((data: Stream) => this.instantiateFromStream(configResourceUri, Util.parseRdf(data,
                    configResourceUrl, fromPath, false, this._properties.absolutizeRelativePaths, contexts)));
        });
    }

    /**
     * Instantiate a component based on component URI and a set of parameters.
     * @param componentUri The URI of a component.
     * @param params A dictionary with named parameters.
     * @returns {any} The run instance.
     */
    instantiateManually(componentUri: string, params: {[id: string]: string}): any {
        this._checkFinalizeRegistration();
        let componentResource: Resource = this._componentResources[componentUri];
        if (!componentResource) {
            throw new Error('Could not find a component for URI ' + componentUri);
        }
        let moduleResource: any = (<any> componentResource).module;
        if (!moduleResource) {
            throw new Error('No module was found for the component ' + componentResource.value);
        }
        let transformedParams: {[id: string]: Resource[]} = {};
        Object.keys(params).forEach((key: string) => {
            transformedParams[key] = [ Resource.newString(params[key]) ];
        });
        let constructor: ComponentFactory = new ComponentFactory(moduleResource, componentResource,
            new Resource(null, transformedParams), this.overrideRequireNames);
        return constructor.create();
    }

}

export interface LoaderProperties {
    scanGlobal?: boolean;
    absolutizeRelativePaths?: boolean;
    contexts?: {[id: string]: string};
}