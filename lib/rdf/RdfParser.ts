import * as RDF from 'rdf-js';
import { Readable } from "stream";
import rdfParser, { ParseOptions } from 'rdf-parse';
import { RdfStreamIncluder } from './RdfStreamIncluder';
import * as Path from 'path';
import Util = require('../Util');

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
    // TODO: pass context to avoid looking it up via HTTP every time
    /*
    {
        'https://linkedsoftwaredependencies.org/bundles/npm/componentsjs/^3.0.0/components/context.jsonld':
            fs.readFileSync(__dirname + '/../../components/context.jsonld', 'utf8')
    }
     */
    // TODO: somehow enable strictValues in jsonld parser
    const quadStream = rdfParser.parse(textStream, options);
    const includedQuadStream = quadStream.pipe(new RdfStreamIncluder(options));
    textStream.on('error', (error) => includedQuadStream.emit('error', Util.addFilePathToError(error, options.path || options.baseIRI, options.path ? options.baseIRI : null)));
    quadStream.on('error', (error) => includedQuadStream.emit('error', Util.addFilePathToError(error, options.path || options.baseIRI, options.path ? options.baseIRI : null)));
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
  fromPath: string;
  /**
   * The cached JSON-LD contexts
   */
  contexts?: {[id: string]: string}
  /**
   * The cached import paths.
   */
  importPaths?: {[id: string]: string}
  /**
   * If relative paths 'file://' should be made absolute 'file:///'.
   */
  absolutizeRelativePaths?: boolean
}
