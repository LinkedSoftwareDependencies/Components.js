import { FetchDocumentLoader, type IJsonLdContext } from 'jsonld-context-parser';
import semverMajor = require('semver/functions/major');
import type { Logger } from 'winston';

/**
 * A document loader that first loads from a precomputed set of contexts,
 * and only then does an HTTP(S) lookup for the context.
 */
export class PrefetchedDocumentLoader extends FetchDocumentLoader {
  public static readonly CJS_MAJOR_VERSION: number = semverMajor(require('../../package.json').version);
  public static readonly CONTEXT_URL: string =
  `https://linkedsoftwaredependencies.org/bundles/npm/componentsjs/^${PrefetchedDocumentLoader.CJS_MAJOR_VERSION}.0.0/components/context.jsonld`;

  public static readonly CONTEXT_PATTERN: RegExp =
  /https:\/\/linkedsoftwaredependencies.org\/bundles\/npm\/componentsjs\/\^([0-9]+).0.0\/components\/context.jsonld/u;

  private static readonly DEFAULT_CONTEXT: any = require('../../components/context.json');

  private static readonly DEFAULT_CONTEXTS: Record<string, any> = {
    [PrefetchedDocumentLoader.CONTEXT_URL]:
    PrefetchedDocumentLoader.DEFAULT_CONTEXT,
  };

  static {
    // TODO: temporarily also set old context versions for backwards-compatible.
    for (let i = 3; i < PrefetchedDocumentLoader.CJS_MAJOR_VERSION; i++) {
      PrefetchedDocumentLoader.DEFAULT_CONTEXTS[
        `https://linkedsoftwaredependencies.org/bundles/npm/componentsjs/^${i}.0.0/components/context.jsonld`
      ] = PrefetchedDocumentLoader.DEFAULT_CONTEXT;
    }
  }

  private readonly contexts: Record<string, any>;
  private readonly path?: string;
  private readonly logger?: Logger;
  private readonly remoteContextLookups?: boolean;

  public constructor(options: IPrefetchedDocumentLoaderOptions) {
    super();
    this.contexts = { ...options.contexts, ...PrefetchedDocumentLoader.DEFAULT_CONTEXTS };
    this.logger = options.logger;
    this.path = options.path;
    this.remoteContextLookups = options.remoteContextLookups;
  }

  public override async load(url: string): Promise<IJsonLdContext> {
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
