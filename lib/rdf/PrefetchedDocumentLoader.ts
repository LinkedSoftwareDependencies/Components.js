import * as fs from 'fs';
import type { IJsonLdContext } from 'jsonld-context-parser';
import { FetchDocumentLoader } from 'jsonld-context-parser';
import type { Logger } from 'winston';

/**
 * A document loader that first loads from a precomputed set of contexts,
 * and only then does an HTTP(S) lookup for the context.
 */
export class PrefetchedDocumentLoader extends FetchDocumentLoader {
  public static readonly CONTEXT_URL: string =
  'https://linkedsoftwaredependencies.org/bundles/npm/componentsjs/^4.0.0/components/context.jsonld';

  // eslint-disable-next-line no-sync
  private static readonly DEFAULT_CONTEXT: any = JSON.parse(fs
    .readFileSync(`${__dirname}/../../components/context.jsonld`, 'utf8'));

  private static readonly DEFAULT_CONTEXTS: Record<string, any> = {
    [PrefetchedDocumentLoader.CONTEXT_URL]:
    PrefetchedDocumentLoader.DEFAULT_CONTEXT,
    // TODO: temporarily also set old context version for backwards-compatible.
    'https://linkedsoftwaredependencies.org/bundles/npm/componentsjs/^3.0.0/components/context.jsonld':
    PrefetchedDocumentLoader.DEFAULT_CONTEXT,
  };

  private readonly contexts: Record<string, any>;
  private readonly path?: string;
  private readonly logger?: Logger;

  public constructor(options: IPrefetchedDocumentLoaderOptions) {
    super();
    this.contexts = { ...options.contexts, ...PrefetchedDocumentLoader.DEFAULT_CONTEXTS };
    this.logger = options.logger;
    this.path = options.path;
  }

  public async load(url: string): Promise<IJsonLdContext> {
    if (this.logger &&
      url === 'https://linkedsoftwaredependencies.org/bundles/npm/componentsjs/^3.0.0/components/context.jsonld') {
      this.logger.warn(`Detected deprecated context URL '${url}'${this.path ? ` in ${this.path}` : ''}. Prefer using version '^4.0.0' instead.`);
    }
    if (url in this.contexts) {
      return this.contexts[url];
    }
    return super.load(url);
  }
}

export interface IPrefetchedDocumentLoaderOptions {
  contexts: Record<string, any>;
  logger?: Logger;
  path?: string;
}
