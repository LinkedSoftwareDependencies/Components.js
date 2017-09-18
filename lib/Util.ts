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
import {Resource} from "./rdf/Resource";
let jsonld: any = require("jsonld");
let globalModules: string = require('global-modules');

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
    public static NODE_MODULES_PACKAGE_CONTENTS: {[id: string]: string} = {};
    private static MAIN_MODULE_PATH: string = null;

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
            let separatorPos: number = path.indexOf(':');
            if ((separatorPos >= 0 && separatorPos < path.length && path.charAt(separatorPos + 1) === '\\')
                || !parsedUrl.protocol) {
                resolve(fs.createReadStream(Path.join(fromPath || '', parsedUrl.path)).on('error', rejectContext));
            } else {
                try {
                    var request = http.request(parsedUrl, (data: Stream) => {
                        data.on('error', rejectContext);
                        resolve(data);
                    });
                    request.on('error', rejectContext);
                    request.end();
                } catch (e) {
                    rejectContext(e);
                }
            }
            function rejectContext(e: Error) {
                reject(Util.addFilePathToError(e, path, fromPath));
            }
        });
    }

    /**
     * Parse the given data stream to a triple stream.
     * @param rdfDataStream The data stream.
     * @param path The file path or url.
     * @param fromPath The path to base relative paths on.
     *                 Default is the current running directory.
     * @param absolutizeRelativePaths If relative paths 'file://' should be made absolute 'file:///'.
     * @param ignoreImports If imports should be ignored. Default: false
     * @param contexts The cached JSON-LD contexts
     * @returns A triple stream.
     * @private
     */
    static parseRdf(rdfDataStream: Stream, path: string, fromPath?: string, ignoreImports?: boolean,
                    absolutizeRelativePaths?: boolean, contexts?: {[id: string]: string}): Stream {
        if (!fromPath) fromPath = Path.dirname(path);
        let stream: Stream = new RdfStreamParser(contexts).pipeFrom(rdfDataStream);
        let ret: Stream = stream.pipe(new RdfStreamIncluder(Util, fromPath, !ignoreImports, absolutizeRelativePaths));
        stream.on('error', (e: any) => ret.emit('error', Util.addFilePathToError(e, path || fromPath, path ? fromPath : null)));
        return ret;
    }

    /**
     * Apply parameter values for the given parameter.
     * @param resourceScope The resource scope to map in.
     * @param param A parameter type.
     * @param paramValueMapping A mapping from parameter to value.
     * @return The parameter value(s) or undefined
     */
    static applyParameterValues(resourceScope: Resource, param: any, paramValueMapping: any) {
        let value: any = paramValueMapping[param.value];
        // Set default value if no value has been given
        if (!value && param.defaults) {
            value = param.defaults;
        }
        if (!value && param.defaultScoped) {
            param.defaultScoped.forEach((scoped: any) => {
                scoped.scope.forEach((scope: any) => {
                    if (resourceScope.hasType(scope.value)) {
                        value = scoped.scopedValue;
                    }
                });
            });
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
        if (Util.MAIN_MODULE_PATH)
            return Util.MAIN_MODULE_PATH;
        for (let nodeModulesPath of (<any> global.process.mainModule).paths.reverse()) {
            let path = nodeModulesPath.replace(/node_modules$/, 'package.json');
            try {
                require(path);
                return Util.MAIN_MODULE_PATH = path.replace(/package.json$/, '');
            } catch (e) {}
        }
        return null;
    }

    /**
     * Get all currently available node module paths.
     * @param path The path to start from.
     * @param cb A callback for each absolute path.
     * @param ignorePaths The paths that should be ignored.
     * @param haltRecursion If no deeper recursive calls should be done.
     */
    static getAvailableNodeModules(path: string, cb: (path: string) => any, ignorePaths?: {[key: string]: boolean}, haltRecursion?: boolean) {
        if (!ignorePaths) ignorePaths = {};
        return recurse(path);
        function recurse(startPath: string) {
            fs.stat(startPath, (err: NodeJS.ErrnoException, stat: Stats) => {
                if (!err) {
                    // Normalize softlinks
                    fs.realpath(startPath, (err, startPath) => {
                        if (ignorePaths[startPath]) { // Avoid infinite loops
                            return cb(null);
                        }
                        ignorePaths[startPath] = true;
                        if (stat.isDirectory()) {
                            fs.stat(Path.join(startPath, 'package.json'), (err: NodeJS.ErrnoException, stat: Stats) => {
                                let startPathModules = startPath;
                                if (!err && stat.isFile()) {
                                    cb(startPath);
                                    startPathModules = Path.join(startPath, 'node_modules');
                                }

                                if (haltRecursion) {
                                    return cb(null);
                                }

                                fs.readdir(startPathModules, (err: NodeJS.ErrnoException, files: string[]) => {
                                    if (!err && files) {
                                        let remaining = files.length;
                                        files.forEach((file) => {
                                            let fullFilePath: string = Path.join(startPathModules, file);
                                            fs.stat(fullFilePath, (err: NodeJS.ErrnoException, stat: Stats) => {
                                                if (!err && stat.isDirectory()) {
                                                    if (Path.basename(fullFilePath).charAt(0) === '@') {
                                                        recurse(fullFilePath);
                                                    } else {
                                                        Util.getAvailableNodeModules(fullFilePath, (subPath: string) => {
                                                            if (subPath) {
                                                                cb(subPath);
                                                            } else {
                                                                if (--remaining === 0)
                                                                    cb(null);
                                                            }
                                                        }, ignorePaths, true);
                                                    }
                                                } else {
                                                    if (--remaining === 0)
                                                        cb(null);
                                                }
                                            });
                                        });
                                    } else {
                                        cb(null);
                                    }
                                });
                            });
                        } else cb(null);
                    });
                } else {
                    if (Path.basename(path).charAt(0) === '@') {
                        recurse(path);
                    } else cb(null);
                }
            });
        }
    }

    /**
     * Get the package.json file from the given path.
     * Require's will be cached.
     * @param path The path.
     * @returns {any} The package.json or null.
     */
    static getPackageJson(path: string): any {
        let data: any = Util.NODE_MODULES_PACKAGE_CONTENTS[path];
        if (!data) {
            if (fs.existsSync(path)) {
                data = require(path);
                if (data) {
                    Util.NODE_MODULES_PACKAGE_CONTENTS[path] = data;
                }
            }
        }
        return data;
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
                let pckg: any = Util.getPackageJson(Path.join(modulePath, 'package.json'));
                if (pckg) {
                    let currentModuleUri: string = pckg['lsd:module'];
                    let relativePath: string = pckg['lsd:components'];
                    if (currentModuleUri && relativePath) {
                        let oldValue: string = data[currentModuleUri];
                        data[currentModuleUri] = Path.join(modulePath, relativePath);
                        if (oldValue && data[currentModuleUri] !== oldValue) {
                            reject('Attempted to load conflicting components for \'' + currentModuleUri
                                + '\' at ' + path);
                        }
                    }
                }
            });
        });
    }

    /**
     * Get all currently available component files paths.
     * This checks all available node modules and checks their package.json
     * for `lsd:module` and `lsd:components`.
     * @param scanGlobal If global modules should also be scanned next to local modules.
     * @return A promise resolving to a mapping of module URI to component file name
     */
    static getAvailableModuleComponentPaths(scanGlobal: boolean): Promise<{[id: string]: string}> {
        return new Promise((resolve, reject) => {
            let globalPath: string = scanGlobal ? globalModules : null;
            let path: string = Util.getMainModulePath();
            if (path) {
                return Promise.all([globalPath ? Util.getModuleComponentPaths(globalPath) : {}, Util.getModuleComponentPaths(path)])
                    .then((paths: [{[id: string]: string}, {[id: string]: string}]) => {
                        // Local paths can overwrite global paths
                        resolve(paths.reduce((paths, currentPaths) => {
                            _.forOwn(currentPaths, (v: string, k: string) => paths[k] = v);
                            return paths;
                        }, {}));
                    })
                    .catch(reject);
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
                let pckg: any = Util.getPackageJson(Path.join(modulePath, 'package.json'));
                if (pckg) {
                    let contexts: {[key: string]: string} = pckg['lsd:contexts'];
                    if (contexts) {
                        _.forOwn(contexts, (value: string, key: string) => {
                            let oldValue: string = data[key];
                            let filePath: string = Path.join(modulePath, value);
                            data[key] = fs.readFileSync(filePath, 'utf8');

                            // Crash when duplicate different contexts are found for the same URI
                            if (oldValue && data[key] !== oldValue) {
                                reject(new Error('Attempted to load conflicting contexts for \'' + key + '\' in ' + filePath));
                            }

                            // Crash when context is invalid JSON
                            try {
                                let context: any = JSON.parse(data[key]);
                                jsonld.compact({}, context, (e: any) => {
                                    if (e) {
                                        // Resolving remote contexts may fail because local document overriding is
                                        // not in effect yet, as we are still collecting the available contexts.
                                        if (e.details.cause.details.code !== 'loading remote context failed')
                                            reject(new Error('Error while parsing context \'' + key + '\' in ' + filePath + ': ' + e.details.cause.message));
                                    }
                                });
                            } catch(e) {
                                reject(new Error('Error while parsing context \'' + key + '\' in ' + filePath + ': ' + e));
                            }
                        });
                    }
                }
            });
        });
    }

    /**
     * Get all currently available JSON-LD contexts.
     * This checks all available node modules and checks their package.json
     * for `lsd:contexts`.
     * @param scanGlobal If global modules should also be scanned next to local modules.
     * @return A promise resolving to a mapping of context URL to context contents
     */
    static getAvailableContexts(scanGlobal: boolean): Promise<{[id: string]: string}> {
        return new Promise((resolve, reject) => {
            let globalPath: string = scanGlobal ? globalModules : null;
            let path: string = Util.getMainModulePath();
            if (path) {
                return Promise.all([globalPath ? Util.getContextPaths(globalPath) : {}, Util.getContextPaths(path)])
                    .then((paths: [{[id: string]: string}, {[id: string]: string}]) => {
                        // Local paths can overwrite global paths
                        resolve(paths.reduce((paths, currentPaths) => {
                            _.forOwn(currentPaths, (v: string, k: string) => paths[k] = v);
                            return paths;
                        }, {}));
                    })
                    .catch(reject);
            } else {
                reject(null);
            }
        });
    }

    /**
     * Add a file path to an error message.
     * @param e The original error message.
     * @param filePath The file path.
     * @param fromPath The optional base path.
     * @returns {Error} The new error with file path context.
     */
    static addFilePathToError(e: Error, filePath: string, fromPath?: string): Error {
        return new Error('Invalid components file "' + (fromPath ? Path.join(fromPath, filePath) : filePath) + '":\n' + e);
    }
}

export = Util;