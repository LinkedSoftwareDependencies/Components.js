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
      contexts: {
        'http://example.org/context': { a: 'b' },
      },
      path: 'PATH',
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

    it('for the built-in prefetched context that is deprecated', async() => {
      expect(await loader.load(`https://linkedsoftwaredependencies.org/bundles/npm/componentsjs/^3.0.0/components/context.jsonld`))
        .toEqual(JSON.parse(fs.readFileSync(`${__dirname}/../../../components/context.jsonld`, 'utf8')));
    });

    it('for the built-in prefetched context that is deprecated with a logger', async() => {
      const logger: any = {
        warn: jest.fn(),
      };
      loader = new PrefetchedDocumentLoader({
        contexts: {},
        logger,
        path: 'PATH',
      });
      expect(await loader.load(`https://linkedsoftwaredependencies.org/bundles/npm/componentsjs/^3.0.0/components/context.jsonld`))
        .toEqual(JSON.parse(fs.readFileSync(`${__dirname}/../../../components/context.jsonld`, 'utf8')));
      expect(logger.warn).toHaveBeenCalledWith(`Detected deprecated context URL 'https://linkedsoftwaredependencies.org/bundles/npm/componentsjs/^3.0.0/components/context.jsonld' in PATH. Prefer using version '^4.0.0' instead.`);
    });

    it('for the built-in prefetched context that is deprecated with a logger without path', async() => {
      const logger: any = {
        warn: jest.fn(),
      };
      loader = new PrefetchedDocumentLoader({
        contexts: {},
        logger,
      });
      expect(await loader.load(`https://linkedsoftwaredependencies.org/bundles/npm/componentsjs/^3.0.0/components/context.jsonld`))
        .toEqual(JSON.parse(fs.readFileSync(`${__dirname}/../../../components/context.jsonld`, 'utf8')));
      expect(logger.warn).toHaveBeenCalledWith(`Detected deprecated context URL 'https://linkedsoftwaredependencies.org/bundles/npm/componentsjs/^3.0.0/components/context.jsonld'. Prefer using version '^4.0.0' instead.`);
    });

    it('for a non-prefetched context', async() => {
      expect(await loader.load('http://remote.org/context'))
        .toEqual({ x: 'y' });
    });
  });
});
