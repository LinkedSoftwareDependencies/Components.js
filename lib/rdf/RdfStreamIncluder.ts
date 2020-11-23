import Path = require('path');
import type { Readable, TransformCallback } from 'stream';
import { Transform } from 'stream';
import type * as RDF from 'rdf-js';
import { getNamedNodes, getTerms } from 'rdf-terms';
import Util = require('../Util');
import { RdfParser } from './RdfParser';
import type { RdfParserOptions } from './RdfParser';

/**
 * A RdfStreamIncluder takes a triple stream and detects owl:includes to automatically include other files.
 */
export class RdfStreamIncluder extends Transform {
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

      // Recursively call the parser
      RdfParser.fetchFileOrUrl(relativeFilePath)
        .then((rawStream: Readable) => {
          const data: Readable = new RdfParser().parse(rawStream, {
            ...this.parserOptions,
            path: relativeFilePath,
            importedFromPath: this.parserOptions.path,
          });
          data
            .on('data', (subData: RDF.Quad) => this.push(subData))
            .on('error', (error: Error): boolean => this.emit('error', error))
            .on('end', () => {
              if (this.flushCallback && --this.runningImporters === 0) {
                this.flushCallback();
              }
            });
        })
        .catch((error: Error) => this.emit('error', RdfParser.addPathToError(error, this.parserOptions.path)));
    }
  }

  /**
   * Emit a warning for all named nodes in the given quad that may be invalid.
   * @param quad A quad.
   */
  public validateIris(quad: RDF.Quad): void {
    if (this.parserOptions.logger) {
      for (const term of getNamedNodes(getTerms(quad))) {
        if (!RdfStreamIncluder.isValidIri(term.value)) {
          this.parserOptions.logger.warn(`Detected potentially invalid IRI '${term.value}' in ${this.parserOptions.path}`);
        }
      }
    }
  }

  /**
   * Check if the given IRI is valid.
   * @param iri A potential IRI.
   */
  public static isValidIri(iri: string): boolean {
    return Boolean(/:((\/\/)|(.*:))/u.exec(iri));
  }
}
