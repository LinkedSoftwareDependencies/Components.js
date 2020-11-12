import Path = require('path');
import type { Readable, TransformCallback } from 'stream';
import { Transform } from 'stream';
import { DataFactory } from 'rdf-data-factory';
import type * as RDF from 'rdf-js';
import { getNamedNodes, getTerms, mapTerms } from 'rdf-terms';
import Util = require('../Util');
import { isValidIri } from '../Util';
import { RdfParser } from './RdfParser';
import type { RdfParserOptions } from './RdfParser';

const DF = new DataFactory();

/**
 * A RdfStreamIncluder takes a triple stream and detects owl:includes to automatically include other files.
 */
export class RdfStreamIncluder extends Transform {
  private static readonly RELATIVE_PATH_MATCHER: RegExp = /^"file:\/\/([^/].*)".*$/u;

  private runningImporters = 1;
  private readonly parserOptions: RdfParserOptions;
  private flushCallback: TransformCallback | undefined;

  public constructor(parserOptions: RdfParserOptions) {
    super({ objectMode: true });
    (<any> this)._readableState.objectMode = true;
    this.parserOptions = parserOptions;
  }

  public _transform(quad: RDF.Quad, encoding: string, callback: TransformCallback): boolean {
    this.handleImports(quad);
    this.absolutizeRelativePaths(quad);
    this.validateIris(quad);
    callback(null, quad);
    return true;
  }

  public _flush(callback: TransformCallback): void {
    if (--this.runningImporters === 0) {
      // eslint-disable-next-line callback-return
      callback();
    } else {
      this.flushCallback = callback;
    }
  }

  /**
   * Follow all import links in the given quad.
   * @param quad A quad.
   */
  public handleImports(quad: RDF.Quad): void {
    if (!this.parserOptions.ignoreImports && quad.predicate.value === `${Util.PREFIXES.owl}imports`) {
      this.runningImporters++;
      let relativeFilePath = quad.object.value;

      // Try overriding path using defined import paths
      if (this.parserOptions.importPaths) {
        for (const prefix of Object.keys(this.parserOptions.importPaths)) {
          if (relativeFilePath.startsWith(prefix)) {
            relativeFilePath = Path.join(
              this.parserOptions.importPaths[prefix],
              relativeFilePath.slice(prefix.length),
            );
            break;
          }
        }
      }

      const errorHandler = (error: Error): boolean => this.emit('error', Util
        .addFilePathToError(error, relativeFilePath, this.parserOptions.baseIRI));

      // Recursively call the parser
      Util.getContentsFromUrlOrPath(relativeFilePath, this.parserOptions.baseIRI)
        .then((rawStream: Readable) => {
          const data: Readable = new RdfParser().parse(rawStream, {
            ...this.parserOptions,
            path: relativeFilePath,
            importedFromPath: this.parserOptions.path,
          });
          data
            .on('data', (subData: RDF.Quad) => this.push(subData))
            .on('error', errorHandler)
            .on('end', () => {
              if (this.flushCallback && --this.runningImporters === 0) {
                this.flushCallback();
              }
            });
        })
        .catch(errorHandler);
    }
  }

  /**
   * Convert all relative paths in the given quad's terms into absolute paths.
   * @param quad A quad.
   */
  public absolutizeRelativePaths(quad: RDF.Quad): RDF.Quad {
    if (this.parserOptions.absolutizeRelativePaths) {
      quad = mapTerms(quad, term => {
        if (term.termType !== 'NamedNode') {
          return term;
        }
        // Make relative paths absolute
        const match = RdfStreamIncluder.RELATIVE_PATH_MATCHER.exec(term.value);
        if (match) {
          if (!this.parserOptions.baseIRI) {
            this.emit('error', new Error('Tried to absolutize relative paths with an undefined baseIRI'));
          } else {
            return DF.namedNode(`"file:///${Path.join(this.parserOptions.baseIRI, match[1])}"${Util.PREFIXES.xsd}string`);
          }
        }
        return term;
      });
    }
    return quad;
  }

  /**
   * Emit a warning for all named nodes in the given quad that may be invalid.
   * @param quad A quad.
   */
  public validateIris(quad: RDF.Quad): void {
    if (this.parserOptions.logger) {
      for (const term of getNamedNodes(getTerms(quad))) {
        if (!isValidIri(term.value)) {
          this.parserOptions.logger.warn(`Detected potentially invalid IRI '${term.value}' in ${this.parserOptions.path}`);
        }
      }
    }
  }
}
