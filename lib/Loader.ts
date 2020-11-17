import * as fs from 'fs';
import type { Readable } from 'stream';
import type * as RDF from 'rdf-js';
import type { Resource } from 'rdf-object';
import { RdfObjectLoader } from 'rdf-object';
import type { Logger } from 'winston';
import { createLogger, format, transports } from 'winston';
import { ComponentFactory } from './factory/ComponentFactory';
import type { IComponentFactory, ICreationSettings, ICreationSettingsInner } from './factory/IComponentFactory';
import type { IInstancePool } from './IInstancePool';
import { InstancePool } from './InstancePool';
import type { LogLevel } from './LogLevel';
import type { IModuleState } from './ModuleStateBuilder';
import { ModuleStateBuilder } from './ModuleStateBuilder';
import { RdfParser } from './rdf/RdfParser';
import Util = require('./Util');
import { resourceIdToString } from './Util';

/**
 * A Loader is able to take in module registrations,
 * after which components can be instantiated.
 */
export class Loader {
  private readonly objectLoader: RdfObjectLoader;
  private readonly mainModulePath?: string;
  private readonly absolutizeRelativePaths: boolean;
  private readonly dumpErrorState: boolean;
  private readonly overrideRequireNames: Record<string, string>;
  public readonly logger?: Logger;

  private readonly componentResources: Record<string, Resource> = {};

  protected moduleState?: IModuleState;
  protected instancePool?: IInstancePool;
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
    this.overrideRequireNames = options.overrideRequireNames || {};
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

  /**
   * Get or create the current module's state.
   */
  public async getModuleState(): Promise<IModuleState> {
    if (!this.moduleState) {
      try {
        this.log('info', `Initiating component discovery from ${this.mainModulePath || 'the current working directory'}`);
        this.moduleState = await new ModuleStateBuilder(this.logger).buildModuleState(require, this.mainModulePath);
        this.log('info', `Discovered ${Object.keys(this.moduleState.componentModules).length} component packages within ${this.moduleState.nodeModulePaths.length} packages`);
      } catch (error: unknown) {
        throw this.generateErrorLog(error);
      }
    }
    return this.moduleState;
  }

  /**
   * Get or create an instance pool for creating new instances.
   */
  public async getInstancePool(): Promise<IInstancePool> {
    if (!this.instancePool) {
      this.instancePool = new InstancePool({
        objectLoader: this.objectLoader,
        componentResources: this.componentResources,
        moduleState: await this.getModuleState(),
        overrideRequireNames: this.overrideRequireNames,
      });
    }
    return this.instancePool;
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
      this.requireValidComponent(componentResource);
      this.componentResources[componentResource.value] = componentResource;
    } catch (error: unknown) {
      throw this.generateErrorLog(error);
    }
  }

  /**
   * Check if the given resource is a valid component.
   * A valid component is either an abstract class, a class, or an instance.
   * @param componentResource A resource.
   * @returns {boolean} If the resource is a valid component.
   */
  public isValidComponent(componentResource: Resource): boolean {
    return componentResource.isA('AbstractClass') ||
            componentResource.isA('Class') ||
            componentResource.isA('Instance');
  }

  /**
   * Require that the given resource is a valid component, otherwise and error is thrown.
   * @param componentResource A resource.
   * @param referencingComponent The optional component referencing the given component.
   */
  public requireValidComponent(componentResource: Resource, referencingComponent?: Resource): void {
    if (!this.isValidComponent(componentResource)) {
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
        this.requireValidComponent(component, componentResource);
        if (this.isValidComponent(component)) {
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
        } else if (!superObject.isA('ObjectMapping') &&
          !superObject.property.inheritValues &&
          !superObject.property.onParameter) {
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
        logger: this.logger,
      }));
    } catch (error: unknown) {
      throw this.generateErrorLog(error);
    }
  }

  /**
   * Register all reachable modules and their components.
   * This will interpret the package.json from the main module and all its dependencies for discovering modules.
   * This will ensure that component configs referring to components as types of these modules are recognized.
   */
  public async registerAvailableModuleResources(): Promise<void> {
    const state = await this.getModuleState();
    await Promise.all(Object.values(state.componentModules)
      .map((moduleResourceUrl: string) => this.registerModuleResourcesUrl(moduleResourceUrl)));
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
      if (resource.isA('Module') && !resource.term.equals(Util.IRI_MODULE)) {
        this.registerModuleResource(resource);
      }
    }

    // Component parameter inheritance
    for (const componentResource of Object.values(this.componentResources)) {
      this.inheritParameters(componentResource, componentResource.properties.inheritValues);
      this.inheritConstructorParameters(componentResource);
    }

    this.log('info', `Registered ${Object.keys(this.componentResources).length} components`);
    this.registrationFinalized = true;
  }

  public checkFinalizeRegistration(): void {
    if (!this.registrationFinalized) {
      this.finalizeRegistration();
    }
  }

  /**
   * Register a configuration.
   * @param configResourceStream A triple stream containing a config.
   */
  public async registerConfigStream(configResourceStream: RDF.Stream & Readable): Promise<void> {
    try {
      this.checkFinalizeRegistration();
      await this.objectLoader.import(configResourceStream);
    } catch (error: unknown) {
      throw this.generateErrorLog(error);
    }
  }

  /**
   * Run a component config based on a config URL or local file path.
   * @param configResourceUrl An RDF document URL or local file path.
   * @param fromPath The path to base relative paths on. This will typically be __dirname.
   *                 Default is the current running directory.
   */
  public async registerConfigUrl(configResourceUrl: string, fromPath?: string): Promise<void> {
    try {
      const state = await this.getModuleState();
      const data = await Util.getContentsFromUrlOrPath(configResourceUrl, fromPath);
      return await this.registerConfigStream(new RdfParser().parse(data, {
        fromPath,
        path: configResourceUrl,
        contexts: state.contexts,
        importPaths: state.importPaths,
        ignoreImports: false,
        absolutizeRelativePaths: this.absolutizeRelativePaths,
        logger: this.logger,
      }));
    } catch (error: unknown) {
      throw this.generateErrorLog(error);
    }
  }

  /**
   * Get a component config constructor based on a config IRI.
   * @param configResourceIri The config resource IRI.
   */
  public async getComponentFactory(configResourceIri: string): Promise<IComponentFactory> {
    try {
      const configResource: Resource = this.objectLoader.resources[configResourceIri];
      if (!configResource) {
        throw new Error(`Could not find a component config with URI ${configResourceIri} in the triple stream.`);
      }
      return (await this.getInstancePool()).getConfigConstructor(configResource);
    } catch (error: unknown) {
      throw this.generateErrorLog(error);
    }
  }

  /**
   * Instantiate a component based on a config IRI.
   * @param configResourceIri The config resource URI.
   * @param settings The settings for creating the instance.
   */
  public async getComponentInstance(configResourceIri: string, settings: ICreationSettings = {}): Promise<any> {
    try {
      const configResource: Resource = this.objectLoader.resources[configResourceIri];
      if (!configResource) {
        throw new Error(`Could not find a component config with URI ${configResourceIri} in the triple stream.`);
      }
      return (await this.getInstancePool()).instantiate(configResource, settings);
    } catch (error: unknown) {
      throw this.generateErrorLog(error);
    }
  }

  /**
   * Instantiate a component manually based on component IRI and a set of parameters.
   * @param componentIri The IRI of a component.
   * @param params A dictionary with named parameters.
   * @param settings The settings for creating the instance.
   */
  public async getComponentInstanceCustom(
    componentIri: string,
    params: Record<string, string>,
    settings: ICreationSettings = {},
  ): Promise<any> {
    try {
      const settingsInner: ICreationSettingsInner = { ...settings, moduleState: await this.getModuleState() };
      this.checkFinalizeRegistration();
      const componentResource: Resource = this.componentResources[componentIri];
      if (!componentResource) {
        throw new Error(`Could not find a component for URI ${componentIri}`);
      }
      const moduleResource: Resource = componentResource.property.module;
      if (!moduleResource) {
        throw new Error(`No module was found for the component ${resourceIdToString(componentResource, this.objectLoader)}`);
      }
      const configResource = this.objectLoader.createCompactedResource({});
      for (const key of Object.keys(params)) {
        configResource.property[key] = this.objectLoader.createCompactedResource(`"${params[key]}"`);
      }
      const instancePool = await this.getInstancePool();
      return new ComponentFactory({
        objectLoader: this.objectLoader,
        config: configResource,
        overrideRequireNames: this.overrideRequireNames,
        instancePool,
        constructable: !configResource.isA('Instance'),
        moduleDefinition: moduleResource,
        componentDefinition: componentResource,
      }).createInstance(settingsInner);
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

  /**
   * Create an `componentsjs-error-state.json` file to represent the application state in the current working directory.
   * @param error The error that causes this error state to be created.
   */
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
  /**
   * Require overrides.
   * Require name as path, require override as value.
   */
  overrideRequireNames?: Record<string, string>;
}
