import { PassThrough, Readable } from "stream";
import Path = require("path");
import { RdfParser, RdfParserOptions } from './RdfParser';
import type * as RDF from "rdf-js";
import { mapTerms } from "rdf-terms";
import { DataFactory } from "rdf-data-factory";
import Util = require('../Util');

const DF = new DataFactory();

/**
 * A RdfStreamIncluder takes a triple stream and detects owl:includes to automatically include other files.
 */
export class RdfStreamIncluder extends PassThrough {

    private static readonly RELATIVE_PATH_MATCHER: RegExp = /^"file:\/\/([^\/].*)".*$/;

    private runningImporters: number = 1;
    private readonly parserOptions: RdfParserOptions;

    constructor(parserOptions: RdfParserOptions) {
        super({ objectMode: true });
        (<any> this)._readableState.objectMode = true;
        this.parserOptions = parserOptions;
    }

    push(data: RDF.Quad, encoding?: string): boolean {
        if (data) {
            if (!this.parserOptions.ignoreImports && data.predicate.value === Util.PREFIXES['owl'] + 'imports') {
                this.runningImporters++;
                var relativeFilePath = data.object.value;

                // Try overriding path using defined import paths
                if (this.parserOptions.importPaths) {
                    for (const prefix of Object.keys(this.parserOptions.importPaths)) {
                        if (relativeFilePath.startsWith(prefix)) {
                            relativeFilePath = this.parserOptions.importPaths[prefix] + relativeFilePath.substr(prefix.length);
                            break;
                        }
                    }
                }

                Util.getContentsFromUrlOrPath(relativeFilePath, this.parserOptions.baseIRI)
                    .then((rawStream: Readable) => {
                        let data: Readable = new RdfParser().parse(rawStream, this.parserOptions);
                        data.on('data', (subData: any) => this.push(subData))
                            .on('error', (e: any) => this.emit('error', Util.addFilePathToError(e, relativeFilePath, this.parserOptions.baseIRI)))
                            .on('end', () => this.push(null));
                    }).catch((e: any) => this.emit('error', Util.addFilePathToError(e, relativeFilePath, this.parserOptions.baseIRI)));
            }
            if (this.parserOptions.absolutizeRelativePaths) {
                data = mapTerms(data, (term) => this._absolutize(term));
            }
            return super.push(data);
        }
        else if (!--this.runningImporters) {
            super.push(null);
        }
    }

    _absolutize(term: RDF.Term): RDF.Term {
        if (term.termType !== 'NamedNode') {
            return term;
        }
        // Make relative paths absolute
        var match = RdfStreamIncluder.RELATIVE_PATH_MATCHER.exec(term.value);
        if (match) {
            return DF.namedNode('"file:///' + Path.join(this.parserOptions.baseIRI, match[1]) + '"' + Util.PREFIXES['xsd'] + 'string');
        }
        return term;
    }
}
