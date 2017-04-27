import {Stream} from "stream";
import N3 = require("n3");
import Triple = N3.Triple;
import {RdfClassLoader} from "./rdf/RdfClassLoader";
import {ComponentFactory} from "./factory/ComponentFactory";
import {Resource} from "./rdf/Resource";
import Constants = require("./Constants");

/**
 * A runner class for component configs.
 * Modules must first be registered to this runner.
 * After that, configs can be run.
 */
export class ComponentRunner {

    _componentResources: {[id: string]: Resource} = {};
    /**
     * Require overrides.
     * Require name as path, require override as value.
     */
    overrideRequireNames: {[id: string]: string} = {};

    /**
     * @returns {RdfClassLoader} A new RDF class loader for loading modules and components
     * @private
     */
    _newModuleLoader(): RdfClassLoader {
        let loader: RdfClassLoader = new RdfClassLoader();

        loader.bindClass('constructables', Constants.PREFIXES['lsdc'] + 'ComponentConstructable');
        loader.bindClass('instances', Constants.PREFIXES['lsdc'] + 'ComponentInstance');
        loader.bindClass('modules', Constants.PREFIXES['lsdc'] + 'Module');

        loader.bindProperty('requireName', Constants.PREFIXES['npm'] + 'requireName', true);
        loader.bindProperty('requireElement', Constants.PREFIXES['npm'] + 'requireElement', true);
        loader.bindProperty('hasComponent', Constants.PREFIXES['lsdc'] + 'hasComponent');
        loader.bindProperty('hasParameter', Constants.PREFIXES['lsdc'] + 'hasParameter');
        loader.bindProperty('constructorMapping', Constants.PREFIXES['lsdc'] + 'constructorMapping', true);
        loader.bindProperty('fields', Constants.PREFIXES['lsdc'] + 'hasField');
        loader.bindProperty('dynamicEntriesFrom', Constants.PREFIXES['lsdc'] + 'dynamicEntriesFrom');
        loader.bindProperty('unique', Constants.PREFIXES['lsdc'] + 'parameterUnique', true);
        loader.bindProperty('k', Constants.PREFIXES['rdfs'] + 'label', true);
        loader.bindProperty('v', Constants.PREFIXES['rdf'] + 'value', true);
        loader.bindProperty('types', Constants.PREFIXES['rdf'] + 'type');

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
        loader.bindProperty('dynamicEntriesFrom', Constants.PREFIXES['lsdc'] + 'dynamicEntriesFrom');
        loader.bindProperty('unique', Constants.PREFIXES['lsdc'] + 'parameterUnique', true);
        loader.bindProperty('k', Constants.PREFIXES['rdfs'] + 'label', true);
        loader.bindProperty('v', Constants.PREFIXES['rdf'] + 'value', true);
        loader.bindProperty('types', Constants.PREFIXES['rdf'] + 'type');

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
        } else {
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
        return new Promise<void>((resolve, reject) => {
            let loader: RdfClassLoader = this._newModuleLoader();
            moduleResourceStream
                .pipe(loader)
                .on('finish', () => {
                    loader.typedResources.modules.forEach((module) => this.registerModuleResource(module));
                    resolve();
                })
                .on('error', reject);
        });
    }

    /**
     * Run a component config based on a Resource.
     * @param configResource A config resource.
     * @returns {any} The run instance.
     */
    runConfig(configResource: Resource): any {
        let componentTypes: Resource[] = ((<any> configResource).types || []).reduce((types: Resource[], typeUri: Resource) => {
            let componentResource: Resource = this._componentResources[typeUri.value];
            if (componentResource) {
                types.push(componentResource);
            }
            return types;
        }, []);
        if (componentTypes.length !== 1) {
            throw new Error('Could not run config ' + configResource.value + ' because exactly one component type ' +
                'was expected, while "' + componentTypes + '" were found.');
        }
        let componentResource: any = componentTypes[0];
        let moduleResource: any = componentResource.module;
        if (!moduleResource) {
            throw new Error('No module was found for the component ' + componentResource.value);
        }

        let constructor: ComponentFactory = new ComponentFactory(moduleResource, componentResource, configResource,
            this.overrideRequireNames);
        return constructor.create();
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