import {RdfStreamParser} from "./rdf/RdfStreamParser";
import {Stream} from "stream";
import http = require("http");
import fs = require("fs");
import Path = require("path");
import url = require("url");
import {RdfStreamIncluder} from "./rdf/RdfStreamIncluder";

class Util {
    static readonly PREFIXES: {[id: string]: string} = {
        'oo': 'https://linkedsoftwaredependencies.org/vocabularies/object-oriented#',
        'om': 'https://linkedsoftwaredependencies.org/vocabularies/object-mapping#',
        'rdf': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
        'rdfs': 'http://www.w3.org/2000/01/rdf-schema#',
        'xsd': 'http://www.w3.org/2001/XMLSchema#',
        'doap': 'http://usefulinc.com/ns/doap#',
        'owl': 'http://www.w3.org/2002/07/owl#'
    };

    /**
     * Get the file contents from a file path or URL
     * @param path The file path or url.
     * @param fromPath The path to base relative paths on.
     *                 Default is the current running directory.
     * @returns {Promise<T>} A promise resolving to the data stream.
     * @private
     */
    static getContentsFromUrlOrPath(path: string, fromPath?: string): Promise<Stream> {
        return new Promise((resolve, reject) => {
            let parsedUrl: any = url.parse(path);
            if (!parsedUrl.protocol) {
                resolve(fs.createReadStream(Path.join(fromPath || '', parsedUrl.path)).on('error', reject));
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
     *                 Default is the current running directory.
     * @param ignoreImports If imports should be ignored. Default: false
     * @param contexts The cached JSON-LD contexts
     * @returns A triple stream.
     * @private
     */
    static parseRdf(rdfDataStream: Stream, fromPath?: string, ignoreImports?: boolean,
                    contexts?: {[id: string]: string}): Stream {
        let stream: Stream = new RdfStreamParser(contexts).pipeFrom(rdfDataStream);
        let ret: Stream = stream.pipe(new RdfStreamIncluder(Util, fromPath, !ignoreImports));
        stream.on('error', (e: any) => ret.emit('error', e));
        return ret;
    }

    /**
     * Apply parameter values for the given parameter.
     * @param param A parameter type.
     * @param paramValueMapping A mapping from parameter to value.
     * @return The parameter value(s) or undefined
     */
    static applyParameterValues(param: any, paramValueMapping: any) {
        let value: any = paramValueMapping[param.value];
        // Set default value if no value has been given
        if (!value && param.defaults) {
            value = param.defaults;
        }

        // Force-add fixed parameter values
        if (param.fixed) {
            // If the paramater value must be unique and a value has already been set, crash
            if (param.unique) {
                if (value) {
                    throw new Error('A parameter is unique, has a fixed value and has another defined value' + JSON.stringify(param));
                } else {
                    value = param.fixed;
                }
            } else {
                // Otherwise, add to the value
                if (!value) {
                    value = [];
                }
                if (!(value instanceof Array)) {
                    throw new Error('Values must be an array ' + JSON.stringify(param));
                }
                param.fixed.forEach((f: any) => value.push(f));
            }
        }

        // If the value is singular, and the value should be unique, transform the array to a single element
        if (param.unique && param.unique.value === 'true' && value instanceof Array) {
            value = value[0];
        }
        return value;
    }
}

export = Util;