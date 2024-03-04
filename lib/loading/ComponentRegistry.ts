import type { Readable } from 'stream';
import type * as RDF from '@rdfjs/types';
import type { Resource, RdfObjectLoader } from 'rdf-object';
import type { Logger } from 'winston';
import { RdfParser } from '../rdf/RdfParser';
import type { IModuleState } from './ModuleStateBuilder';

/**
 * Accepts component registrations and modules containing zero or more components.
 *
 * This class will populate the given {@link componentResources} hash.
 * Before the {@link componentResources} hash is used anywhere else,
 * the {@link ComponentRegistryFinalizer} should be invoked on this
 * to make sure that all modules have properly been registered.
 */
export class ComponentRegistry {
  private readonly moduleState: IModuleState;
  private readonly objectLoader: RdfObjectLoader;
  private readonly logger: Logger;
  private readonly componentResources: Record<string, Resource>;
  private readonly skipContextValidation: boolean;
  private readonly remoteContextLookups: boolean;

  public constructor(options: IComponentLoaderRegistryOptions) {
    this.moduleState = options.moduleState;
    this.objectLoader = options.objectLoader;
    this.logger = options.logger;
    this.componentResources = options.componentResources;
    this.skipContextValidation = options.skipContextValidation;
    this.remoteContextLookups = options.remoteContextLookups;
  }

  /**
   * Register all modules and their components that are available in the {@link IModuleState}.
   *
   * Effectively, this will load in all components that are available in the main package and its dependencies.
   */
  public async registerAvailableModules(): Promise<void> {
    await Promise.all(Object.values(this.moduleState.componentModules)
      .flatMap(Object.values)
      .map((moduleResourceUrl: string) => this.registerModule(moduleResourceUrl)));
  }

  /**
   * Register a module based on a config URL or local file path.
   * @param urlOrPath An RDF document URL or local file path.
   */
  public async registerModule(urlOrPath: string): Promise<void> {
    const data = await RdfParser.fetchFileOrUrl(urlOrPath);
    await this.registerModuleStream(new RdfParser().parse(data, {
      path: urlOrPath,
      contexts: this.moduleState.contexts,
      importPaths: this.moduleState.importPaths,
      logger: this.logger,
      skipContextValidation: this.skipContextValidation,
      remoteContextLookups: this.remoteContextLookups,
    }));
  }

  /**
   * Register a module stream.
   * @param stream A triple stream containing a module.
   */
  public async registerModuleStream(stream: RDF.Stream & Readable): Promise<void> {
    await this.objectLoader.import(stream);
  }

  /**
   * Register a module resource.
   * @param moduleResource A module resource.
   */
  public registerModuleResource(moduleResource: Resource): void {
    if (moduleResource.property.components) {
      for (const component of moduleResource.properties.components) {
        component.properties.module.push(moduleResource);
        this.registerComponent(component);
      }
    } else {
      this.logger.debug(`Registered a module ${moduleResource.value} without components.`);
    }
  }

  /**
   * Register a component resource.
   * @param component A component resource.
   */
  public registerComponent(component: Resource): void {
    this.requireValidComponent(component);
    if (component.term.termType !== 'NamedNode') {
      this.logger.warn(`Registered a component that is identified by a ${component.term.termType} (${component.value}) instead of an IRI identifier.`);
    }
    this.componentResources[component.value] = component;
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
      throw new Error(`Resource ${componentResource.value} is not a valid component, either it is not defined, has no type, or is incorrectly referenced${referencingComponent ? ` by ${referencingComponent.value}` : ''}.`);
    }
  }
}

export interface IComponentLoaderRegistryOptions {
  moduleState: IModuleState;
  objectLoader: RdfObjectLoader;
  logger: Logger;
  componentResources: Record<string, Resource>;
  skipContextValidation: boolean;
  remoteContextLookups: boolean;
}
