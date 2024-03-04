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

    it('for the built-in prefetched 3.0.0 context that is deprecated with a logger', async() => {
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
      expect(logger.warn).toHaveBeenCalledWith(`Detected deprecated context URL 'https://linkedsoftwaredependencies.org/bundles/npm/componentsjs/^3.0.0/components/context.jsonld' in PATH. Prefer using version '^5.0.0' instead.`);
    });

    it('for the built-in prefetched 4.0.0 context that is deprecated with a logger', async() => {
      const logger: any = {
        warn: jest.fn(),
      };
      loader = new PrefetchedDocumentLoader({
        contexts: {},
        logger,
        path: 'PATH',
      });
      expect(await loader.load(`https://linkedsoftwaredependencies.org/bundles/npm/componentsjs/^4.0.0/components/context.jsonld`))
        .toEqual(JSON.parse(fs.readFileSync(`${__dirname}/../../../components/context.jsonld`, 'utf8')));
      expect(logger.warn).toHaveBeenCalledWith(`Detected deprecated context URL 'https://linkedsoftwaredependencies.org/bundles/npm/componentsjs/^4.0.0/components/context.jsonld' in PATH. Prefer using version '^5.0.0' instead.`);
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
      expect(logger.warn).toHaveBeenCalledWith(`Detected deprecated context URL 'https://linkedsoftwaredependencies.org/bundles/npm/componentsjs/^3.0.0/components/context.jsonld'. Prefer using version '^5.0.0' instead.`);
    });

    it('for a non-prefetched context', async() => {
      await expect(loader.load('http://remote.org/context')).rejects
        .toThrow(`Detected remote context lookup for 'http://remote.org/context' in PATH. This may indicate a missing or invalid dependency, incorrect version number, or an invalid context URL.`);
    });

    it('for a non-prefetched context with a logger', async() => {
      const logger: any = {
        warn: jest.fn(),
      };
      loader = new PrefetchedDocumentLoader({
        contexts: {},
        logger,
        path: 'PATH',
      });
      await expect(loader.load('http://remote.org/context')).rejects
        .toThrow(`Detected remote context lookup for 'http://remote.org/context' in PATH. This may indicate a missing or invalid dependency, incorrect version number, or an invalid context URL.`);
    });

    it('for a non-prefetched context with a logger without path', async() => {
      const logger: any = {
        warn: jest.fn(),
      };
      loader = new PrefetchedDocumentLoader({
        contexts: {},
        logger,
      });
      await expect(loader.load('http://remote.org/context')).rejects
        .toThrow(`Detected remote context lookup for 'http://remote.org/context'. This may indicate a missing or invalid dependency, incorrect version number, or an invalid context URL.`);
    });

    it('for a non-prefetched context with remoteContextLookups: true', async() => {
      loader = new PrefetchedDocumentLoader({
        contexts: {
          'http://example.org/context': { a: 'b' },
        },
        path: 'PATH',
        remoteContextLookups: true,
      });
      expect(await loader.load('http://remote.org/context'))
        .toEqual({ x: 'y' });
    });

    it('for a non-prefetched context with a logger with remoteContextLookups: true', async() => {
      const logger: any = {
        warn: jest.fn(),
      };
      loader = new PrefetchedDocumentLoader({
        contexts: {},
        logger,
        path: 'PATH',
        remoteContextLookups: true,
      });
      expect(await loader.load('http://remote.org/context'))
        .toEqual({ x: 'y' });
      expect(logger.warn).toHaveBeenCalledWith(`Detected remote context lookup for 'http://remote.org/context' in PATH. This may indicate a missing or invalid dependency, incorrect version number, or an invalid context URL.`);
    });

    it('for a non-prefetched context with a logger without path with remoteContextLookups: true', async() => {
      const logger: any = {
        warn: jest.fn(),
      };
      loader = new PrefetchedDocumentLoader({
        contexts: {},
        logger,
        remoteContextLookups: true,
      });
      expect(await loader.load('http://remote.org/context'))
        .toEqual({ x: 'y' });
      expect(logger.warn).toHaveBeenCalledWith(`Detected remote context lookup for 'http://remote.org/context'. This may indicate a missing or invalid dependency, incorrect version number, or an invalid context URL.`);
    });
  });
});
