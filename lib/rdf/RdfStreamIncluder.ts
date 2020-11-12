import Path = require('path');
import type { Readable } from 'stream';
import { PassThrough } from 'stream';
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
export class RdfStreamIncluder extends PassThrough {
  private static readonly RELATIVE_PATH_MATCHER: RegExp = /^"file:\/\/([^/].*)".*$/u;

  private runningImporters = 1;
  private readonly parserOptions: RdfParserOptions;

  public constructor(parserOptions: RdfParserOptions) {
    super({ objectMode: true });
    (<any> this)._readableState.objectMode = true;
    this.parserOptions = parserOptions;
  }

  public push(quad: RDF.Quad | null, encoding?: string): boolean {
    if (quad) {
      // Check for import link
      if (!this.parserOptions.ignoreImports && quad.predicate.value === `${Util.PREFIXES.owl}imports`) {
        this.runningImporters++;
        let relativeFilePath = quad.object.value;

        // Try overriding path using defined import paths
        if (this.parserOptions.importPaths) {
          for (const prefix of Object.keys(this.parserOptions.importPaths)) {
            if (relativeFilePath.startsWith(prefix)) {
              relativeFilePath = this.parserOptions.importPaths[prefix] + relativeFilePath.slice(prefix.length);
              break;
            }
          }
        }

        Util.getContentsFromUrlOrPath(relativeFilePath, this.parserOptions.baseIRI)
          .then((rawStream: Readable) => {
            const data: Readable = new RdfParser().parse(rawStream, this.parserOptions);
            data.on('data', (subData: any) => this.push(subData))
              .on('error', (error: Error) => this
                .emit('error', Util.addFilePathToError(error, relativeFilePath, this.parserOptions.baseIRI)))
              .on('end', () => this.push(null));
          }).catch((error: any) => this
            .emit('error', Util.addFilePathToError(error, relativeFilePath, this.parserOptions.baseIRI)));
      }

      // Absolutize relative file paths
      if (this.parserOptions.absolutizeRelativePaths) {
        quad = mapTerms(quad, term => this._absolutize(term));
      }

      // Validate IRIs
      if (this.parserOptions.logger) {
        for (const term of getNamedNodes(getTerms(quad))) {
          if (!isValidIri(term.value)) {
            this.parserOptions.logger.warn(`Detected potentially invalid IRI: '${term.value}'`);
          }
        }
      }

      return super.push(quad);
    }
    if (!--this.runningImporters) {
      super.push(null);
    }
    return true;
  }

  protected _absolutize(term: RDF.Term): RDF.Term {
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
  }
}
