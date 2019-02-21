import {RdfStreamParser} from "./rdf/RdfStreamParser";
import {Stream} from "stream";
import http = require("http");
import https = require("https");
import fs = require("fs");
import Path = require("path");
import url = require("url");
import _ = require("lodash");
import {RdfStreamIncluder} from "./rdf/RdfStreamIncluder";
import NodeUtil = require('util');
import {Resource} from "./rdf/Resource";

const jsonld: any = require("jsonld");
const globalModules: string = require('global-modules');
const stat = NodeUtil.promisify(fs.stat);
const readdir = NodeUtil.promisify(fs.readdir);
const realpath = NodeUtil.promisify(fs.realpath);

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
    private static MAIN_MODULE_PATHS: string[] = null;

    private static cachedAvailableNodeModules: {[id: string]: Promise<string[]>} = {};

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
                || !parsedUrl.protocol || parsedUrl.protocol === 'file:') {
                if (Path.isAbsolute(parsedUrl.path)) {
                    fromPath = '';
                }
                resolve(fs.createReadStream(Path.join(fromPath || '', parsedUrl.path)).on('error', rejectContext));
            } else {
                try {
                    var request = (<any> (parsedUrl.protocol == 'https:' ? https : http)).request(parsedUrl, (data: Stream) => {
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
     * @param importPaths The cached import paths.
     * @returns A triple stream.
     * @private
     */
    static parseRdf(rdfDataStream: Stream, path: string, fromPath?: string, ignoreImports?: boolean,
                    absolutizeRelativePaths?: boolean, contexts?: {[id: string]: string},
                    importPaths?: {[id: string]: string}): Stream {
        if (!fromPath) fromPath = Path.dirname(path);
        let stream: Stream = new RdfStreamParser(contexts).pipeFrom(rdfDataStream);
        let ret: Stream = stream.pipe(new RdfStreamIncluder(Util, fromPath, !ignoreImports, absolutizeRelativePaths, contexts, importPaths));
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
        if (!value && param.defaultScoped) {
            param.defaultScoped.forEach((scoped: any) => {
                if (!scoped.scope) {
                    throw new Error('Missing required oo:defaultScope value for a default scope.\n' + NodeUtil.inspect(param));
                }
                scoped.scope.forEach((scope: any) => {
                    if (!scoped.scopedValue) {
                        throw new Error('Missing required oo:defaultScopedValue value for a default scope.\n' + NodeUtil.inspect(param));
                    }
                    if (resourceScope.hasType(scope.value)) {
                        value = scoped.scopedValue;
                    }
                });
            });
        }
        if (!value && param.defaults) {
            value = param.defaults;
        }
        if (!value && param.required) {
            throw new Error('Parameter ' + param.value + ' is required, but no value for it has been set in ' + paramValueMapping.value + '.\n' + NodeUtil.inspect(paramValueMapping));
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

        // If the parameter is marked as lazy,
        // make the value inherit this lazy tag so that it can be handled later.
        if (value && param.lazy) {
            value.lazy = param.lazy;
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
     * Set the main module path.
     * This will also update the main module paths.
     * @param {string} path A path.
     */
    static setMainModulePath(path: string) {
        Util.MAIN_MODULE_PATH = fs.realpathSync(path);
        const sections: string[] = Util.MAIN_MODULE_PATH.split(Path.sep);
        const paths: string[] = [];
        for (let i = sections.length; i > 1; i--) {
            paths.push(sections.slice(0, i).join(Path.sep));
        }
        Util.setMainModulePaths(paths);
    }

    static initDefaultMainModulePath() {
        for (let nodeModulesPath of (<any> global.process.mainModule).paths) {
            let path = nodeModulesPath.replace(/node_modules$/, 'package.json');
            try {
                require(path);
                Util.setMainModulePath(path.replace(/package.json$/, ''));
                return Util.getMainModulePath();
            } catch (e) {}
        }
    }

    /**
     * @returns {any} The path to the current main Node module.
     */
    static getMainModulePath(): string {
        if (Util.MAIN_MODULE_PATH)
            return Util.MAIN_MODULE_PATH;
        Util.initDefaultMainModulePath();
        return Util.MAIN_MODULE_PATH;
    }

    /**
     * Set the main module paths.
     * @param {string[]} paths A list paths. Like require.main.paths, but starting from the main module path.
     */
    static setMainModulePaths(paths: string[]) {
        Util.MAIN_MODULE_PATHS = paths;
    }

    /**
     * Set the main module paths.
     * @return {string[]} A list of paths. Like require.main.paths, but starting from the main module path.
     */
    static getMainModulePaths(): string[] {
        if (Util.MAIN_MODULE_PATHS)
            return Util.MAIN_MODULE_PATHS;
        Util.initDefaultMainModulePath();
        return Util.MAIN_MODULE_PATHS;
    }

    /**
     * Get all currently available node module paths.
     * @param path The path to start from.
     * @param cb A callback for each absolute path.
     * @param ignorePaths The paths that should be ignored.
     */
    static getAvailableNodeModules(path: string, cb: (path: string) => any, ignorePaths?: {[key: string]: boolean}) {
        if (Util.cachedAvailableNodeModules[path]) {
            Promise.resolve(Util.cachedAvailableNodeModules[path]).then((paths) => {
                paths.forEach(cb);
                cb(null);
            });
        } else {
            Util.cachedAvailableNodeModules[path] = new Promise<string[]>((resolve, reject) => {
                const paths: string[] = [];
                if (!ignorePaths) ignorePaths = {};
                recurse(path, (p) => { paths.push(p), cb(p); }).then(() => {
                    resolve(paths);
                    cb(null);
                }).catch(reject);
            });
        }
        async function recurse(path: string, cb: (path: string) => any): Promise<any> {
            path = await realpath(path);

            if (ignorePaths[path]) { // Avoid infinite loops
                return null;
            }
            ignorePaths[path] = true;

            try {
                // Check if the path is a node module
                if ((await stat(Path.join(path, 'package.json'))).isFile()) {
                    cb(path);

                    // Start iterating through all node modules inside this root module.
                    const rootNodeModules = Path.join(path, 'node_modules');
                    const modules: string[] = await readdir(rootNodeModules);
                    for (const module of modules) {
                        // Ignore .bin folders
                        if (!module.startsWith('.')) {
                            const modulePath = Path.join(rootNodeModules, module);
                            // Iterate one level deeper when we find '@' folders
                            if (module.startsWith('@')) {
                                const scopedModules: string[] = await readdir(modulePath);
                                for (const scopedModule of scopedModules) {
                                    await recurse(Path.join(modulePath, scopedModule), cb);
                                }
                            } else {
                                await recurse(modulePath, cb);
                            }
                        }
                    }
                }
            } catch (e) {}
            return null;
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
                        if (!(currentModuleUri in data)) {
                            data[currentModuleUri] = Path.join(modulePath, relativePath);
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
            let paths: string[] = Util.getMainModulePaths();
            if (paths) {
                return Promise.all([globalPath ? Util.getModuleComponentPaths(globalPath) : {}].concat(paths.map(Util.getModuleComponentPaths)))
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
                            if (!(key in data)) {
                                let filePath: string = Path.join(modulePath, value);
                                data[key] = fs.readFileSync(filePath, 'utf8');

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
                                } catch (e) {
                                    reject(new Error('Error while parsing context \'' + key + '\' in ' + filePath + ': ' + e));
                                }
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
            let paths: string[] = Util.getMainModulePaths();
            if (paths) {
                return Promise.all([globalPath ? Util.getContextPaths(globalPath) : {}].concat(paths.map(Util.getContextPaths)))
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
     * Get all import paths reachable from the given path.
     * This checks all available node modules and checks their package.json
     * for `lsd:importPaths`.
     * @param path The path to search from.
     * @return A promise resolving to a mapping of an import prefix URL to an import prefix path
     */
    static getImportPaths(path: string): Promise<{[id: string]: string}> {
        return new Promise((resolve, reject) => {
            let data: {[id: string]: string} = {};
            Util.getAvailableNodeModules(path, (modulePath) => {
                if (!modulePath) {
                    return resolve(data);
                }
                let pckg: any = Util.getPackageJson(Path.join(modulePath, 'package.json'));
                if (pckg) {
                    let contexts: {[key: string]: string} = pckg['lsd:importPaths'];
                    if (contexts) {
                        _.forOwn(contexts, (value: string, key: string) => {
                            if (!(key in data)) {
                                data[key] = Path.join(modulePath, value);

                                // Crash when the context prefix target does not exist
                                if (!fs.existsSync(data[key])) {
                                    reject(new Error('Error while parsing import path \'' + key + '\' in ' + modulePath + ': ' + data[key] + ' does not exist.'));
                                }
                            }
                        });
                    }
                }
            });
        });
    }

    /**
     * Get all currently import prefix paths.
     * This checks all available node modules and checks their package.json
     * for `lsd:importPaths`.
     * @param scanGlobal If global modules should also be scanned next to local modules.
     * @return A promise resolving to a mapping of an import prefix URL to an import prefix path
     */
    static getAvailableImportPaths(scanGlobal: boolean): Promise<{[id: string]: string}> {
        return new Promise((resolve, reject) => {
            let globalPath: string = scanGlobal ? globalModules : null;
            let paths: string[] = Util.getMainModulePaths();
            if (paths) {
                return Promise.all([globalPath ? Util.getImportPaths(globalPath) : {}].concat(paths.map(Util.getImportPaths)))
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

    /**
     * Deterministically converts a URI to a variable name that is safe for usage within JavaScript.
     * @param {string} uri A URI.
     * @return {string} A variable name.
     */
    static uriToVariableName(uri: string): string {
        return uri.replace(/[\\#\\^\/:\\.@-]/g, '_');
    }
}

export = Util;