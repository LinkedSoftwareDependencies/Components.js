import {RdfStreamParser} from "./rdf/RdfStreamParser";
import {Stream} from "stream";
import http = require("http");
import fs = require("fs");
import Path = require("path");
import url = require("url");
import {RdfStreamIncluder} from "./rdf/RdfStreamIncluder";
import NodeUtil = require('util');

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
                    throw new Error('A parameter is unique, has a fixed value, but also has another defined value.\n' + NodeUtil.inspect(param));
                } else {
                    value = param.fixed;
                }
            } else {
                // Otherwise, add to the value
                if (!value) {
                    value = [];
                }
                if (!(value instanceof Array)) {
                    throw new Error('Values must be an array\n' + NodeUtil.inspect(param));
                }
                param.fixed.forEach((f: any) => value.push(f));
            }
        }

        // If the value is singular, and the value should be unique, transform the array to a single element
        if (param.unique && param.unique.value === 'true' && value instanceof Array) {
            value = value[0];
        }

        // If a param range is defined, apply the type and validate the range.
        if (param.range) {
            if (value instanceof Array) {
                value = value.map((e) => Util.captureType(e, param));
            } else {
                value = Util.captureType(value, param);
            }
        }

        return value;
    }

    /**
     * Apply the given datatype to the given literal.
     * Checks if the datatype is correct and casts to the correct js type.
     * Will throw an error if the type has an invalid value.
     * Will be ignored if the value is not a literal or the type is not recognized.
     * @param value The value.
     * @param param The parameter.
     * @returns {any} The tranformed value.
     */
    static captureType(value: any, param: any): any {
        if (!value) return value;
        let raw = value.value;
        if (value.termType === 'Literal') {
            let parsed;
            switch(param.range.value) {
                case Util.PREFIXES['xsd'] + 'boolean':
                    if (raw === 'true') {
                        raw = true;
                    } else if (raw === 'false') {
                        raw = false;
                    } else {
                        incorrectType();
                    }
                    break;
                case Util.PREFIXES['xsd'] + 'integer':
                case Util.PREFIXES['xsd'] + 'number':
                case Util.PREFIXES['xsd'] + 'int':
                case Util.PREFIXES['xsd'] + 'byte':
                case Util.PREFIXES['xsd'] + 'long':
                    parsed = parseInt(raw);
                    if (isNaN(parsed)) {
                        incorrectType();
                    } else {
                        // parseInt also parses floats to ints!
                        if (String(parsed) !== raw) {
                            incorrectType();
                        }
                        raw = parsed;
                    }
                    break;
                case Util.PREFIXES['xsd'] + 'float':
                case Util.PREFIXES['xsd'] + 'decimal':
                case Util.PREFIXES['xsd'] + 'double':
                    parsed = parseFloat(raw);
                    if (isNaN(parsed)) {
                        incorrectType();
                    } else {
                        raw = parsed;
                    }
                    break;
            }
            return { value: raw, termType: 'Literal' };
        }
        return value;

        function incorrectType() {
            throw new Error(value.value + ' is not of type ' + param.range.value + ' for parameter ' + param.value
                + '.\n' + NodeUtil.inspect(param));
        }
    }
}

export = Util;