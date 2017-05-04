import {RdfStreamParser} from "./rdf/RdfStreamParser";
import {Stream} from "stream";
import http = require("http");
import fs = require("fs");
import Path = require("path");
import url = require("url");
import {RdfStreamIncluder} from "./rdf/RdfStreamIncluder";

class Constants {
    static readonly PREFIXES: {[id: string]: string} = {
        'lsdc': 'http://linkedsoftwaredependencies.org/vocabulary/components#',
        'rdf': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
        'rdfs': 'http://www.w3.org/2000/01/rdf-schema#',
        'xsd': 'http://www.w3.org/2001/XMLSchema#',
        'npm': 'http://example.org/npm#',
        'owl': 'http://www.w3.org/2002/07/owl#'
    };

    /**
     * Get the file contents from a file path or URL
     * @param path The file path (must be prefixed with 'file:') or url.
     * @param fromPath The path to base relative paths on.
     * @returns {Promise<T>} A promise resolving to the data stream.
     * @private
     */
    static getContentsFromUrlOrPath(path: string, fromPath: string): Promise<Stream> {
        return new Promise((resolve, reject) => {
            let parsedUrl: any = url.parse(path);
            if (parsedUrl.protocol === 'file:') {
                resolve(fs.createReadStream(Path.join(fromPath, parsedUrl.path)).on('error', reject));
            } else {
                try {
                    var request = http.request(parsedUrl, (data: Stream) => {
                        data.on('error', reject);
                        resolve(data);
                    });
                    request.on('error', reject);
                    request.end();
                } catch (e) {
                    reject(e);
                }
            }
        });
    }

    /**
     * Parse the given data stream to a triple stream.
     * @param rdfDataStream The data stream.
     * @param fromPath The path to base relative paths on.
     * @param ignoreImports If imports should be ignored. Default: false
     * @returns A triple stream.
     * @private
     */
    static parseRdf(rdfDataStream: Stream, fromPath: string, ignoreImports?: boolean): Stream {
        let stream: Stream = new RdfStreamParser().pipeFrom(rdfDataStream);
        let ret: Stream = stream.pipe(new RdfStreamIncluder(Constants, fromPath, !ignoreImports));
        stream.on('error', (e: any) => ret.emit('error', e));
        return ret;
    }
}

export = Constants;