import type { Readable } from 'stream';
import type * as RDF from '@rdfjs/types';
import type { RdfObjectLoader, Resource } from 'rdf-object';
import { termToString } from 'rdf-string';
import type { Logger } from 'winston';
import { RdfParser } from '../rdf/RdfParser.js';
import type { IModuleState } from './ModuleStateBuilder.js';

/**
 * Accepts registrations for configurations that contain instantiations of components.
 */
export class ConfigRegistry {
  private readonly moduleState: IModuleState;
  private readonly objectLoader: RdfObjectLoader;
  private readonly logger: Logger;
  private readonly skipContextValidation: boolean;
  private readonly remoteContextLookups: boolean;

  public constructor(options: IConfigLoaderRegistryOptions) {
    this.moduleState = options.moduleState;
    this.objectLoader = options.objectLoader;
    this.logger = options.logger;
    this.skipContextValidation = options.skipContextValidation;
    this.remoteContextLookups = options.remoteContextLookups;
  }

  /**
   * Register a config based on a config URL or local file path.
   * @param urlOrPath An RDF document URL or local file path.
   */
  public async register(urlOrPath: string): Promise<void> {
    const data = await RdfParser.fetchFileOrUrl(urlOrPath);
    return await this.registerStream(new RdfParser().parse(data, {
      path: urlOrPath,
      contexts: this.moduleState.contexts,
      importPaths: this.moduleState.importPaths,
      ignoreImports: false,
      logger: this.logger,
      skipContextValidation: this.skipContextValidation,
      remoteContextLookups: this.remoteContextLookups,
    }));
  }

  /**
   * Register a config stream.
   * @param stream A triple stream containing a config.
   */
  public async registerStream(stream: RDF.Stream & Readable): Promise<void> {
    await this.objectLoader.import(stream);
  }

  /**
   * Register a manual config.
   * @param configId Unique identifier for this new config.
   * @param componentTypeIri The IRI of a component.
   * @param params A dictionary with named parameters.
   */
  public async registerCustom(
    configId: string,
    componentTypeIri: string,
    params: Record<string, string>,
  ): Promise<void> {
    // Create ad-hoc resource
    const configResource = this.objectLoader.createCompactedResource({
      '@id': configId,
      types: componentTypeIri,
    });
    for (const key of Object.keys(params)) {
      configResource.property[key] = this.objectLoader.createCompactedResource(`"${params[key]}"`);
    }
  }

  /**
   * Get the instantiated Resource that was registered to the given term.
   * @param term The term of the Resource that was instantiated
   */
  public getInstantiatedResource(term: RDF.Term): Resource {
    return this.objectLoader.resources[termToString(term)];
  }
}

export interface IConfigLoaderRegistryOptions {
  moduleState: IModuleState;
  objectLoader: RdfObjectLoader;
  logger: Logger;
  skipContextValidation: boolean;
  remoteContextLookups: boolean;
}
