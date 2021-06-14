import { createReadStream } from 'fs';
import type { Readable } from 'stream';
import type * as RDF from 'rdf-js';
import type { ParseOptions } from 'rdf-parse';
import rdfParser from 'rdf-parse';
import type { Logger } from 'winston';
import { PrefetchedDocumentLoader } from './PrefetchedDocumentLoader';
import { RdfStreamIncluder } from './RdfStreamIncluder';
// Import syntax only works in Node > 12
const fs = require('fs').promises;

/**
 * Parses a data stream to a triple stream.
 */
export class RdfParser {
  /**
   * Parses the given stream into RDF quads.
   * @param textStream A text stream.
   * @param options Parsing options.
   */
  public parse(textStream: NodeJS.ReadableStream, options: RdfParserOptions): RDF.Stream & Readable {
    // Parsing libraries don't work as expected if path contains backslashes
    options.path = options.path.replace(/\\+/gu, '/');

    if (!options.baseIRI) {
      options.baseIRI = options.path;
      // Windows paths always contain a ':'
      if (!options.baseIRI.includes(':') || /^[A-Za-z]:[/\\][^/]/u.test(options.baseIRI)) {
        options.baseIRI = `file://${options.baseIRI}`;
      }
    }

    // Set JSON-LD parser options
    (<any> options)['@comunica/actor-rdf-parse-jsonld:parserOptions'] = {
      // Override the JSON-LD document loader
      documentLoader: new PrefetchedDocumentLoader({
        contexts: options.contexts || {},
        logger: options.logger,
        path: options.path,
      }),
      // Enable strict parsing of JSON-LD to error on potential user config errors
      strictValues: true,
      // If JSON-LD context validation should be skipped
      skipContextValidation: options.skipContextValidation,
    };

    // Execute parsing
    const quadStream = rdfParser.parse(textStream, options);
    const includedQuadStream = quadStream.pipe(new RdfStreamIncluder(options));
    quadStream.on('error', (error: Error) => includedQuadStream
      .emit('error', RdfParser.addPathToError(error, options.path)));
    return includedQuadStream;
  }

  /**
   * Get the file contents from a file path or URL.
   * @param pathOrUrl The file path or url.
   * @returns {Promise<T>} A promise resolving to the data stream.
   */
  public static async fetchFileOrUrl(pathOrUrl: string): Promise<Readable> {
    if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
      return <any> (await fetch(pathOrUrl)).body;
    }
    if (pathOrUrl.startsWith('file://')) {
      pathOrUrl = pathOrUrl.slice(7);
    }
    if (!(await fs.stat(pathOrUrl)).isFile()) {
      throw new Error(`Path does not refer to a valid file: ${pathOrUrl}`);
    }
    return createReadStream(pathOrUrl);
  }

  /**
   * Add the path to an error message.
   * @param error The original error message.
   * @param path The file path or URL.
   * @returns {Error} The new error with file path context.
   */
  public static addPathToError(error: Error, path: string): Error {
    return new Error(`Error while parsing file "${path}": ${error.message}`);
  }
}

export type RdfParserOptions = ParseOptions & {
  /**
   * If imports in the RDF document should be ignored.
   */
  ignoreImports?: boolean;
  /**
   * The file name or URL that is being parsed.
   */
  path: string;
  /**
   * The cached JSON-LD contexts.
   */
  contexts?: Record<string, any>;
  /**
   * The cached import paths.
   */
  importPaths?: Record<string, string>;
  /**
   * The path this file has been imported from.
   * Undefined if this file is the root file.
   */
  importedFromPath?: string;
  /**
   * An optional logger.
   */
  logger?: Logger;
  /**
   * If JSON-LD context validation should be skipped.
   */
  skipContextValidation?: boolean;
};
