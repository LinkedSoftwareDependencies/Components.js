import * as Path from 'node:path';
import type { Readable, TransformCallback } from 'node:stream';
import { Transform } from 'node:stream';
import type * as RDF from '@rdfjs/types';
import { getNamedNodes, getTerms } from 'rdf-terms';
import { IRIS_RDFS } from './Iris';
import { RdfParser } from './RdfParser';
import type { RdfParserOptions } from './RdfParser';

/**
 * A RdfStreamIncluder takes a triple stream and detects owl:includes to automatically include other files.
 *
 * Imports are fetched and parsed in parallel,
 * but their quads are only emitted after the quads of the current stream,
 * one import after the other in the order in which they were detected.
 * This makes the resulting quad order independent of I/O timing.
 */
export class RdfStreamIncluder extends Transform {
  private readonly parserOptions: RdfParserOptions;
  private readonly imports: Promise<RDF.Quad[]>[] = [];

  public constructor(parserOptions: RdfParserOptions) {
    super({ objectMode: true });
    (<any> this)._readableState.objectMode = true;
    this.parserOptions = parserOptions;
  }

  // eslint-disable-next-line ts/naming-convention
  public _transform(quad: RDF.Quad, encoding: string, callback: TransformCallback): boolean {
    this.handleImports(quad);
    this.validateIris(quad);
    callback(null, quad);
    return true;
  }

  // eslint-disable-next-line ts/naming-convention
  public _flush(callback: TransformCallback): void {
    this.flushImports().then(() => callback(), callback);
  }

  /**
   * Emit the quads of all imports, in the order in which they were detected.
   */
  protected async flushImports(): Promise<void> {
    for (const importedQuads of this.imports) {
      for (const quad of await importedQuads) {
        this.push(quad);
      }
    }
  }

  /**
   * Follow all import links in the given quad.
   * @param quad A quad.
   */
  public handleImports(quad: RDF.Quad): void {
    if (!this.parserOptions.ignoreImports && quad.predicate.value === IRIS_RDFS.seeAlso) {
      let relativeFilePath = decodeURI(quad.object.value);

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

      // Recursively call the parser, and buffer the quads until they can be emitted in order.
      // Errors are emitted immediately, so they don't have to wait for preceding imports.
      this.imports.push(this.parseImport(relativeFilePath, this.imports.length).catch((error: Error) => {
        this.emit('error', error);
        return [];
      }));
    }
  }

  /**
   * Parse the given imported file into an array of quads.
   * @param relativeFilePath The path or URL of the imported file.
   * @param index The position of the import among the imports of the current stream.
   */
  protected async parseImport(relativeFilePath: string, index: number): Promise<RDF.Quad[]> {
    let rawStream: Readable;
    try {
      rawStream = await RdfParser.fetchFileOrUrl(relativeFilePath);
    } catch (error: unknown) {
      throw RdfParser.addPathToError(<Error> error, this.parserOptions.path);
    }
    const data: Readable = new RdfParser().parse(rawStream, {
      ...this.parserOptions,
      baseIRI: undefined,
      path: relativeFilePath,
      importedFromPath: this.parserOptions.path,
      // Labels of the current stream are its prefix followed by digits, so these never clash.
      blankNodePrefix: this.parserOptions.blankNodePrefix === undefined ?
        undefined :
        `${this.parserOptions.blankNodePrefix}${index}_`,
    });
    return new Promise((resolve, reject) => {
      const quads: RDF.Quad[] = [];
      data
        .on('data', (quad: RDF.Quad) => quads.push(quad))
        .on('error', reject)
        .on('end', () => resolve(quads));
    });
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
    return Boolean(/:((\/\/)|(.*:))/u.test(iri));
  }
}
