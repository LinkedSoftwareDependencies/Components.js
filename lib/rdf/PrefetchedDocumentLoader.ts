import type { IJsonLdContext } from 'jsonld-context-parser';
import { FetchDocumentLoader } from 'jsonld-context-parser';
import semverMajor from 'semver/functions/major';
import type { Logger } from 'winston';
import contextJson from '../../components/context.json';
import packageJson from '../../package.json';

/**
 * A document loader that first loads from a precomputed set of contexts,
 * and only then does an HTTP(S) lookup for the context.
 */
export class PrefetchedDocumentLoader extends FetchDocumentLoader {
  public static readonly cjsMajorVersion: number = semverMajor(packageJson.version);
  public static readonly contextUrl: string =
  `https://linkedsoftwaredependencies.org/bundles/npm/componentsjs/^${PrefetchedDocumentLoader.cjsMajorVersion}.0.0/components/context.jsonld`;

  public static readonly contextPattern: RegExp =
    /https:\/\/linkedsoftwaredependencies.org\/bundles\/npm\/componentsjs\/\^([0-9]+).0.0\/components\/context.jsonld/u;

  private static readonly defaultContext: any = contextJson;

  private static readonly defaultContexts: Record<string, any> = {
    [PrefetchedDocumentLoader.contextUrl]:
    PrefetchedDocumentLoader.defaultContext,
  };

  static {
    // TODO: temporarily also set old context versions for backwards-compatible.
    for (let i = 3; i < PrefetchedDocumentLoader.cjsMajorVersion; i++) {
      PrefetchedDocumentLoader.defaultContexts[
        `https://linkedsoftwaredependencies.org/bundles/npm/componentsjs/^${i}.0.0/components/context.jsonld`
      ] = PrefetchedDocumentLoader.defaultContext;
    }
  }

  private readonly contexts: Record<string, any>;
  private readonly path?: string;
  private readonly logger?: Logger;
  private readonly remoteContextLookups?: boolean;

  public constructor(options: IPrefetchedDocumentLoaderOptions) {
    super();
    this.contexts = { ...options.contexts, ...PrefetchedDocumentLoader.defaultContexts };
    this.logger = options.logger;
    this.path = options.path;
    this.remoteContextLookups = options.remoteContextLookups;
  }

  public async load(url: string): Promise<IJsonLdContext> {
    // Load prefetched contexts
    if (url in this.contexts) {
      return this.contexts[url];
    }

    // Warn before doing a remote context lookup
    const errorMessage = `Detected remote context lookup for '${url}'${this.path ? ` in ${this.path}` : ''}. This may indicate a missing or invalid dependency, incorrect version number, or an invalid context URL.`;
    if (!this.remoteContextLookups) {
      throw new Error(errorMessage);
    }
    if (this.logger) {
      this.logger.warn(errorMessage);
    }
    return super.load(url);
  }
}

export interface IPrefetchedDocumentLoaderOptions {
  contexts: Record<string, any>;
  logger?: Logger;
  path?: string;
  remoteContextLookups?: boolean;
}
