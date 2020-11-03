import { FetchDocumentLoader, IJsonLdContext } from 'jsonld-context-parser';
import * as fs from 'fs';

export class PrefetchedDocumentLoader extends FetchDocumentLoader {

  private static readonly DEFAULT_CONTEXTS: {[url: string]: any} = {
    'https://linkedsoftwaredependencies.org/bundles/npm/componentsjs/^3.0.0/components/context.jsonld':
      JSON.parse(fs.readFileSync(__dirname + '/../../components/context.jsonld', 'utf8'))
  };

  private readonly contexts: {[id: string]: any};

  public constructor(contexts: {[id: string]: any}) {
    super();
    this.contexts = { ...contexts, ...PrefetchedDocumentLoader.DEFAULT_CONTEXTS };
  }

  public async load(url: string): Promise<IJsonLdContext> {
    if (url in this.contexts) {
      return this.contexts[url];
    } else {
      return super.load(url);
    }
  }
}
