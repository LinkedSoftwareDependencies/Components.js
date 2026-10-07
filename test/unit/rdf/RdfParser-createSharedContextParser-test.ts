/**
 * Isolated tests for {@link RdfParser#createSharedContextParser} that exercise the optional,
 * feature-detected normalized-context cache. Only `ContextParser` (to capture its constructor
 * arguments) and `ContextCache` are stubbed; all other jsonld-context-parser exports are kept real
 * so the transitive rdf-parse/jsonld-streaming-parser imports still resolve. This lets both the
 * cache-available and cache-unavailable code paths be covered regardless of the installed version.
 */
describe('RdfParser.createSharedContextParser', () => {
  const contexts = { 'http://example.org/c.jsonld': { '@context': {}}};

  afterEach(() => {
    jest.resetModules();
    jest.dontMock('jsonld-context-parser');
  });

  it('creates a context parser with a prefetched loader and no cache when unavailable', () => {
    jest.isolateModules(() => {
      const contextParserArgs: any[] = [];
      jest.doMock('jsonld-context-parser', (): any => ({
        ...jest.requireActual('jsonld-context-parser'),
        ContextParser: jest.fn((options: any) => contextParserArgs.push(options)),
        ContextCache: undefined,
      }));
      const { RdfParser } = require('../../../lib/rdf/RdfParser');

      RdfParser.createSharedContextParser({ contexts, skipContextValidation: true });

      expect(contextParserArgs).toHaveLength(1);
      expect(contextParserArgs[0].documentLoader).toBeDefined();
      expect(contextParserArgs[0].skipValidation).toBe(true);
      expect(contextParserArgs[0].contextCache).toBeUndefined();
    });
  });

  it('attaches a shared normalized-context cache when the parser exposes one', () => {
    jest.isolateModules(() => {
      const contextParserArgs: any[] = [];
      const cacheInstances: any[] = [];
      jest.doMock('jsonld-context-parser', (): any => ({
        ...jest.requireActual('jsonld-context-parser'),
        ContextParser: jest.fn((options: any) => contextParserArgs.push(options)),
        ContextCache: jest.fn(function fakeCache(this: any) {
          cacheInstances.push(this);
        }),
      }));
      const { RdfParser } = require('../../../lib/rdf/RdfParser');

      RdfParser.createSharedContextParser({ contexts });

      expect(contextParserArgs).toHaveLength(1);
      expect(cacheInstances).toHaveLength(1);
      expect(contextParserArgs[0].contextCache).toBe(cacheInstances[0]);
    });
  });
});
