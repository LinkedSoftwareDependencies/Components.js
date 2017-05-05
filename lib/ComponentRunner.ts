import {Stream} from "stream";
import {RdfClassLoader} from "./rdf/RdfClassLoader";
import {ComponentFactory} from "./factory/ComponentFactory";
import {Resource} from "./rdf/Resource";
import N3 = require("n3");
import Triple = N3.Triple;
import Constants = require("./Constants");
import {IComponentFactory} from "./factory/IComponentFactory";

/**
 * A runner class for component configs.
 * Modules must first be registered to this runner.
 * After that, configs can be run.
 * Components with the same URI will only be instantiated once.
 */
export class ComponentRunner {

    _componentResources: {[id: string]: Resource} = {};
    /**
     * Require overrides.
     * Require name as path, require override as value.
     */
    overrideRequireNames: {[id: string]: string} = {};

    _runTypeConfigs: {[id: string]: Resource[]} = {};
    _instances: {[id: string]: any} = {};

    /**
     * @returns {RdfClassLoader} A new RDF class loader for loading modules and components
     * @private
     */
    _newModuleLoader(): RdfClassLoader {
        let loader: RdfClassLoader = new RdfClassLoader({ captureAllProperties: true, normalizeLists: true });

        loader.bindClass('constructables', Constants.PREFIXES['lsdc'] + 'ComponentConstructable');
        loader.bindClass('instances', Constants.PREFIXES['lsdc'] + 'ComponentInstance');
        loader.bindClass('abstractConstructables', Constants.PREFIXES['lsdc'] + 'ComponentConstructableAbstract');
        loader.bindClass('modules', Constants.PREFIXES['lsdc'] + 'Module');

        loader.bindProperty('requireName', Constants.PREFIXES['npm'] + 'requireName', true);
        loader.bindProperty('requireElement', Constants.PREFIXES['npm'] + 'requireElement', true);
        loader.bindProperty('hasComponent', Constants.PREFIXES['lsdc'] + 'hasComponent');
        loader.bindProperty('hasParameter', Constants.PREFIXES['lsdc'] + 'hasParameter');
        loader.bindProperty('constructorMapping', Constants.PREFIXES['lsdc'] + 'constructorMapping', true);
        loader.bindProperty('fields', Constants.PREFIXES['lsdc'] + 'hasField');
        loader.bindProperty('elements', Constants.PREFIXES['lsdc'] + 'hasElement');
        loader.bindProperty('dynamicEntriesFrom', Constants.PREFIXES['lsdc'] + 'dynamicEntriesFrom');
        loader.bindProperty('unique', Constants.PREFIXES['lsdc'] + 'parameterUnique', true);
        loader.bindProperty('defaults', Constants.PREFIXES['lsdc'] + 'hasDefaultValue');
        loader.bindProperty('fixed', Constants.PREFIXES['lsdc'] + 'hasFixedValue');
        loader.bindProperty('k', Constants.PREFIXES['rdfs'] + 'label', true);
        loader.bindProperty('v', Constants.PREFIXES['rdf'] + 'value', true);
        loader.bindProperty('types', Constants.PREFIXES['rdf'] + 'type');

        loader.bindProperty('classes', Constants.PREFIXES['rdfs'] + 'subClassOf', false);
        loader.bindProperty('onProperty', Constants.PREFIXES['owl'] + 'onProperty', false);
        loader.bindProperty('allValuesFrom', Constants.PREFIXES['owl'] + 'allValuesFrom', false);
        loader.bindProperty('imports', Constants.PREFIXES['owl'] + 'imports', false);

        return loader;
    }

    /**
     * @returns {RdfClassLoader} A new RDF class loader for loading component configs
     * @private
     */
    _newConfigLoader(): RdfClassLoader {
        let loader: RdfClassLoader = new RdfClassLoader({ captureAllProperties: true, captureAllClasses: true });

        loader.bindClass('constructables', Constants.PREFIXES['lsdc'] + 'ComponentConstructable');
        loader.bindClass('instances', Constants.PREFIXES['lsdc'] + 'ComponentInstance');

        loader.bindProperty('requireName', Constants.PREFIXES['npm'] + 'requireName', true);
        loader.bindProperty('requireElement', Constants.PREFIXES['npm'] + 'requireElement', true);
        loader.bindProperty('arguments', Constants.PREFIXES['lsdc'] + 'arguments', true);
        loader.bindProperty('fields', Constants.PREFIXES['lsdc'] + 'hasField');
        loader.bindProperty('elements', Constants.PREFIXES['lsdc'] + 'hasElement');
        loader.bindProperty('dynamicEntriesFrom', Constants.PREFIXES['lsdc'] + 'dynamicEntriesFrom');
        loader.bindProperty('unique', Constants.PREFIXES['lsdc'] + 'parameterUnique', true);
        loader.bindProperty('k', Constants.PREFIXES['rdfs'] + 'label', true);
        loader.bindProperty('v', Constants.PREFIXES['rdf'] + 'value', true);
        loader.bindProperty('types', Constants.PREFIXES['rdf'] + 'type');

        loader.bindProperty('imports', Constants.PREFIXES['owl'] + 'imports', false);

        return loader;
    }

    /**
     * Register a new component.
     * This will ensure that component configs referring to this component as type are recognized.
     * @param componentResource A component resource.
     * @private
     */
    _registerComponentResource(componentResource: Resource) {
        this._componentResources[componentResource.value] = componentResource;
        this._inheritParameters(componentResource, (<any> componentResource).classes);
        this._inheritConstructorParameters(componentResource);
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
                if (component.hasType(Constants.PREFIXES['lsdc'] + 'ComponentConstructableAbstract')
                    || component.hasType(Constants.PREFIXES['lsdc'] + 'ComponentConstructable')) {
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
        if (componentResource.constructorMapping) {
            componentResource.constructorMapping.list.forEach((object: Resource) => {
                if (object.hasType(Constants.PREFIXES['lsdc'] + 'Object')) {
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
                if (superObject.hasType(Constants.PREFIXES['lsdc'] + 'Object')) {
                    if (superObject.fields) {
                        superObject.fields.forEach((field: Resource) => {
                            if (object.fields.indexOf(field) < 0) {
                                object.fields.push(field);
                            }
                        });
                        this._inheritParameters(object, superObject.classes);
                    }
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
    registerModuleResourcesUrl(moduleResourceUrl: string, fromPath: string): Promise<void> {
        return Constants.getContentsFromUrlOrPath(moduleResourceUrl, fromPath)
            .then((data: Stream) => this.registerModuleResourcesStream(Constants.parseRdf(data, fromPath)));
    }

    /**
     * Get a component config constructor based on a Resource.
     * @param configResource A config resource.
     * @returns The component factory.
     */
    getConfigConstructor(configResource: Resource): IComponentFactory {
        let componentTypes: Resource[] = ((<any> configResource).types || []).reduce((types: Resource[], typeUri: Resource) => {
            let componentResource: Resource = this._componentResources[typeUri.value];
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
                'was expected, while "' + componentTypes + '" were found. ' +
                'Alternatively, the requireName and requireElement must be provided.' + JSON.stringify(configResource, null, '  '));
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
     * Run a component config based on a Resource.
     * @param configResource A config resource.
     * @returns {any} The run instance.
     */
    runConfig(configResource: Resource): any {
        if (this._instances[configResource.value]) {
            return this._instances[configResource.value];
        }
        this._instances[configResource.value] = {}; // This is to avoid self-referenced invocations
        let constructor: IComponentFactory = this.getConfigConstructor(configResource);
        let instance: any = constructor.create();
        this._instances[configResource.value] = instance;
        return instance;
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
                    if (clazz.types.reduce((acc: boolean, type: Resource) => acc || type.value === Constants.PREFIXES['owl'] + 'Restriction', false)) {
                        acc.push(clazz);
                    }
                    return acc;
                }, []);

                restrictions.forEach((restriction: any) => {
                    if (restriction.allValuesFrom) {
                        if (!restriction.onProperty) {
                            throw new Error('Parameters that inherit values must refer to a property: ' + JSON.stringify(parameter));
                        }

                        restriction.allValuesFrom.forEach((componentType: Resource) => {
                            if (componentType.termType !== 'NamedNode') {
                                throw new Error('Parameter inheritance values must refer to component type identifiers, not literals: ' + JSON.stringify(componentType));
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
     * Get a component config constructor based on a config URI.
     * @param configResourceUri The config resource URI.
     * @param configResourceStream A triple stream containing at least the given config.
     * @returns {Promise<T>} A promise resolving to the component constructor.
     */
    getConfigConstructorStream(configResourceUri: string, configResourceStream: Stream): Promise<IComponentFactory> {
        return new Promise((resolve, reject) => {
            let loader: RdfClassLoader = this._newConfigLoader();
            configResourceStream
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
                    }
                    resolve(constructor);
                })
                .on('error', reject);
        });
    }

    /**
     * Run a component config based on a config URI.
     * @param configResourceUri The config resource URI.
     * @param configResourceStream A triple stream containing at least the given config.
     * @returns {Promise<T>} A promise resolving to the run instance.
     */
    runConfigStream(configResourceUri: string, configResourceStream: Stream): Promise<any> {
        return new Promise((resolve, reject) => {
            let loader: RdfClassLoader = this._newConfigLoader();
            configResourceStream
                .pipe(loader)
                .on('finish', () => {
                    let configResource: Resource = loader.resources[configResourceUri];
                    if (!configResource) {
                        throw new Error('Could not find a component config with URI '
                            + configResourceUri + ' in the triple stream.');
                    }
                    let instance: any;
                    try {
                        instance = this.runConfig(configResource);
                    } catch (e) {
                        reject(e);
                    }
                    resolve(instance);
                })
                .on('error', reject);
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
    getConfigConstructorUrl(configResourceUri: string, configResourceUrl: string, fromPath?: string): Promise<IComponentFactory> {
        return Constants.getContentsFromUrlOrPath(configResourceUrl, fromPath)
            .then((data: Stream) => this.getConfigConstructorStream(configResourceUri, Constants.parseRdf(data, fromPath)));
    }

    /**
     * Run a component config based on a config URI.
     * @param configResourceUri The config resource URI.
     * @param configResourceUrl An RDF document URL
     * @param fromPath The path to base relative paths on. This will typically be __dirname.
     *                 Default is the current running directory.
     * @returns {Promise<T>} A promise resolving to the run instance.
     */
    runConfigUrl(configResourceUri: string, configResourceUrl: string, fromPath?: string): Promise<any> {
        return Constants.getContentsFromUrlOrPath(configResourceUrl, fromPath)
            .then((data: Stream) => this.runConfigStream(configResourceUri, Constants.parseRdf(data, fromPath)));
    }

    /**
     * Run a component config based on component URI and a set of parameters.
     * @param componentUri The URI of a component.
     * @param params A dictionary with named parameters.
     * @returns {any} The run instance.
     */
    runManually(componentUri: string, params: {[id: string]: string}): any {
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