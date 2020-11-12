import * as Path from 'path';
import type { Readable } from 'stream';
import type * as RDF from 'rdf-js';
import type { ParseOptions } from 'rdf-parse';
import rdfParser from 'rdf-parse';
import type { Logger } from 'winston';
import Util = require('../Util');
import { PrefetchedDocumentLoader } from './PrefetchedDocumentLoader';
import { RdfStreamIncluder } from './RdfStreamIncluder';

/**
 * Parses a data stream to a triple stream.
 */
export class RdfParser {
  public parse(textStream: NodeJS.ReadableStream, options: RdfParserOptions): RDF.Stream & Readable {
    if (!options.fromPath) {
      options.fromPath = Path.dirname(options.path);
    }
    if (!options.baseIRI) {
      options.baseIRI = options.path;
      if (!options.baseIRI.includes(':')) {
        options.baseIRI = `file://${options.baseIRI}`;
      }
    }
    (<any> options)['@comunica/actor-rdf-parse-jsonld:documentLoader'] =
      new PrefetchedDocumentLoader(options.contexts || {});
    (<any> options)['@comunica/actor-rdf-parse-jsonld:strictValues'] = true;
    const quadStream = rdfParser.parse(textStream, options);
    const includedQuadStream = quadStream.pipe(new RdfStreamIncluder(options));
    textStream.on('error', errorListener);
    quadStream.on('error', errorListener);
    function errorListener(error: Error): void {
      includedQuadStream.emit('error', Util.addFilePathToError(
        error,
        <string> (options.path || options.baseIRI),
        options.path ? options.baseIRI : undefined,
      ));
    }
    return includedQuadStream;
  }
}

export type RdfParserOptions = ParseOptions & {
  /**
   * If imports should be ignored.
   */
  ignoreImports?: boolean;
  /**
   * The file name or URL that is being parsed.
   */
  path: string;
  /**
   * The path to base relative paths on.
   * Used for error reporting.
   */
  fromPath?: string;
  /**
   * The cached JSON-LD contexts
   */
  contexts?: Record<string, any>;
  /**
   * The cached import paths.
   */
  importPaths?: Record<string, string>;
  /**
   * If relative paths 'file://' should be made absolute 'file:///'.
   */
  absolutizeRelativePaths?: boolean;
  /**
   * An optional logger.
   */
  logger?: Logger;
};
