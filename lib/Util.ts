import {RdfStreamParser} from "./rdf/RdfStreamParser";
import {Stream} from "stream";
import http = require("http");
import fs = require("fs");
import Path = require("path");
import url = require("url");
import _ = require("lodash");
import {RdfStreamIncluder} from "./rdf/RdfStreamIncluder";
import NodeUtil = require('util');
import {Stats} from "fs";

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
     * @param path The file path or url.
     * @param fromPath The path to base relative paths on.
     *                 Default is the current running directory.
     * @param ignoreImports If imports should be ignored. Default: false
     * @param contexts The cached JSON-LD contexts
     * @returns A triple stream.
     * @private
     */
    static parseRdf(rdfDataStream: Stream, path: string, fromPath?: string, ignoreImports?: boolean,
                    contexts?: {[id: string]: string}): Stream {
        if (!fromPath) fromPath = Path.dirname(path);
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

    /**
     * @returns {any} The path to the current main Node module.
     */
    static getMainModulePath(): string {
        for (let nodeModulesPath of (<any> global.process.mainModule).paths) {
            let path = nodeModulesPath.replace(/node_modules$/, 'package.json');
            try {
                require(path);
                return path.replace(/package.json$/, '');
            } catch (e) {}
        }
        return null;
    }

    /**
     * Get all currently available node module paths.
     * @param path The path to start from.
     * @param cb A callback for each absolute path.
     * @param ignorePaths The paths that should be ignored.
     */
    static getAvailableNodeModules(path: string, cb: (path: string) => any, ignorePaths?: {[key: string]: boolean}) {
        if (!ignorePaths) ignorePaths = {};
        return recurse(Path.join(path, 'node_modules'));
        function recurse(startPath: string) {
            fs.stat(startPath, (err: NodeJS.ErrnoException, stat: Stats) => {
                if (!err) {
                    startPath = fs.realpathSync(startPath); // Normalize softlinks
                    if (ignorePaths[startPath]) { // Avoid infinite loops
                        return cb(null);
                    }
                    ignorePaths[startPath] = true;
                    if (stat.isDirectory()) {
                        if (Path.basename(startPath) === 'node_modules') {
                            cb(Path.join(startPath, '../'));
                        }
                        fs.readdir(startPath, (err: NodeJS.ErrnoException, files: string[]) => {
                            let remaining = files.length;
                            files.forEach((file) => {
                                var fullFilePath: string = Path.join(startPath, file);
                                if (fs.statSync(fullFilePath).isDirectory()) {
                                    Util.getAvailableNodeModules(fullFilePath, (subPath: string) => {
                                        if (subPath) {
                                            cb(subPath);
                                        } else {
                                            if (--remaining === 0) {
                                                cb(null);
                                            }
                                        }
                                    }, ignorePaths);
                                } else {
                                    remaining--;
                                }
                            });
                        });
                    } else cb(null);
                } else {
                    if (Path.basename(path).charAt(0) === '@') {
                        recurse(path);
                    } else cb(null);
                }
            });
        }
    }

    /**
     * Get all component files paths reachable from the given path.
     * This checks all available node modules and checks their package.json
     * for `lsd:module` and `lsd:components`.
     * @param path The path to search from.
     * @return A promise resolving to a mapping of module URI to component file name
     */
    static getModuleComponentPaths(path: string): Promise<{[id: string]: string}> {
        return new Promise((resolve, reject) => {
            let data: {[id: string]: string} = {};
            Util.getAvailableNodeModules(path, (modulePath) => {
                if (!modulePath) {
                    return resolve(data);
                }
                let pckg: any = require(Path.join(modulePath, 'package.json'));
                if (pckg) {
                    let currentModuleUri: string = pckg['lsd:module'];
                    let relativePath: string = pckg['lsd:components'];
                    if (currentModuleUri && relativePath) {
                        data[currentModuleUri] = Path.join(modulePath, relativePath);
                    }
                }
            });
        });
    }

    /**
     * Get all currently available component files paths.
     * This checks all available node modules and checks their package.json
     * for `lsd:module` and `lsd:components`.
     * @return A promise resolving to a mapping of module URI to component file name
     */
    static getAvailableModuleComponentPaths(): Promise<{[id: string]: string}> {
        return new Promise((resolve, reject) => {
            let path: string = Util.getMainModulePath();
            if (path) {
                return resolve(Util.getModuleComponentPaths(path));
            } else {
                reject(null);
            }
        });
    }

    /**
     * Get all JSON-LD contexts reachable from the given path.
     * This checks all available node modules and checks their package.json
     * for `lsd:contexts`.
     * @param path The path to search from.
     * @return A promise resolving to a mapping of context URL to context contents
     */
    static getContextPaths(path: string): Promise<{[id: string]: string}> {
        return new Promise((resolve, reject) => {
            let data: {[id: string]: string} = {};
            Util.getAvailableNodeModules(path, (modulePath) => {
                if (!modulePath) {
                    return resolve(data);
                }
                let pckg: any = require(Path.join(modulePath, 'package.json'));
                if (pckg) {
                    let contexts: {[key: string]: string} = pckg['lsd:contexts'];
                    if (contexts) {
                        _.forOwn(contexts, (value: string, key: string) => data[key] = fs.readFileSync(Path.join(modulePath, value), 'utf8'));
                    }
                }
            });
        });
    }

    /**
     * Get all currently available JSON-LD contexts.
     * This checks all available node modules and checks their package.json
     * for `lsd:contexts`.
     * @return A promise resolving to a mapping of context URL to context contents
     */
    static getAvailableContexts(): Promise<{[id: string]: string}> {
        return new Promise((resolve, reject) => {
            let path: string = Util.getMainModulePath();
            if (path) {
                return resolve(Util.getContextPaths(path));
            } else {
                reject(null);
            }
        });
    }
}

export = Util;