import * as fs from 'fs';
import type { IJsonLdContext } from 'jsonld-context-parser';
import { FetchDocumentLoader } from 'jsonld-context-parser';

export class PrefetchedDocumentLoader extends FetchDocumentLoader {
  private static readonly DEFAULT_CONTEXTS: Record<string, any> = {
    'https://linkedsoftwaredependencies.org/bundles/npm/componentsjs/^3.0.0/components/context.jsonld':
    // eslint-disable-next-line no-sync
      JSON.parse(fs.readFileSync(`${__dirname}/../../components/context.jsonld`, 'utf8')),
  };

  private readonly contexts: Record<string, any>;

  public constructor(contexts: Record<string, any>) {
    super();
    this.contexts = { ...contexts, ...PrefetchedDocumentLoader.DEFAULT_CONTEXTS };
  }

  public async load(url: string): Promise<IJsonLdContext> {
    if (url in this.contexts) {
      return this.contexts[url];
    }
    return super.load(url);
  }
}