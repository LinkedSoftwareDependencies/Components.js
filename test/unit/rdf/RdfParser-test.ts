import * as Path from 'node:path';
import { PassThrough } from 'node:stream';
import type * as RDF from '@rdfjs/types';
import { DataFactory } from 'rdf-data-factory';
import type { RdfParserOptions } from '../../../lib/rdf/RdfParser';
import { RdfParser } from '../../../lib/rdf/RdfParser';
import 'jest-rdf';

// Import syntax only works in Node > 12
const arrayifyStream = require('arrayify-stream');
const quad = require('rdf-quad');
const stringifyStream = require('stream-to-string');
const streamifyString = require('streamify-string');

// The body of http://example.org/myfilestreaming.ttl, which tests write to themselves
let resolveStreamingBody: (body: PassThrough) => void;
let streamingBody: Promise<PassThrough>;

globalThis.fetch = <any>jest.fn(async(url: string) => {
  if (url === 'http://example.org/myfilestreaming.ttl') {
    const body = new PassThrough();
    resolveStreamingBody(body);
    return {
      body,
      ok: true,
      headers: new Headers({ 'Content-Type': 'text/turtle' }),
      statusText: 'OK',
    };
  }
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
      body: streamifyString(`<ex:s2> <http://www.w3.org/2000/01/rdf-schema#seeAlso> <http://example.org/myfile1.ttl>.`),
      ok: true,
      headers: new Headers({ 'Content-Type': 'text/turtle' }),
      statusText: 'OK',
    };
  }
  if (url === 'http://example.org/myfileslow.ttl') {
    await new Promise(resolve => setTimeout(resolve, 50));
    return {
      body: streamifyString(`<ex:s3> <ex:p3> <ex:o3>.`),
      ok: true,
      headers: new Headers({ 'Content-Type': 'text/turtle' }),
      statusText: 'OK',
    };
  }
  if (url === 'http://example.org/myfileslownest.ttl') {
    await new Promise(resolve => setTimeout(resolve, 50));
    return {
      body: streamifyString(`<ex:s3> <http://www.w3.org/2000/01/rdf-schema#seeAlso> <http://example.org/myfile1.ttl>.`),
      ok: true,
      headers: new Headers({ 'Content-Type': 'text/turtle' }),
      statusText: 'OK',
    };
  }
  if (url === 'http://example.org/myfileblank.ttl') {
    return {
      body: streamifyString(`[] <ex:p1> <ex:o1>.
<ex:s1> <http://www.w3.org/2000/01/rdf-schema#seeAlso> <http://example.org/myfileblanknest.ttl>.`),
      ok: true,
      headers: new Headers({ 'Content-Type': 'text/turtle' }),
      statusText: 'OK',
    };
  }
  if (url === 'http://example.org/myfileblanknest.ttl') {
    return {
      body: streamifyString(`[] <ex:p2> <ex:o2>.`),
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
      body: streamifyString(`<ex:s2> <http://www.w3.org/2000/01/rdf-schema#seeAlso> <http://example.org/myfileunknown.ttl>.`),
      ok: true,
      headers: new Headers({ 'Content-Type': 'text/turtle' }),
      statusText: 'OK',
    };
  }
  if (url === 'http://example.org/myfileerrornest.ttl') {
    return {
      body: streamifyString(`<ex:s2> <http://www.w3.org/2000/01/rdf-schema#seeAlso> <http://example.org/myfileerror.ttl>.`),
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
      await expect(arrayifyStream(parser.parse(streamifyString(``), options))).resolves
        .toEqual([]);
    });

    it('for a Turtle stream', async() => {
      const options: RdfParserOptions = {
        path: 'path/to/file.ttl',
      };
      await expect(arrayifyStream(parser.parse(streamifyString(`<ex:s> <ex:p> <ex:o>.`), options))).resolves
        .toBeRdfIsomorphic([
          quad('ex:s', 'ex:p', 'ex:o'),
        ]);
    });

    it('for a Turtle stream with relative IRIs should resolve to default baseIRI', async() => {
      const options: RdfParserOptions = {
        path: 'path/to/file.ttl',
      };
      await expect(arrayifyStream(parser.parse(streamifyString(`<s> <ex:p> <ex:o>.`), options))).resolves
        .toBeRdfIsomorphic([
          quad('file://path/to/s', 'ex:p', 'ex:o'),
        ]);
    });

    it('for a Turtle stream with relative IRIs should resolve to default baseIRI with normalized path', async() => {
      const options: RdfParserOptions = {
        path: 'path/./to/file.ttl',
      };
      await expect(arrayifyStream(parser.parse(streamifyString(`<s> <ex:p> <ex:o>.`), options))).resolves
        .toBeRdfIsomorphic([
          quad('file://path/to/s', 'ex:p', 'ex:o'),
        ]);
    });

    it('for a Turtle stream with relative IRIs should resolve to default baseIRI with abs path', async() => {
      const options: RdfParserOptions = {
        path: '/path/to/file.ttl',
      };
      await expect(arrayifyStream(parser.parse(streamifyString(`<s> <ex:p> <ex:o>.`), options))).resolves
        .toBeRdfIsomorphic([
          quad('file:///path/to/s', 'ex:p', 'ex:o'),
        ]);
    });

    it('for a Turtle stream with relative IRIs should resolve to default baseIRI with abs windows path', async() => {
      const options: RdfParserOptions = {
        path: 'C:/path/to/file.ttl',
      };
      await expect(arrayifyStream(parser.parse(streamifyString(`<s> <ex:p> <ex:o>.`), options))).resolves
        .toBeRdfIsomorphic([
          quad('file://C:/path/to/s', 'ex:p', 'ex:o'),
        ]);
    });

    it('for a Turtle stream with relative IRIs should resolve to default baseIRI with IRI path', async() => {
      const options: RdfParserOptions = {
        path: 'http://example.org/file.ttl',
      };
      await expect(arrayifyStream(parser.parse(streamifyString(`<s> <ex:p> <ex:o>.`), options))).resolves
        .toBeRdfIsomorphic([
          quad('http://example.org/s', 'ex:p', 'ex:o'),
        ]);
    });

    it('for a Turtle stream with relative IRIs and a given baseIRI', async() => {
      const options: RdfParserOptions = {
        path: 'path/to/file.ttl',
        baseIRI: 'http://base.org/',
      };
      await expect(arrayifyStream(parser.parse(streamifyString(`<s> <ex:p> <ex:o>.`), options))).resolves
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
      await expect(arrayifyStream(parser.parse(streamifyString(doc), options))).resolves
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
      await expect(arrayifyStream(parser.parse(streamifyString(doc), options))).resolves
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
<ex:s> <http://www.w3.org/2000/01/rdf-schema#seeAlso> <http://example.org/myfile1.ttl>, <http://example.org/myfile2.ttl>.
`;
      await expect(arrayifyStream(parser.parse(streamifyString(doc), options))).resolves
        .toBeRdfIsomorphic([
          quad('ex:s', 'ex:p', 'ex:o'),
          quad('ex:s', 'http://www.w3.org/2000/01/rdf-schema#seeAlso', 'http://example.org/myfile1.ttl'),
          quad('ex:s', 'http://www.w3.org/2000/01/rdf-schema#seeAlso', 'http://example.org/myfile2.ttl'),
          quad('ex:s1', 'ex:p1', 'ex:o1'),
          quad('ex:s2', 'ex:p2', 'ex:o2'),
        ]);
    });

    it('for a Turtle stream with encoded imports', async() => {
      const options: RdfParserOptions = {
        path: 'path/to/file.ttl',
      };
      const doc = `
<ex:s> <ex:p> <ex:o>.
<ex:s> <http://www.w3.org/2000/01/rdf-schema#seeAlso> <http://example.org/myfile1%2Ettl>, <http://example.org/myfile2%2Ettl>.
`;
      await expect(arrayifyStream(parser.parse(streamifyString(doc), options))).resolves
        .toBeRdfIsomorphic([
          quad('ex:s', 'ex:p', 'ex:o'),
          quad('ex:s', 'http://www.w3.org/2000/01/rdf-schema#seeAlso', 'http://example.org/myfile1%2Ettl'),
          quad('ex:s', 'http://www.w3.org/2000/01/rdf-schema#seeAlso', 'http://example.org/myfile2%2Ettl'),
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
<ex:s> <http://www.w3.org/2000/01/rdf-schema#seeAlso> <http://example.org/myfileunknown.ttl>.
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
<ex:s> <http://www.w3.org/2000/01/rdf-schema#seeAlso> <http://example.org/myfileerror.ttl>.
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
<ex:s> <http://www.w3.org/2000/01/rdf-schema#seeAlso> <http://example.org/myfileunknownnest.ttl>.
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
<ex:s> <http://www.w3.org/2000/01/rdf-schema#seeAlso> <http://example.org/myfileerrornest.ttl>.
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
<ex:s> <http://www.w3.org/2000/01/rdf-schema#seeAlso> <http://example.org/myfilenest.ttl>.
`;
      await expect(arrayifyStream(parser.parse(streamifyString(doc), options))).resolves
        .toBeRdfIsomorphic([
          quad('ex:s', 'ex:p', 'ex:o'),
          quad('ex:s', 'http://www.w3.org/2000/01/rdf-schema#seeAlso', 'http://example.org/myfilenest.ttl'),
          quad('ex:s2', 'http://www.w3.org/2000/01/rdf-schema#seeAlso', 'http://example.org/myfile1.ttl'),
          quad('ex:s1', 'ex:p1', 'ex:o1'),
        ]);
    });

    it('for a Turtle stream with imports should emit imports in their order, regardless of loading time', async() => {
      const options: RdfParserOptions = {
        path: 'path/to/file.ttl',
      };
      const doc = `
<ex:s> <ex:p> <ex:o>.
<ex:s> <http://www.w3.org/2000/01/rdf-schema#seeAlso> <http://example.org/myfileslow.ttl>, <http://example.org/myfile2.ttl>.
`;
      await expect(arrayifyStream(parser.parse(streamifyString(doc), options))).resolves
        .toEqualRdfQuadArray([
          quad('ex:s', 'ex:p', 'ex:o'),
          quad('ex:s', 'http://www.w3.org/2000/01/rdf-schema#seeAlso', 'http://example.org/myfileslow.ttl'),
          quad('ex:s', 'http://www.w3.org/2000/01/rdf-schema#seeAlso', 'http://example.org/myfile2.ttl'),
          quad('ex:s3', 'ex:p3', 'ex:o3'),
          quad('ex:s2', 'ex:p2', 'ex:o2'),
        ]);
    });

    it('for a Turtle stream with nested imports should emit each import before the next one', async() => {
      const options: RdfParserOptions = {
        path: 'path/to/file.ttl',
      };
      const doc = `
<ex:s> <http://www.w3.org/2000/01/rdf-schema#seeAlso> <http://example.org/myfileslownest.ttl>, <http://example.org/myfile2.ttl>.
`;
      await expect(arrayifyStream(parser.parse(streamifyString(doc), options))).resolves
        .toEqualRdfQuadArray([
          quad('ex:s', 'http://www.w3.org/2000/01/rdf-schema#seeAlso', 'http://example.org/myfileslownest.ttl'),
          quad('ex:s', 'http://www.w3.org/2000/01/rdf-schema#seeAlso', 'http://example.org/myfile2.ttl'),
          quad('ex:s3', 'http://www.w3.org/2000/01/rdf-schema#seeAlso', 'http://example.org/myfile1.ttl'),
          quad('ex:s1', 'ex:p1', 'ex:o1'),
          quad('ex:s2', 'ex:p2', 'ex:o2'),
        ]);
    });

    it('for a Turtle stream with an import should emit quads of the import while it is being parsed', async() => {
      streamingBody = new Promise(resolve => resolveStreamingBody = resolve);
      const options: RdfParserOptions = {
        path: 'path/to/file.ttl',
      };
      const doc = `
<ex:s> <http://www.w3.org/2000/01/rdf-schema#seeAlso> <http://example.org/myfilestreaming.ttl>.
`;
      const quads: RDF.Quad[] = [];
      let resolveImportedQuad: () => void;
      const importedQuad = new Promise<void>(resolve => resolveImportedQuad = resolve);
      const stream = parser.parse(streamifyString(doc), options)
        .on('data', (data: RDF.Quad) => {
          quads.push(data);
          if (data.subject.value === 'ex:s4') {
            resolveImportedQuad();
          }
        });
      const ended = new Promise(resolve => stream.on('end', resolve));

      // The first quad of the import is emitted before the import has ended
      const body = await streamingBody;
      body.write(`<ex:s4> <ex:p4> <ex:o4>.\n`);
      await importedQuad;
      await new Promise(resolve => setImmediate(resolve));
      expect(quads).toEqualRdfQuadArray([
        quad('ex:s', 'http://www.w3.org/2000/01/rdf-schema#seeAlso', 'http://example.org/myfilestreaming.ttl'),
        quad('ex:s4', 'ex:p4', 'ex:o4'),
      ]);

      body.end(`<ex:s5> <ex:p5> <ex:o5>.\n`);
      await ended;
      expect(quads).toEqualRdfQuadArray([
        quad('ex:s', 'http://www.w3.org/2000/01/rdf-schema#seeAlso', 'http://example.org/myfilestreaming.ttl'),
        quad('ex:s4', 'ex:p4', 'ex:o4'),
        quad('ex:s5', 'ex:p5', 'ex:o5'),
      ]);
    });

    it('for a Turtle stream with a slow import followed by an import to unknown file', async() => {
      const options: RdfParserOptions = {
        path: 'path/to/file.ttl',
      };
      const doc = `
<ex:s> <http://www.w3.org/2000/01/rdf-schema#seeAlso> <http://example.org/myfileslow.ttl>, <http://example.org/myfileunknown.ttl>.
`;
      await expect(arrayifyStream(parser.parse(streamifyString(doc), options))).rejects
        .toThrow(new Error(`Error while parsing file "path/to/file.ttl": URL not found: http://example.org/myfileunknown.ttl`));
    });

    it('for a Turtle stream with imports and a blank node prefix should derive prefixes for imports', async() => {
      const options: RdfParserOptions = {
        path: 'path/to/file.ttl',
        blankNodePrefix: 'p_',
      };
      const doc = `
[] <ex:p> <ex:o>.
<ex:s> <http://www.w3.org/2000/01/rdf-schema#seeAlso> <http://example.org/myfile1.ttl>, <http://example.org/myfileblank.ttl>.
`;
      await expect(arrayifyStream(parser.parse(streamifyString(doc), options))).resolves
        .toEqualRdfQuadArray([
          quad('_:p_0', 'ex:p', 'ex:o'),
          quad('ex:s', 'http://www.w3.org/2000/01/rdf-schema#seeAlso', 'http://example.org/myfile1.ttl'),
          quad('ex:s', 'http://www.w3.org/2000/01/rdf-schema#seeAlso', 'http://example.org/myfileblank.ttl'),
          quad('ex:s1', 'ex:p1', 'ex:o1'),
          quad('_:p_1_0', 'ex:p1', 'ex:o1'),
          quad('ex:s1', 'http://www.w3.org/2000/01/rdf-schema#seeAlso', 'http://example.org/myfileblanknest.ttl'),
          quad('_:p_1_0_0', 'ex:p2', 'ex:o2'),
        ]);
    });

    it('for a Turtle stream with a blank node prefix and a data factory should use the data factory', async() => {
      const options: RdfParserOptions = {
        path: 'path/to/file.ttl',
        blankNodePrefix: 'p_',
        dataFactory: new DataFactory({ blankNodePrefix: 'f_' }),
      };
      const doc = `
[] <ex:p> <ex:o>.
<ex:s> <http://www.w3.org/2000/01/rdf-schema#seeAlso> <http://example.org/myfileblanknest.ttl>.
`;
      await expect(arrayifyStream(parser.parse(streamifyString(doc), options))).resolves
        .toEqualRdfQuadArray([
          quad('_:f_0', 'ex:p', 'ex:o'),
          quad('ex:s', 'http://www.w3.org/2000/01/rdf-schema#seeAlso', 'http://example.org/myfileblanknest.ttl'),
          quad('_:f_1', 'ex:p2', 'ex:o2'),
        ]);
    });

    it('for a Turtle stream with imports, when ignoring imports', async() => {
      const options: RdfParserOptions = {
        path: 'path/to/file.ttl',
        ignoreImports: true,
      };
      const doc = `
<ex:s> <ex:p> <ex:o>.
<ex:s> <http://www.w3.org/2000/01/rdf-schema#seeAlso> <http://example.org/myfile1.ttl>, <http://example.org/myfile2.ttl>.
`;
      await expect(arrayifyStream(parser.parse(streamifyString(doc), options))).resolves
        .toBeRdfIsomorphic([
          quad('ex:s', 'ex:p', 'ex:o'),
          quad('ex:s', 'http://www.w3.org/2000/01/rdf-schema#seeAlso', 'http://example.org/myfile1.ttl'),
          quad('ex:s', 'http://www.w3.org/2000/01/rdf-schema#seeAlso', 'http://example.org/myfile2.ttl'),
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
<ex:s> <http://www.w3.org/2000/01/rdf-schema#seeAlso> <http://example.org/myfile1.ttl>, <http://example.org/myfile2.ttl>.
`;
      await expect(arrayifyStream(parser.parse(streamifyString(doc), options))).resolves
        .toBeRdfIsomorphic([
          quad('ex:s', 'ex:p', 'ex:o'),
          quad('ex:s', 'http://www.w3.org/2000/01/rdf-schema#seeAlso', 'http://example.org/myfile1.ttl'),
          quad('ex:s', 'http://www.w3.org/2000/01/rdf-schema#seeAlso', 'http://example.org/myfile2.ttl'),
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
<ex:s> <http://www.w3.org/2000/01/rdf-schema#seeAlso> <http://example.org/a/myfile1.ttl>, <http://example.org/b/myfile2.ttl>.
`;
      await expect(arrayifyStream(parser.parse(streamifyString(doc), options))).resolves
        .toBeRdfIsomorphic([
          quad('ex:s', 'ex:p', 'ex:o'),
          quad('ex:s', 'http://www.w3.org/2000/01/rdf-schema#seeAlso', 'http://example.org/a/myfile1.ttl'),
          quad('ex:s', 'http://www.w3.org/2000/01/rdf-schema#seeAlso', 'http://example.org/b/myfile2.ttl'),
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
<ex:s> <http://www.w3.org/2000/01/rdf-schema#seeAlso> <http://example.org/myfileunknown.ttl>.
`;
      await expect(arrayifyStream(parser.parse(streamifyString(doc), options)))
        .rejects.toThrow(/^Error while parsing file/u);
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
<ex:s> <http://www.w3.org/2000/01/rdf-schema#seeAlso> <http://example.org/myfileerror.ttl>.
`;
      await expect(arrayifyStream(parser.parse(streamifyString(doc), options)))
        .rejects.toThrow(/^Error while parsing file/u);
    });

    it('for a Turtle stream with invalid IRI should produce logger warnings', async() => {
      const logger: any = {
        warn: jest.fn(),
      };
      const options: RdfParserOptions = {
        path: 'path/to/file.ttl',
        logger,
      };
      await expect(arrayifyStream(parser.parse(streamifyString(`<ex:s> <ex:p> <ex:o>.`), options))).resolves
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
      await expect(arrayifyStream(parser.parse(streamifyString(`<s> <p> <o>.`), options))).resolves
        .toBeRdfIsomorphic([
          quad('file://path/to/s', 'file://path/to/p', 'file://path/to/o'),
        ]);
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('for a Turtle stream with relative IRIs for defined importPaths', async() => {
      const logger: any = {
        warn: jest.fn(),
      };
      const options: RdfParserOptions = {
        path: 'path/to/file.ttl',
        importPaths: {
          'http://example.org/': 'path/to/',
        },
        logger,
      };
      await expect(arrayifyStream(parser.parse(streamifyString(`<s> <p> <o>.`), options))).resolves
        .toBeRdfIsomorphic([
          quad('http://example.org/s', 'http://example.org/p', 'http://example.org/o'),
        ]);
      expect(logger.warn).not.toHaveBeenCalled();
    });
  });

  describe('fetchFileOrUrl', () => {
    it('for a URL', async() => {
      await expect(stringifyStream(await RdfParser.fetchFileOrUrl('http://example.org/myfile1.ttl'))).resolves
        .toBe(`<ex:s1> <ex:p1> <ex:o1>.`);
    });

    it('for a file without protocol', async() => {
      const filePath = Path.join(__dirname, '../assets/rdf/a/myfile1.ttl');
      await expect(stringifyStream(await RdfParser.fetchFileOrUrl(filePath))).resolves
        .toBe(`<ex:sl1> <ex:pl1> <ex:ol1>.
`);
    });

    it('for a file with protocol', async() => {
      await expect(stringifyStream(await RdfParser.fetchFileOrUrl(`file://${Path.join(__dirname, '../assets/rdf/a/myfile1.ttl')}`))).resolves
        .toBe(`<ex:sl1> <ex:pl1> <ex:ol1>.
`);
    });

    it('for a non-existing file without protocol', async() => {
      await expect(RdfParser.fetchFileOrUrl(Path.join(__dirname, '../assets/rdf/a/myfileunknown.ttl')))
        .rejects.toThrow(/^ENOENT/u);
    });

    it('for a folder without protocol', async() => {
      await expect(RdfParser.fetchFileOrUrl(Path.join(__dirname, '../assets/rdf/a/')))
        .rejects.toThrow(/^Path does not refer to a valid file/u);
    });
  });
});
