import { createReadStream, promises as fs } from 'node:fs';
import type { Readable } from 'node:stream';
import type * as RDF from '@rdfjs/types';
import * as JsonLdContextParser from 'jsonld-context-parser';
import { ContextParser } from 'jsonld-context-parser';
import type { ParseOptions } from 'rdf-parse';
import { rdfParser } from 'rdf-parse';
import type { Logger } from 'winston';
import { PrefetchedDocumentLoader } from './PrefetchedDocumentLoader';
import { RdfStreamIncluder } from './RdfStreamIncluder';

/**
 * Parses a data stream to a triple stream.
 */
export class RdfParser {
  /**
   * Create a single, cache-bearing JSON-LD context parser that can be reused across all files
   * that are parsed during a component/config load.
   *
   * By default, Components.js constructs a fresh {@link PrefetchedDocumentLoader} and (indirectly,
   * via jsonld-streaming-parser) a fresh `ContextParser` for every `.jsonld` file. As a result the
   * well-known `@context`s (e.g. the shared `componentsjs` and `@solid/community-server` contexts)
   * are re-loaded and re-normalized once per file - during a Community Solid Server boot the
   * `componentsjs` context alone is normalized ~979 times.
   *
   * Passing the returned parser to every parse (see {@link RdfParserOptions#contextParser}) shares a
   * single {@link PrefetchedDocumentLoader}, a single raw-document cache, and a single normalized
   * {@link ContextCache} across all files, so the well-known contexts are loaded once and (once the
   * shared cache can be hit) normalized once instead of once per file.
   *
   * @param options Options describing the prefetched contexts and validation behaviour.
   */
  public static createSharedContextParser(options: ISharedContextParserOptions): ContextParser {
    const documentLoader = new PrefetchedDocumentLoader({
      contexts: options.contexts ?? {},
      logger: options.logger,
      remoteContextLookups: options.remoteContextLookups,
    });
    const parserOptions: Record<string, any> = {
      documentLoader,
      skipValidation: options.skipContextValidation,
    };
    // Attach a shared normalized-context cache when the installed jsonld-context-parser exposes one
    // (feature-detected so this remains compatible with versions that predate the cache).
    if ((<any> JsonLdContextParser).ContextCache) {
      parserOptions.contextCache = new (<any> JsonLdContextParser).ContextCache();
    }
    return new ContextParser(parserOptions);
  }

  /**
   * Parses the given stream into RDF quads.
   * @param textStream A text stream.
   * @param options Parsing options.
   */
  public parse(textStream: NodeJS.ReadableStream, options: RdfParserOptions): RDF.Stream & Readable {
    // Parsing libraries don't work as expected if path contains backslashes
    options.path = options.path.replaceAll(/\\+/gu, '/');

    if (!options.baseIRI) {
      // Try converting path to URL using defined import paths
      if (options.importPaths) {
        for (const [ url, file ] of Object.entries(options.importPaths)) {
          if (options.path.startsWith(file)) {
            options.baseIRI = `${url}${options.path.slice(file.length)}`;
            break;
          }
        }
      }

      // Fallback to a baseIRI using the file scheme
      if (!options.baseIRI) {
        options.baseIRI = options.path;
        // Windows paths always contain a ':'
        if (!options.baseIRI.includes(':') || /^[A-Za-z]:[/\\][^/]/u.test(options.baseIRI)) {
          options.baseIRI = `file://${options.baseIRI}`;
        }
      }
    }

    // Set JSON-LD parser options
    const jsonLdParserOptions: Record<string, any> = {
      // Override the JSON-LD document loader.
      // This is always provided so that a jsonld-streaming-parser that does not (yet) support an
      // injected context parser still uses the prefetched contexts and remote-lookup protection.
      documentLoader: new PrefetchedDocumentLoader({
        contexts: options.contexts ?? {},
        logger: options.logger,
        path: options.path,
        remoteContextLookups: options.remoteContextLookups,
      }),
      // Enable strict parsing of JSON-LD to error on potential user config errors
      strictValues: true,
      // If JSON-LD context validation should be skipped
      skipContextValidation: options.skipContextValidation,
    };
    if (options.contextParser) {
      // Reuse one shared, cache-bearing context parser (which carries its own single prefetched
      // document loader) across all files, so the shared @contexts are only loaded/normalized once
      // instead of once per file. This is honoured by a jsonld-streaming-parser that supports the
      // `contextParser` option; on older versions the option is ignored and the per-file
      // `documentLoader` above is used, preserving the previous behaviour.
      jsonLdParserOptions.contextParser = options.contextParser;
    }
    (<any> options)['@comunica/actor-rdf-parse-jsonld:parserOptions'] = jsonLdParserOptions;

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
   * The cached import paths. (URL -> file)
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
  /**
   * If remote context lookups are allowed.
   * If not allowed, an error is thrown if a remote lookup occurs.
   * If allowed, only a warning is emitted.
   */
  remoteContextLookups?: boolean;
  /**
   * An optional shared JSON-LD context parser to reuse across all files.
   * When provided, this (cache-bearing) parser and its prefetched document loader are used for all
   * context resolution instead of constructing a new document loader (and context parser) per file.
   * Create one with {@link RdfParser#createSharedContextParser}.
   */
  contextParser?: ContextParser;
};

export interface ISharedContextParserOptions {
  /**
   * The cached JSON-LD contexts (id -> context document).
   */
  contexts?: Record<string, any>;
  /**
   * An optional logger, used to warn on remote context lookups.
   */
  logger?: Logger;
  /**
   * If remote context lookups are allowed.
   */
  remoteContextLookups?: boolean;
  /**
   * If JSON-LD context validation should be skipped.
   */
  skipContextValidation?: boolean;
}
