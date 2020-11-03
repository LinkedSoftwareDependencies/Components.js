import * as RDF from 'rdf-js';
import { Readable } from "stream";
import rdfParser, { ParseOptions } from 'rdf-parse';
import { RdfStreamIncluder } from './RdfStreamIncluder';
import * as Path from 'path';
import Util = require('../Util');
import { PrefetchedDocumentLoader } from './PrefetchedDocumentLoader';

/**
 * Parses a data stream to a triple stream.
 */
export class RdfParser {
  public parse(textStream: NodeJS.ReadableStream, options: RdfParserOptions): RDF.Stream & Readable {
    if (!options.fromPath) options.fromPath = Path.dirname(options.path);
    if (!options.baseIRI) {
      options.baseIRI = options.path;
      if (options.baseIRI.indexOf(':') < 0) {
        options.baseIRI = 'file://' + options.baseIRI;
      }
    }
    (<any> options)['@comunica/actor-rdf-parse-jsonld:documentLoader'] = new PrefetchedDocumentLoader(options.contexts || {});
    (<any> options)['@comunica/actor-rdf-parse-jsonld:strictValues'] = true;
    const quadStream = rdfParser.parse(textStream, options);
    const includedQuadStream = quadStream.pipe(new RdfStreamIncluder(options));
    textStream.on('error', (error) => includedQuadStream.emit('error', Util.addFilePathToError(error, <string> (options.path || options.baseIRI), options.path ? options.baseIRI : undefined)));
    quadStream.on('error', (error) => includedQuadStream.emit('error', Util.addFilePathToError(error, <string> (options.path || options.baseIRI), options.path ? options.baseIRI : undefined)));
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
  contexts?: {[id: string]: any}
  /**
   * The cached import paths.
   */
  importPaths?: {[id: string]: string}
  /**
   * If relative paths 'file://' should be made absolute 'file:///'.
   */
  absolutizeRelativePaths?: boolean
}
