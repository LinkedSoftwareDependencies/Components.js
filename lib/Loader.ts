import * as fs from 'fs';
import type { Readable } from 'stream';
import type * as RDF from 'rdf-js';
import type { Resource } from 'rdf-object';
import { RdfObjectLoader } from 'rdf-object';
import type { Logger } from 'winston';
import { createLogger, format, transports } from 'winston';
import { ComponentFactory } from './factory/ComponentFactory';
import type { IComponentFactory, ICreationSettings, ICreationSettingsInner } from './factory/IComponentFactory';
import type { LogLevel } from './LogLevel';
import type { IModuleState } from './ModuleStateBuilder';
import { ModuleStateBuilder } from './ModuleStateBuilder';
import { RdfParser } from './rdf/RdfParser';
import Util = require('./Util');
import { resourceIdToString, resourceToString } from './Util';

/**
 * A loader class for component configs.
 * Modules must first be registered to this loader.
 * After that, components can be instantiated.
 * Components with the same URI will only be instantiated once.
 */
export class Loader {
  private readonly absolutizeRelativePaths: boolean;
  private readonly mainModulePath?: string;
  private readonly dumpErrorState: boolean;
  private readonly logger?: Logger;
  public readonly objectLoader: RdfObjectLoader;

  public componentResources: Record<string, Resource> = {};
  /**
   * Require overrides.
   * Require name as path, require override as value.
   */
  protected readonly overrideRequireNames: Record<string, string> = {};

  protected moduleState: IModuleState | undefined;
  protected readonly runTypeConfigs: Record<string, Resource[]> = {};
  protected readonly instances: Record<string, any> = {};
  protected registrationFinalized = false;
  protected generatedErrorLog = false;

  public constructor(options: ILoaderProperties = {}) {
    this.objectLoader = new RdfObjectLoader({
      context: JSON.parse(fs.readFileSync(`${__dirname}/../components/context.jsonld`, 'utf8')),
    });
    this.mainModulePath = options.mainModulePath;
    this.absolutizeRelativePaths = 'absolutizeRelativePaths' in options ?
      Boolean(options.absolutizeRelativePaths) :
      true;
    this.dumpErrorState = Boolean(options.dumpErrorState);
    if (options.logLevel) {
      this.logger = createLogger({
        level: options.logLevel,
        format: format.combine(
          format.label({ label: 'Components.js' }),
          format.colorize(),
          format.timestamp(),
          format.printf(({ level: levelInner, message, label: labelInner, timestamp }: Record<string, any>): string =>
            `${timestamp} [${labelInner}] ${levelInner}: ${message}`),
        ),
        transports: [ new transports.Console() ],
      });
    }
  }

  public async getModuleState(): Promise<IModuleState> {
    if (!this.moduleState) {
      try {
        this.log('info', `Initiating component discovery from ${this.mainModulePath || 'the current working directory'}`);
        this.moduleState = await new ModuleStateBuilder().buildModuleState(require, this.mainModulePath);
        this.log('info', `Discovered ${Object.keys(this.moduleState.componentModules).length} component packages within ${this.moduleState.nodeModulePaths.length} packages`);
      } catch (error: unknown) {
        throw this.generateErrorLog(error);
      }
    }
    return this.moduleState;
  }

  /**
   * Register a new component.
   * This will ensure that component configs referring to this component as type are recognized.
   * @param componentResource A component resource.
   */
  public registerComponentResource(componentResource: Resource): void {
    try {
      if (this.registrationFinalized) {
        throw new Error(`Tried registering a component ${resourceIdToString(componentResource, this.objectLoader)} after the loader has been finalized.`);
      }
      this._requireValidComponent(componentResource);
      this.componentResources[componentResource.value] = componentResource;
    } catch (error: unknown) {
      throw this.generateErrorLog(error);
    }
  }

  /**
   * Check if the given resource is a valid component.
   * @param componentResource A resource.
   * @returns {boolean} If the resource is a valid component.
   */
  public _isValidComponent(componentResource: Resource): boolean {
    return componentResource.isA(Util.IRI_ABSTRACT_CLASS) ||
            componentResource.isA(Util.IRI_CLASS) ||
            componentResource.isA(Util.IRI_COMPONENT_INSTANCE);
  }

  /**
   * Require that the given resource is a valid component,
   * otherwise and error is thrown.
   * @param componentResource A resource.
   * @param referencingComponent The optional component referencing the given component.
   */
  public _requireValidComponent(componentResource: Resource, referencingComponent?: Resource): void {
    if (!this._isValidComponent(componentResource)) {
      throw new Error(`The referenced resource ${resourceIdToString(componentResource, this.objectLoader)} is not a valid ` +
                `component resource, either it is not defined or incorrectly referenced${
                  referencingComponent ? ` by ${resourceIdToString(referencingComponent, this.objectLoader)}.` : '.'}`);
    }
  }

  /**
   * Let the given component inherit parameters from the given component(s) if applicable.
   * @param componentResource The component resource
   * @param inheritValues The component inheritValues to inherit from.
   */
  public inheritParameters(componentResource: Resource, inheritValues?: Resource[]): void {
    if (inheritValues) {
      for (const component of inheritValues) {
        this._requireValidComponent(component, componentResource);
        if (this._isValidComponent(component)) {
          if (component.property.parameters) {
            for (const parameter of component.properties.parameters) {
              if (!componentResource.properties.parameters.includes(parameter)) {
                componentResource.properties.parameters.push(parameter);
              }
            }
            this.inheritParameters(componentResource, component.properties.inheritValues);
          }
        }
      }
    }
  }

  /**
   * Let the given component inherit constructor mappings from the given component(s) if applicable.
   * @param componentResource The component resource
   */
  public inheritConstructorParameters(componentResource: Resource): void {
    if (componentResource.property.constructorArguments) {
      if (!componentResource.property.constructorArguments.list) {
        throw new Error(`Detected invalid constructor arguments for component "${resourceIdToString(componentResource, this.objectLoader)}": arguments are not an RDF list.`);
      }
      for (const object of componentResource.property.constructorArguments.list) {
        if (object.property.inheritValues) {
          this.inheritObjectFields(object, object.properties.inheritValues);
        }
      }
    }
  }

  /**
   * Let the given object inherit the given fields from the given component(s) if applicable.
   * @param object The object resource
   * @param inheritValues The objects to inherit from.
   */
  public inheritObjectFields(object: Resource, inheritValues?: Resource[]): void {
    if (inheritValues) {
      for (const superObject of inheritValues) {
        if (superObject.property.fields) {
          for (const field of superObject.properties.fields) {
            if (!object.properties.fields.includes(field)) {
              object.properties.fields.push(field);
            }
          }
        } else if (!superObject.isA(Util.DF.namedNode(`${Util.PREFIXES.om}ObjectMapping`)) && !superObject.property.inheritValues && !superObject.property.onParameter) {
          throw new Error(`The referenced constructor mappings object ${resourceIdToString(superObject, this.objectLoader)
          } from ${resourceIdToString(object, this.objectLoader)} is not valid, i.e., it doesn't contain mapping fields ` +
            `, has the om:ObjectMapping type or has a superclass. ` +
            `It possibly is incorrectly referenced or not defined at all.`);
        }
        if (superObject.property.inheritValues) {
          this.inheritObjectFields(object, superObject.properties.inheritValues);
        }
      }
    }
  }

  /**
   * Register a new module and its components.
   * This will ensure that component configs referring to components as types of this module are recognized.
   * @param moduleResource A module resource.
   */
  public registerModuleResource(moduleResource: Resource): void {
    try {
      if (this.registrationFinalized) {
        throw new Error(`Tried registering a module ${resourceIdToString(moduleResource, this.objectLoader)} after the loader has been finalized.`);
      }
      if (moduleResource.property.components) {
        for (const component of moduleResource.properties.components) {
          component.property.module = moduleResource;
          this.registerComponentResource(component);
        }
      } else if (!moduleResource.property.imports) {
        throw new Error(`Tried to register the module ${resourceIdToString(moduleResource, this.objectLoader)} that has no components.`);
      }
    } catch (error: unknown) {
      throw this.generateErrorLog(error);
    }
  }

  /**
   * Register new modules and their components.
   * This will ensure that component configs referring to components as types of these modules are recognized.
   * @param moduleResourceStream A triple stream containing modules.
   * @returns {Promise<T>} A promise that resolves once loading has finished.
   */
  public async registerModuleResourcesStream(moduleResourceStream: RDF.Stream & Readable): Promise<void> {
    try {
      await this.objectLoader.import(moduleResourceStream);
    } catch (error: unknown) {
      throw this.generateErrorLog(error);
    }
  }

  /**
   * Register new modules and their components.
   * This will ensure that component configs referring to components as types of these modules are recognized.
   * @param moduleResourceUrl An RDF document URL
   * @param fromPath The path to base relative paths on. This will typically be __dirname.
   * @returns {Promise<T>} A promise that resolves once loading has finished.
   */
  public async registerModuleResourcesUrl(moduleResourceUrl: string, fromPath?: string): Promise<void> {
    try {
      const state = await this.getModuleState();
      const data = await Util.getContentsFromUrlOrPath(moduleResourceUrl, fromPath);
      return this.registerModuleResourcesStream(new RdfParser().parse(data, {
        fromPath,
        path: moduleResourceUrl,
        contexts: state.contexts,
        importPaths: state.importPaths,
        ignoreImports: false,
        absolutizeRelativePaths: this.absolutizeRelativePaths,
      }));
    } catch (error: unknown) {
      throw this.generateErrorLog(error);
    }
  }

  /**
   * Register all reachable modules and their components.
   * This will interpret the package.json from the main module and all its dependencies for discovering modules.
   * This will ensure that component configs referring to components as types of these modules are recognized.
   * @returns {Promise<T>} A promise that resolves once loading has finished.
   */
  public async registerAvailableModuleResources(): Promise<void> {
    const state = await this.getModuleState();
    await Promise.all(Object.values(state.componentModules)
      .map((moduleResourceUrl: string) => this.registerModuleResourcesUrl(moduleResourceUrl)));
  }

  /**
   * Get a component config constructor based on a Resource.
   * @param configResource A config resource.
   * @returns The component factory.
   */
  public getConfigConstructor(configResource: Resource): IComponentFactory {
    try {
      const allTypes: string[] = [];
      const componentTypes: Resource[] = configResource.properties.types
        .reduce((types: Resource[], typeUri: Resource) => {
          const componentResource: Resource = this.componentResources[typeUri.value];
          allTypes.push(typeUri.value);
          if (componentResource) {
            types.push(componentResource);
            if (!this.runTypeConfigs[componentResource.value]) {
              this.runTypeConfigs[componentResource.value] = [];
            }
            this.runTypeConfigs[componentResource.value].push(configResource);
          }
          return types;
        }, []);
      if (componentTypes.length !== 1 &&
        !configResource.property.requireName &&
        !configResource.property.requireElement) {
        throw new Error(`Could not run config ${resourceIdToString(configResource, this.objectLoader)} because exactly one valid component type ` +
          `was expected, while ${componentTypes.length} were found in the defined types [${allTypes}]. ` +
          `Alternatively, the requireName and requireElement must be provided.\nFound: ${
            resourceToString(configResource)}\nAll available usable types: [\n${
            Object.keys(this.componentResources).join(',\n')}\n]`);
      }
      let componentResource: Resource | undefined;
      let moduleResource: Resource | undefined;
      if (componentTypes.length > 0) {
        componentResource = componentTypes[0];
        moduleResource = componentResource.property.module;
        if (!moduleResource) {
          throw new Error(`No module was found for the component ${resourceIdToString(componentResource, this.objectLoader)}`);
        }

        this.inheritParameterValues(configResource, componentResource);
      }

      return new ComponentFactory(moduleResource, componentResource, configResource, this.overrideRequireNames, this);
    } catch (error: unknown) {
      throw this.generateErrorLog(error);
    }
  }

  /**
   * Instantiate a component based on a Resource.
   * @param configResource A config resource.
   * @param settings The settings for creating the instance.
   * @returns {any} The run instance.
   */
  public async instantiate(configResource: Resource, settings: ICreationSettings = {}): Promise<any> {
    try {
      const settingsInner: ICreationSettingsInner = { ...settings, moduleState: await this.getModuleState() };
      // Check if this resource is required as argument in its own chain,
      // if so, return a dummy value, to avoid infinite recursion.
      const resourceBlacklist = settingsInner.resourceBlacklist || {};
      if (resourceBlacklist[configResource.value]) {
        return {};
      }

      // Before instantiating, first check if the resource is a variable
      if (configResource.isA(Util.IRI_VARIABLE)) {
        if (settingsInner.serializations) {
          if (settingsInner.asFunction) {
            return `getVariableValue('${configResource.value}')`;
          }
          throw new Error(`Detected a variable during config compilation: ${resourceIdToString(configResource, this.objectLoader)}. Variables are not supported, but require the -f flag to expose the compiled config as function.`);
        } else {
          const value = settingsInner.variables ? settingsInner.variables[configResource.value] : undefined;
          if (value === undefined) {
            throw new Error(`Undefined variable: ${resourceIdToString(configResource, this.objectLoader)}`);
          }
          return value;
        }
      }

      if (!this.instances[configResource.value]) {
        const subBlackList: Record<string, boolean> = { ...resourceBlacklist };
        subBlackList[configResource.value] = true;
        this.instances[configResource.value] = this.getConfigConstructor(configResource).create(
          { resourceBlacklist: subBlackList, ...settingsInner },
        );
      }
      return this.instances[configResource.value];
    } catch (error: unknown) {
      throw this.generateErrorLog(error);
    }
  }

  /**
   * Let then given config inherit parameter values from referenced passed configs.
   * @param configResource The config
   * @param componentResource The component
   */
  public inheritParameterValues(configResource: Resource, componentResource: Resource): void {
    // Inherit parameter values from passed instances of the given types
    if (componentResource.property.parameters) {
      for (const parameter of componentResource.properties.parameters) {
        // Collect all owl:Restriction's
        const restrictions: Resource[] = parameter.properties.inheritValues
          .reduce((acc: Resource[], clazz: Resource) => {
            if (clazz.properties.types.reduce((subAcc: boolean, type: Resource) => subAcc ||
              type.value === `${Util.PREFIXES.owl}Restriction`, false)) {
              acc.push(clazz);
            }
            return acc;
          }, []);

        for (const restriction of restrictions) {
          if (restriction.property.from) {
            if (!restriction.property.onParameter) {
              throw new Error(`Parameters that inherit values must refer to a property: ${resourceToString(parameter)}`);
            }

            for (const componentType of restriction.properties.from) {
              if (componentType.type !== 'NamedNode') {
                throw new Error(`Parameter inheritance values must refer to component type identifiers, not literals: ${resourceToString(componentType)}`);
              }

              const typeInstances: Resource[] = this.runTypeConfigs[componentType.value];
              if (typeInstances) {
                for (const instance of typeInstances) {
                  for (const parentParameter of restriction.properties.onParameter) {
                    // TODO: this might be a bug in the JSON-LD parser
                    // if (parentParameter.termType !== 'NamedNode') {
                    // throw new Error('Parameters that inherit values must refer to sub properties as URI\'s: '
                    // + JSON.stringify(parentParameter));
                    // }
                    if (instance.property[parentParameter.value]) {
                      // Copy the parameters
                      for (const value of instance.properties[parentParameter.value]) {
                        configResource.properties[parentParameter.value].push(value);
                      }

                      // Also add the parameter to the parameter type list
                      if (!componentResource.properties.parameters.includes(parentParameter)) {
                        componentResource.properties.parameters.push(parentParameter);
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  /**
   * Set the loader to a state where it doesn't accept anymore module and component registrations.
   * This is required for post-processing the components, for actions such as parameter inheritance,
   * index creation and cleanup.
   */
  public finalizeRegistration(): void {
    if (this.registrationFinalized) {
      throw new Error('Attempted to finalize and already finalized loader.');
    }

    // Register all object-loaded modules
    for (const resource of Object.values(this.objectLoader.resources)) {
      if (resource.isA(Util.IRI_MODULE) && !resource.term.equals(Util.IRI_MODULE)) {
        this.registerModuleResource(resource);
      }
    }

    // Component parameter inheritance
    for (const componentResource of Object.values(this.componentResources)) {
      this.inheritParameters(componentResource, componentResource.properties.inheritValues);
      this.inheritConstructorParameters(componentResource);
    }

    // Freeze component resources
    this.componentResources = Object.freeze(this.componentResources);
    this.log('info', `Registered ${Object.keys(this.componentResources).length} components`);

    this.registrationFinalized = true;
  }

  public checkFinalizeRegistration(): void {
    if (!this.registrationFinalized) {
      this.finalizeRegistration();
    }
  }

  /**
   * Get a component config constructor based on a config URI.
   * @param configResourceUri The config resource URI.
   * @param configResourceStream A triple stream containing at least the given config.
   * @returns {Promise<T>} A promise resolving to the component constructor.
   */
  public async getConfigConstructorFromStream(
    configResourceUri: string,
    configResourceStream: RDF.Stream & Readable,
  ): Promise<IComponentFactory> {
    try {
      this.checkFinalizeRegistration();
      await this.objectLoader.import(configResourceStream);

      const configResource: Resource = this.objectLoader.resources[configResourceUri];
      if (!configResource) {
        throw new Error(`Could not find a component config with URI ${configResourceUri} in the triple stream.`);
      }
      return this.getConfigConstructor(configResource);
    } catch (error: unknown) {
      throw this.generateErrorLog(error);
    }
  }

  /**
   * Instantiate a component based on a config URI and a stream.
   * @param configResourceUri The config resource URI.
   * @param configResourceStream A triple stream containing at least the given config.
   * @param settings The settings for creating the instance.
   * @returns {Promise<T>} A promise resolving to the run instance.
   */
  public async instantiateFromStream(
    configResourceUri: string,
    configResourceStream: RDF.Stream & Readable,
    settings?: ICreationSettings,
  ): Promise<any> {
    try {
      this.checkFinalizeRegistration();
      await this.objectLoader.import(configResourceStream);

      const configResource: Resource = this.objectLoader.resources[configResourceUri];
      if (!configResource) {
        throw new Error(`Could not find a component config with URI ${configResourceUri} in the triple stream.`);
      }
      return this.instantiate(configResource, settings);
    } catch (error: unknown) {
      throw this.generateErrorLog(error);
    }
  }

  /**
   * Run a component config based on a config URI.
   * @param configResourceUri The config resource URI.
   * @param configResourceUrl An RDF document URL
   * @param fromPath The path to base relative paths on. This will typically be __dirname.
   *                 Default is the current running directory.
   * @returns {Promise<T>} A promise resolving to the run instance.
   */
  public async getConfigConstructorFromUrl(
    configResourceUri: string,
    configResourceUrl: string,
    fromPath?: string,
  ): Promise<IComponentFactory> {
    try {
      this.checkFinalizeRegistration();
      const state = await this.getModuleState();
      const data = await Util.getContentsFromUrlOrPath(configResourceUrl, fromPath);
      return this.getConfigConstructorFromStream(configResourceUri, new RdfParser().parse(data, {
        fromPath,
        path: configResourceUrl,
        contexts: state.contexts,
        importPaths: state.importPaths,
        ignoreImports: false,
        absolutizeRelativePaths: this.absolutizeRelativePaths,
      }));
    } catch (error: unknown) {
      throw this.generateErrorLog(error);
    }
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
  public async instantiateFromUrl(
    configResourceUri: string,
    configResourceUrl: string,
    fromPath?: string,
    settings?: ICreationSettings,
  ): Promise<any> {
    try {
      const state = await this.getModuleState();
      const data = await Util.getContentsFromUrlOrPath(configResourceUrl, fromPath);
      return this.instantiateFromStream(configResourceUri, new RdfParser().parse(data, {
        fromPath,
        path: configResourceUrl,
        contexts: state.contexts,
        importPaths: state.importPaths,
        ignoreImports: false,
        absolutizeRelativePaths: this.absolutizeRelativePaths,
      }), settings);
    } catch (error: unknown) {
      throw this.generateErrorLog(error);
    }
  }

  /**
   * Instantiate a component based on component URI and a set of parameters.
   * @param componentUri The URI of a component.
   * @param params A dictionary with named parameters.
   * @param settings The settings for creating the instance.
   * @returns {any} The run instance.
   */
  public async instantiateManually(
    componentUri: string,
    params: Record<string, string>,
    settings: ICreationSettings = {},
  ): Promise<any> {
    try {
      const settingsInner: ICreationSettingsInner = { ...settings, moduleState: await this.getModuleState() };
      this.checkFinalizeRegistration();
      const componentResource: Resource = this.componentResources[componentUri];
      if (!componentResource) {
        throw new Error(`Could not find a component for URI ${componentUri}`);
      }
      const moduleResource: Resource = componentResource.property.module;
      if (!moduleResource) {
        throw new Error(`No module was found for the component ${resourceIdToString(componentResource, this.objectLoader)}`);
      }
      const configResource = this.objectLoader.createCompactedResource({});
      for (const key of Object.keys(params)) {
        configResource.property[key] = this.objectLoader.createCompactedResource(`"${params[key]}"`);
      }
      const constructor: ComponentFactory = new ComponentFactory(
        moduleResource,
        componentResource,
        configResource,
        this.overrideRequireNames,
        this,
      );
      return constructor.create(settingsInner);
    } catch (error: unknown) {
      throw this.generateErrorLog(error);
    }
  }

  /**
   * Log a message.
   * @param level The level to log at.
   * @param message The message to log.
   * @param meta Optional metadata to include in the log message.
   */
  public log(level: LogLevel, message: string, meta?: any): void {
    if (this.logger) {
      this.logger.log(level, message, meta);
    }
  }

  public generateErrorLog(error: unknown): Error {
    if (this.dumpErrorState && !this.generatedErrorLog) {
      this.generatedErrorLog = true;
      const contents = JSON.stringify({
        mainModulePathIn: this.mainModulePath,
        absolutizeRelativePaths: this.absolutizeRelativePaths,
        components: Object.keys(this.componentResources),
        moduleState: {
          mainModulePath: this.moduleState?.mainModulePath,
          componentModules: this.moduleState?.componentModules,
          importPaths: this.moduleState?.importPaths,
          nodeModuleImportPaths: this.moduleState?.nodeModuleImportPaths,
          nodeModulePaths: this.moduleState?.nodeModulePaths,
          contexts: this.moduleState?.contexts,
        },
      }, null, '  ');
      fs.writeFileSync('componentsjs-error-state.json', contents, 'utf8');
    }
    return <Error> error;
  }
}

export interface ILoaderProperties {
  absolutizeRelativePaths?: boolean;
  mainModulePath?: string;
  dumpErrorState?: boolean;
  logLevel?: LogLevel;
}
