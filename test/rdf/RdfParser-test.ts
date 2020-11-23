import * as Path from 'path';
import type { RdfParserOptions } from '../../lib/rdf/RdfParser';
import { RdfParser } from '../../lib/rdf/RdfParser';
import 'jest-rdf';
// Import syntax only works in Node > 12
const arrayifyStream = require('arrayify-stream');
const quad = require('rdf-quad');
const stringifyStream = require('stream-to-string');
const streamifyString = require('streamify-string');

global.fetch = <any>jest.fn(async(url: string) => {
  if (url === 'http://example.org/myfile1.ttl') {
    return {
      body: streamifyString(`<ex:s1> <ex:p1> <ex:o1>.`),
      ok: true,
      headers: new Headers({ 'Content-Type': 'text/turtle' }),
      statusText: 'OK',
    };
  }
  if (url === 'http://example.org/myfile2.ttl') {
    return {
      body: streamifyString(`<ex:s2> <ex:p2> <ex:o2>.`),
      ok: true,
      headers: new Headers({ 'Content-Type': 'text/turtle' }),
      statusText: 'OK',
    };
  }
  if (url === 'http://example.org/myfilenest.ttl') {
    return {
      body: streamifyString(`<ex:s2> <http://www.w3.org/2002/07/owl#imports> <http://example.org/myfile1.ttl>.`),
      ok: true,
      headers: new Headers({ 'Content-Type': 'text/turtle' }),
      statusText: 'OK',
    };
  }
  if (url === 'http://example.org/myfileerror.ttl') {
    return {
      body: streamifyString(`<...`),
      ok: true,
      headers: new Headers({ 'Content-Type': 'text/turtle' }),
      statusText: 'OK',
    };
  }
  if (url === 'http://example.org/myfileunknownnest.ttl') {
    return {
      body: streamifyString(`<ex:s2> <http://www.w3.org/2002/07/owl#imports> <http://example.org/myfileunknown.ttl>.`),
      ok: true,
      headers: new Headers({ 'Content-Type': 'text/turtle' }),
      statusText: 'OK',
    };
  }
  if (url === 'http://example.org/myfileerrornest.ttl') {
    return {
      body: streamifyString(`<ex:s2> <http://www.w3.org/2002/07/owl#imports> <http://example.org/myfileerror.ttl>.`),
      ok: true,
      headers: new Headers({ 'Content-Type': 'text/turtle' }),
      statusText: 'OK',
    };
  }
  throw new Error(`URL not found: ${url}`);
});

describe('RdfParser', () => {
  let parser: RdfParser;
  beforeEach(() => {
    parser = new RdfParser();
  });

  describe('parse', () => {
    it('for an empty stream', async() => {
      const options: RdfParserOptions = {
        path: 'path/to/file.ttl',
      };
      expect(await arrayifyStream(parser.parse(streamifyString(``), options)))
        .toEqual([]);
    });

    it('for a Turtle stream', async() => {
      const options: RdfParserOptions = {
        path: 'path/to/file.ttl',
      };
      expect(await arrayifyStream(parser.parse(streamifyString(`<ex:s> <ex:p> <ex:o>.`), options)))
        .toBeRdfIsomorphic([
          quad('ex:s', 'ex:p', 'ex:o'),
        ]);
    });

    it('for a Turtle stream with relative IRIs should resolve to default baseIRI', async() => {
      const options: RdfParserOptions = {
        path: 'path/to/file.ttl',
      };
      expect(await arrayifyStream(parser.parse(streamifyString(`<s> <ex:p> <ex:o>.`), options)))
        .toBeRdfIsomorphic([
          quad('file://path/to/s', 'ex:p', 'ex:o'),
        ]);
    });

    it('for a Turtle stream with relative IRIs should resolve to default baseIRI with normalized path', async() => {
      const options: RdfParserOptions = {
        path: 'path/./to/file.ttl',
      };
      expect(await arrayifyStream(parser.parse(streamifyString(`<s> <ex:p> <ex:o>.`), options)))
        .toBeRdfIsomorphic([
          quad('file://path/to/s', 'ex:p', 'ex:o'),
        ]);
    });

    it('for a Turtle stream with relative IRIs should resolve to default baseIRI with abs path', async() => {
      const options: RdfParserOptions = {
        path: '/path/to/file.ttl',
      };
      expect(await arrayifyStream(parser.parse(streamifyString(`<s> <ex:p> <ex:o>.`), options)))
        .toBeRdfIsomorphic([
          quad('file:///path/to/s', 'ex:p', 'ex:o'),
        ]);
    });

    it('for a Turtle stream with relative IRIs should resolve to default baseIRI with IRI path', async() => {
      const options: RdfParserOptions = {
        path: 'http://example.org/file.ttl',
      };
      expect(await arrayifyStream(parser.parse(streamifyString(`<s> <ex:p> <ex:o>.`), options)))
        .toBeRdfIsomorphic([
          quad('http://example.org/s', 'ex:p', 'ex:o'),
        ]);
    });

    it('for a Turtle stream with relative IRIs and a given baseIRI', async() => {
      const options: RdfParserOptions = {
        path: 'path/to/file.ttl',
        baseIRI: 'http://base.org/',
      };
      expect(await arrayifyStream(parser.parse(streamifyString(`<s> <ex:p> <ex:o>.`), options)))
        .toBeRdfIsomorphic([
          quad('http://base.org/s', 'ex:p', 'ex:o'),
        ]);
    });

    it('for a JSON-LD stream', async() => {
      const options: RdfParserOptions = {
        path: 'path/to/file.jsonld',
      };
      const doc = `{
  "@id": "ex:s",
  "ex:p": { "@id": "ex:o" }
}`;
      expect(await arrayifyStream(parser.parse(streamifyString(doc), options)))
        .toBeRdfIsomorphic([
          quad('ex:s', 'ex:p', 'ex:o'),
        ]);
    });

    it('for a JSON-LD stream with a local context', async() => {
      const options: RdfParserOptions = {
        path: 'path/to/file.jsonld',
        contexts: {
          'http://example.org/context.jsonld': {
            '@context': {
              '@vocab': 'http://vocab.org/',
            },
          },
        },
      };
      const doc = `{
  "@context": "http://example.org/context.jsonld",
  "@id": "ex:s",
  "p": { "@id": "ex:o" }
}`;
      expect(await arrayifyStream(parser.parse(streamifyString(doc), options)))
        .toBeRdfIsomorphic([
          quad('ex:s', 'http://vocab.org/p', 'ex:o'),
        ]);
    });

    it('for a strictly invalid JSON-LD stream should throw', async() => {
      const options: RdfParserOptions = {
        path: 'path/to/file.jsonld',
      };
      const doc = `{
  "@id": "ex:s",
  "p": { "@id": "ex:o" }
}`;
      await expect(arrayifyStream(parser.parse(streamifyString(doc), options))).rejects
        .toThrow(new Error(`Error while parsing file "path/to/file.jsonld": Invalid predicate IRI: p`));
    });

    it('for a Turtle stream with imports', async() => {
      const options: RdfParserOptions = {
        path: 'path/to/file.ttl',
      };
      const doc = `
<ex:s> <ex:p> <ex:o>.
<ex:s> <http://www.w3.org/2002/07/owl#imports> <http://example.org/myfile1.ttl>, <http://example.org/myfile2.ttl>.
`;
      expect(await arrayifyStream(parser.parse(streamifyString(doc), options)))
        .toBeRdfIsomorphic([
          quad('ex:s', 'ex:p', 'ex:o'),
          quad('ex:s', 'http://www.w3.org/2002/07/owl#imports', 'http://example.org/myfile1.ttl'),
          quad('ex:s', 'http://www.w3.org/2002/07/owl#imports', 'http://example.org/myfile2.ttl'),
          quad('ex:s1', 'ex:p1', 'ex:o1'),
          quad('ex:s2', 'ex:p2', 'ex:o2'),
        ]);
    });

    it('for a Turtle stream with import to unknown file', async() => {
      const options: RdfParserOptions = {
        path: 'path/to/file.ttl',
      };
      const doc = `
<ex:s> <ex:p> <ex:o>.
<ex:s> <http://www.w3.org/2002/07/owl#imports> <http://example.org/myfileunknown.ttl>.
`;
      await expect(arrayifyStream(parser.parse(streamifyString(doc), options))).rejects
        .toThrow(new Error(`Error while parsing file "path/to/file.ttl": URL not found: http://example.org/myfileunknown.ttl`));
    });

    it('for a Turtle stream with import to erroring file', async() => {
      const options: RdfParserOptions = {
        path: 'path/to/file.ttl',
      };
      const doc = `
<ex:s> <ex:p> <ex:o>.
<ex:s> <http://www.w3.org/2002/07/owl#imports> <http://example.org/myfileerror.ttl>.
`;
      await expect(arrayifyStream(parser.parse(streamifyString(doc), options))).rejects
        .toThrow(new Error(`Error while parsing file "http://example.org/myfileerror.ttl": Unexpected "<..." on line 1.`));
    });

    it('for a Turtle stream with nested import to unknown file', async() => {
      const options: RdfParserOptions = {
        path: 'path/to/file.ttl',
      };
      const doc = `
<ex:s> <ex:p> <ex:o>.
<ex:s> <http://www.w3.org/2002/07/owl#imports> <http://example.org/myfileunknownnest.ttl>.
`;
      await expect(arrayifyStream(parser.parse(streamifyString(doc), options))).rejects
        .toThrow(new Error(`Error while parsing file "http://example.org/myfileunknownnest.ttl": URL not found: http://example.org/myfileunknown.ttl`));
    });

    it('for a Turtle stream with nested import to erroring file', async() => {
      const options: RdfParserOptions = {
        path: 'path/to/file.ttl',
      };
      const doc = `
<ex:s> <ex:p> <ex:o>.
<ex:s> <http://www.w3.org/2002/07/owl#imports> <http://example.org/myfileerrornest.ttl>.
`;
      await expect(arrayifyStream(parser.parse(streamifyString(doc), options))).rejects
        .toThrow(new Error(`Error while parsing file "http://example.org/myfileerror.ttl": Unexpected "<..." on line 1.`));
    });

    it('for a Turtle stream with nested imports', async() => {
      const options: RdfParserOptions = {
        path: 'path/to/file.ttl',
      };
      const doc = `
<ex:s> <ex:p> <ex:o>.
<ex:s> <http://www.w3.org/2002/07/owl#imports> <http://example.org/myfilenest.ttl>.
`;
      expect(await arrayifyStream(parser.parse(streamifyString(doc), options)))
        .toBeRdfIsomorphic([
          quad('ex:s', 'ex:p', 'ex:o'),
          quad('ex:s', 'http://www.w3.org/2002/07/owl#imports', 'http://example.org/myfilenest.ttl'),
          quad('ex:s2', 'http://www.w3.org/2002/07/owl#imports', 'http://example.org/myfile1.ttl'),
          quad('ex:s1', 'ex:p1', 'ex:o1'),
        ]);
    });

    it('for a Turtle stream with imports, when ignoring imports', async() => {
      const options: RdfParserOptions = {
        path: 'path/to/file.ttl',
        ignoreImports: true,
      };
      const doc = `
<ex:s> <ex:p> <ex:o>.
<ex:s> <http://www.w3.org/2002/07/owl#imports> <http://example.org/myfile1.ttl>, <http://example.org/myfile2.ttl>.
`;
      expect(await arrayifyStream(parser.parse(streamifyString(doc), options)))
        .toBeRdfIsomorphic([
          quad('ex:s', 'ex:p', 'ex:o'),
          quad('ex:s', 'http://www.w3.org/2002/07/owl#imports', 'http://example.org/myfile1.ttl'),
          quad('ex:s', 'http://www.w3.org/2002/07/owl#imports', 'http://example.org/myfile2.ttl'),
        ]);
    });

    it('for a Turtle stream with imports, with n/a import paths', async() => {
      const options: RdfParserOptions = {
        path: 'path/to/file.ttl',
        importPaths: {
          'http://other.com': 'abc',
        },
      };
      const doc = `
<ex:s> <ex:p> <ex:o>.
<ex:s> <http://www.w3.org/2002/07/owl#imports> <http://example.org/myfile1.ttl>, <http://example.org/myfile2.ttl>.
`;
      expect(await arrayifyStream(parser.parse(streamifyString(doc), options)))
        .toBeRdfIsomorphic([
          quad('ex:s', 'ex:p', 'ex:o'),
          quad('ex:s', 'http://www.w3.org/2002/07/owl#imports', 'http://example.org/myfile1.ttl'),
          quad('ex:s', 'http://www.w3.org/2002/07/owl#imports', 'http://example.org/myfile2.ttl'),
          quad('ex:s1', 'ex:p1', 'ex:o1'),
          quad('ex:s2', 'ex:p2', 'ex:o2'),
        ]);
    });

    it('for a Turtle stream with imports, with import paths', async() => {
      const options: RdfParserOptions = {
        path: 'path/to/file.ttl',
        importPaths: {
          'http://example.org/': Path.join(__dirname, '../assets/rdf/'),
        },
      };
      const doc = `
<ex:s> <ex:p> <ex:o>.
<ex:s> <http://www.w3.org/2002/07/owl#imports> <http://example.org/a/myfile1.ttl>, <http://example.org/b/myfile2.ttl>.
`;
      expect(await arrayifyStream(parser.parse(streamifyString(doc), options)))
        .toBeRdfIsomorphic([
          quad('ex:s', 'ex:p', 'ex:o'),
          quad('ex:s', 'http://www.w3.org/2002/07/owl#imports', 'http://example.org/a/myfile1.ttl'),
          quad('ex:s', 'http://www.w3.org/2002/07/owl#imports', 'http://example.org/b/myfile2.ttl'),
          quad('ex:sl1', 'ex:pl1', 'ex:ol1'),
          quad('ex:sl2', 'ex:pl2', 'ex:ol2'),
        ]);
    });

    it('for a Turtle stream with imports, with import path to unknown file', async() => {
      const options: RdfParserOptions = {
        path: 'path/to/file.ttl',
        importPaths: {
          'http://example.org/': Path.join(__dirname, '../assets/rdf/'),
        },
      };
      const doc = `
<ex:s> <ex:p> <ex:o>.
<ex:s> <http://www.w3.org/2002/07/owl#imports> <http://example.org/myfileunknown.ttl>.
`;
      await expect(arrayifyStream(parser.parse(streamifyString(doc), options)))
        .rejects.toThrowError(/^Error while parsing file/u);
    });

    it('for a Turtle stream with imports, with import path to erroring file', async() => {
      const options: RdfParserOptions = {
        path: 'path/to/file.ttl',
        importPaths: {
          'http://example.org/': Path.join(__dirname, '../assets/rdf/'),
        },
      };
      const doc = `
<ex:s> <ex:p> <ex:o>.
<ex:s> <http://www.w3.org/2002/07/owl#imports> <http://example.org/myfileerror.ttl>.
`;
      await expect(arrayifyStream(parser.parse(streamifyString(doc), options)))
        .rejects.toThrowError(/^Error while parsing file/u);
    });

    it('for a Turtle stream with invalid IRI should produce logger warnings', async() => {
      const logger: any = {
        warn: jest.fn(),
      };
      const options: RdfParserOptions = {
        path: 'path/to/file.ttl',
        logger,
      };
      expect(await arrayifyStream(parser.parse(streamifyString(`<ex:s> <ex:p> <ex:o>.`), options)))
        .toBeRdfIsomorphic([
          quad('ex:s', 'ex:p', 'ex:o'),
        ]);
      expect(logger.warn).toHaveBeenCalledTimes(3);
      expect(logger.warn).toHaveBeenNthCalledWith(1, 'Detected potentially invalid IRI \'ex:s\' in path/to/file.ttl');
      expect(logger.warn).toHaveBeenNthCalledWith(2, 'Detected potentially invalid IRI \'ex:p\' in path/to/file.ttl');
      expect(logger.warn).toHaveBeenNthCalledWith(3, 'Detected potentially invalid IRI \'ex:o\' in path/to/file.ttl');
    });

    it('for a Turtle stream with valid IRIs should not produce logger warnings', async() => {
      const logger: any = {
        warn: jest.fn(),
      };
      const options: RdfParserOptions = {
        path: 'path/to/file.ttl',
        logger,
      };
      expect(await arrayifyStream(parser.parse(streamifyString(`<s> <p> <o>.`), options)))
        .toBeRdfIsomorphic([
          quad('file://path/to/s', 'file://path/to/p', 'file://path/to/o'),
        ]);
      expect(logger.warn).not.toHaveBeenCalled();
    });
  });

  describe('fetchFileOrUrl', () => {
    it('for a URL', async() => {
      expect(await stringifyStream(await RdfParser.fetchFileOrUrl('http://example.org/myfile1.ttl')))
        .toEqual(`<ex:s1> <ex:p1> <ex:o1>.`);
    });

    it('for a file without protocol', async() => {
      expect(await stringifyStream(await RdfParser.fetchFileOrUrl(Path.join(__dirname, '../assets/rdf/a/myfile1.ttl'))))
        .toEqual(`<ex:sl1> <ex:pl1> <ex:ol1>.
`);
    });

    it('for a file with protocol', async() => {
      expect(await stringifyStream(await RdfParser.fetchFileOrUrl(`file://${Path.join(__dirname, '../assets/rdf/a/myfile1.ttl')}`)))
        .toEqual(`<ex:sl1> <ex:pl1> <ex:ol1>.
`);
    });

    it('for a non-existing file without protocol', async() => {
      await expect(RdfParser.fetchFileOrUrl(Path.join(__dirname, '../assets/rdf/a/myfileunknown.ttl')))
        .rejects.toThrowError(/^ENOENT/u);
    });

    it('for a folder without protocol', async() => {
      await expect(RdfParser.fetchFileOrUrl(Path.join(__dirname, '../assets/rdf/a/')))
        .rejects.toThrowError(/^Path does not refer to a valid file/u);
    });
  });
});
