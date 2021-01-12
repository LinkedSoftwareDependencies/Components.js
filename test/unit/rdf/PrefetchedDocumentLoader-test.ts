import * as fs from 'fs';
import { PrefetchedDocumentLoader } from '../../../lib/rdf/PrefetchedDocumentLoader';

global.fetch = <any>jest.fn(async() => ({
  json: () => ({ x: 'y' }),
  ok: true,
  headers: new Headers({ 'Content-Type': 'application/ld+json' }),
  statusText: 'OK',
}));

describe('PrefetchedDocumentLoader', () => {
  let loader: PrefetchedDocumentLoader;
  beforeEach(() => {
    loader = new PrefetchedDocumentLoader({
      'http://example.org/context': { a: 'b' },
    });
  });

  describe('load', () => {
    it('for a prefetched context', async() => {
      expect(await loader.load('http://example.org/context'))
        .toEqual({ a: 'b' });
    });

    it('for the built-in prefetched context', async() => {
      expect(await loader.load(`https://linkedsoftwaredependencies.org/bundles/npm/componentsjs/^4.0.0/components/context.jsonld`))
        .toEqual(JSON.parse(fs.readFileSync(`${__dirname}/../../../components/context.jsonld`, 'utf8')));
    });

    it('for a non-prefetched context', async() => {
      expect(await loader.load('http://remote.org/context'))
        .toEqual({ x: 'y' });
    });
  });
});
