import * as fs from 'fs';
import type { Resource, RdfObjectLoader } from 'rdf-object';
import { stringToTerm } from 'rdf-string';
import type { Logger } from 'winston';
import type { IConfigConstructorPool } from './construction/IConfigConstructorPool';
import type { IConstructionSettings } from './construction/IConstructionSettings';
import type { IComponentsManagerBuilderOptions } from './loading/ComponentsManagerBuilder';
import { ComponentsManagerBuilder } from './loading/ComponentsManagerBuilder';
import type { ConfigRegistry } from './loading/ConfigRegistry';
import type { IModuleState } from './loading/ModuleStateBuilder';
import { ErrorResourcesContext } from './util/ErrorResourcesContext';

/**
 * A components manager can instantiate components.
 * This manager should be created using {@link ComponentsManager.build}.
 */
export class ComponentsManager<Instance> {
  public readonly moduleState: IModuleState;
  public readonly objectLoader: RdfObjectLoader;
  public readonly componentResources: Record<string, Resource>;
  public readonly configRegistry: ConfigRegistry;
  public readonly dumpErrorState: boolean;
  public readonly configConstructorPool: IConfigConstructorPool<Instance>;
  public readonly logger: Logger;

  public constructor(options: IComponentsManagerOptions<Instance>) {
    this.moduleState = options.moduleState;
    this.objectLoader = options.objectLoader;
    this.componentResources = options.componentResources;
    this.configRegistry = options.configRegistry;
    this.dumpErrorState = options.dumpErrorState;
    this.configConstructorPool = options.configConstructorPool;
    this.logger = options.logger;
  }

  /**
   * Create a new {@link ComponentsManager}.
   * @see IComponentsManagerBuilderOptions
   * @param options Settings of the new manager.
   */
  public static build<I>(options: IComponentsManagerBuilderOptions<I, I | Promise<I>>): Promise<ComponentsManager<I>> {
    return new ComponentsManagerBuilder(options).build();
  }

  /**
   * Instantiate the given instance IRI.
   *
   * This will fail if the instance IRI could not be found
   * in any of the registered configs during the building phase.
   * @param instanceIri The IRI of an instance inside a config.
   * @param settings Optional settings that may influence instantiation.
   */
  public async instantiate<T = Instance>(instanceIri: string, settings: IConstructionSettings = {}): Promise<T> {
    try {
      const instanceResource: Resource = this.objectLoader.resources[instanceIri];
      if (!instanceResource) {
        throw new Error(`No config instance with IRI ${instanceIri} has been registered`);
      }
      return <T> <unknown> (await this.configConstructorPool.instantiate(instanceResource, settings));
    } catch (error: unknown) {
      throw this.generateErrorLog(error);
    }
  }

  /**
   * Retrieve a list of all instantiated Resources.
   */
  public getInstantiatedResources(): Resource[] {
    const instances = this.configConstructorPool.getInstanceRegistry();
    return Object.keys(instances)
      .map(key => stringToTerm(key))
      .map(term => this.configRegistry.getInstantiatedResource(term));
  }

  /**
   * Create an `componentsjs-error-state.json` file to represent the application state in the current working directory.
   * @param error The error that causes this error state to be created.
   */
  private generateErrorLog(error: unknown): Error {
    if (this.dumpErrorState) {
      const contents = JSON.stringify({
        ...error instanceof ErrorResourcesContext ? error.exportContext() : {},
        componentTypes: Object.keys(this.componentResources),
        moduleState: {
          mainModulePath: this.moduleState.mainModulePath,
          componentModules: this.moduleState.componentModules,
          importPaths: this.moduleState.importPaths,
          contexts: this.moduleState.contexts,
          nodeModuleImportPaths: this.moduleState.nodeModuleImportPaths,
          nodeModulePaths: this.moduleState.nodeModulePaths,
        },
      }, null, '  ');
      fs.writeFileSync('componentsjs-error-state.json', contents, 'utf8');
      this.logger.error(`Detected fatal error. Generated 'componentsjs-error-state.json' with more information.`);
    }
    return <Error> error;
  }
}

export interface IComponentsManagerOptions<Instance> {
  moduleState: IModuleState;
  objectLoader: RdfObjectLoader;
  componentResources: Record<string, Resource>;
  configRegistry: ConfigRegistry;
  dumpErrorState: boolean;
  configConstructorPool: IConfigConstructorPool<Instance>;
  logger: Logger;
}
