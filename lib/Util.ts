import fs = require('fs');
import http = require('http');
import https = require('https');
import Path = require('path');
import type { Readable } from 'stream';
import url = require('url');
import NodeUtil = require('util');
import { DataFactory } from 'rdf-data-factory';
import type * as RDF from 'rdf-js';
import { Resource } from 'rdf-object';
import type { RdfObjectLoader } from 'rdf-object';
import Module = NodeJS.Module;

const globalModules: string = require('global-modules');
const stat = NodeUtil.promisify(fs.stat);
const readdir = NodeUtil.promisify(fs.readdir);
const realpath = NodeUtil.promisify(fs.realpath);

export const PREFIXES: Record<string, string> = {
  oo: 'https://linkedsoftwaredependencies.org/vocabularies/object-oriented#',
  om: 'https://linkedsoftwaredependencies.org/vocabularies/object-mapping#',
  rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
  rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
  xsd: 'http://www.w3.org/2001/XMLSchema#',
  doap: 'http://usefulinc.com/ns/doap#',
  owl: 'http://www.w3.org/2002/07/owl#',
};

// eslint-disable-next-line prefer-const
export let NODE_MODULES_PACKAGE_CONTENTS: Record<string, string> = {};
export let MAIN_MODULE_PATH: string | undefined;
export let MAIN_MODULE_PATHS: string[] | undefined;

export const DF: DataFactory = new DataFactory<RDF.Quad>();
export const IRI_ABSTRACT_CLASS: RDF.NamedNode = DF.namedNode(`${PREFIXES.oo}AbstractClass`);
export const IRI_CLASS: RDF.NamedNode = DF.namedNode(`${PREFIXES.oo}Class`);
export const IRI_COMPONENT_INSTANCE: RDF.NamedNode = DF.namedNode(`${PREFIXES.oo}ComponentInstance`);
export const IRI_VARIABLE: RDF.NamedNode = DF.namedNode(`${PREFIXES.om}Variable`);
export const IRI_MODULE: RDF.NamedNode = DF.namedNode(`${PREFIXES.oo}Module`);

export const cachedAvailableNodeModules: Record<string, Promise<string[]>> = {};

/**
 * Get the file contents from a file path or URL
 * @param path The file path or url.
 * @param fromPath The path to base relative paths on.
 *                 Default is the current running directory.
 * @returns {Promise<T>} A promise resolving to the data stream.
 * @private
 */
export function getContentsFromUrlOrPath(path: string, fromPath?: string): Promise<Readable> {
  return new Promise((resolve, reject) => {
    const parsedUrl: any = url.parse(path);
    const separatorPos: number = path.indexOf(':');
    if ((separatorPos >= 0 && separatorPos < path.length && path.charAt(separatorPos + 1) === '\\') ||
      !parsedUrl.protocol || parsedUrl.protocol === 'file:') {
      if (Path.isAbsolute(parsedUrl.path)) {
        fromPath = '';
      }
      resolve(fs.createReadStream(Path.join(fromPath || '', parsedUrl.path)).on('error', rejectContext));
    } else {
      try {
        const request = (<any>(parsedUrl.protocol === 'https:' ? https : http))
          .request(parsedUrl, (data: Readable) => {
            data.on('error', rejectContext);
            resolve(data);
          });
        request.on('error', rejectContext);
        request.end();
      } catch (error: unknown) {
        rejectContext(<Error>error);
      }
    }

    function rejectContext(error: Error): void {
      reject(addFilePathToError(error, path, fromPath));
    }
  });
}

/**
 * Apply parameter values for the given parameter.
 * @param resourceScope The resource scope to map in.
 * @param param A parameter type.
 * @param paramValueMapping A mapping from parameter to value.
 * @param objectLoader The current RDF object loader.
 * @return The parameter value(s) or undefined
 */
export function applyParameterValues(
  resourceScope: Resource,
  param: Resource,
  paramValueMapping: Resource,
  objectLoader: RdfObjectLoader,
): Resource[] {
  let value: Resource[] = paramValueMapping.properties[param.value];
  // Set default value if no value has been given
  if (value.length === 0 && param.property.defaultScoped) {
    param.properties.defaultScoped.forEach((scoped: Resource) => {
      if (!scoped.property.defaultScope) {
        throw new Error(`Missing required oo:defaultScope value for a default scope.\n${NodeUtil.inspect(param)}`);
      }
      scoped.properties.defaultScope.forEach((scope: Resource) => {
        if (!scoped.property.defaultScopedValue) {
          throw new Error(`Missing required oo:defaultScopedValue value for a default scope.\n${NodeUtil.inspect(param)}`);
        }
        if (resourceScope.isA(scope.term)) {
          value = scoped.properties.defaultScopedValue;
        }
      });
    });
  }

  if (value.length === 0 && param.property.default) {
    value = param.properties.default;
  }
  if (value.length === 0 && param.property.required) {
    throw new Error(`Parameter ${param.value} is required, but no value for it has been set in ${paramValueMapping.value}.\n${NodeUtil.inspect(paramValueMapping)}`);
  }

  // Force-add fixed parameter values
  if (param.property.fixed) {
    // If the parameter value must be unique and a value has already been set, crash
    if (param.property.unique) {
      if (value.length > 0) {
        throw new Error(`A parameter is unique, has a fixed value, but also has another defined value.\n${NodeUtil.inspect(param)}`);
      } else {
        value = param.properties.fixed;
      }
    } else {
      // Otherwise, add to the value
      if (!Array.isArray(value)) {
        throw new Error(`Values must be an array\n${NodeUtil.inspect(param)}`);
      }
      param.properties.fixed.forEach((fixed: Resource) => value.push(fixed));
    }
  }

  // If the value is singular, and the value should be unique, transform the array to a single element
  if (param.property.unique && param.property.unique.value === 'true') {
    value = [ value[0] ];

    // !!!Hack incoming!!!
    // We make a manual resource to ensure uniqueness from other resources.
    // This is needed because literals may occur different times in param values.
    // This ensures that the unique label is only applied to the current occurrence, instead of all occurrences.
    // TODO: improve this
    if (value[0]) {
      const newValue = new Resource({ term: value[0].term, context: objectLoader.contextResolved });
      for (const key of Object.keys(value[0].properties)) {
        for (const subValue of value[0].properties[key]) {
          newValue.properties[key].push(subValue);
        }
      }
      value = [ newValue ];
    }

    value.forEach(subValue => {
      if (subValue) {
        subValue.property.unique = param.property.unique;
      }
    });
  }

  // If a param range is defined, apply the type and validate the range.
  if (param.property.range) {
    value.forEach(subValue => captureType(subValue, param));
  }

  // If the parameter is marked as lazy,
  // make the value inherit this lazy tag so that it can be handled later.
  if (value && param.property.lazy) {
    value.forEach(subValue => {
      subValue.property.lazy = param.property.lazy;
    });
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
 */
export function captureType(value: Resource, param: Resource): Resource {
  if (value.type === 'Literal') {
    let parsed;
    switch (param.property.range.value) {
      case `${PREFIXES.xsd}boolean`:
        if (value.value === 'true') {
          (<any>value.term).valueRaw = true;
        } else if (value.value === 'false') {
          (<any>value.term).valueRaw = false;
        } else {
          incorrectType();
        }
        break;
      case `${PREFIXES.xsd}integer`:
      case `${PREFIXES.xsd}number`:
      case `${PREFIXES.xsd}int`:
      case `${PREFIXES.xsd}byte`:
      case `${PREFIXES.xsd}long`:
        parsed = Number.parseInt(value.value, 10);
        if (Number.isNaN(parsed)) {
          incorrectType();
        } else {
          // ParseInt also parses floats to ints!
          if (String(parsed) !== value.value) {
            incorrectType();
          }
          (<any>value.term).valueRaw = parsed;
        }
        break;
      case `${PREFIXES.xsd}float`:
      case `${PREFIXES.xsd}decimal`:
      case `${PREFIXES.xsd}double`:
        parsed = Number.parseFloat(value.value);
        if (Number.isNaN(parsed)) {
          incorrectType();
        } else {
          (<any>value.term).valueRaw = parsed;
        }
        break;
    }
  }
  return value;

  function incorrectType(): void {
    throw new Error(`${value.value} is not of type ${param.property.range.value} for parameter ${param.value}`);
  }
}

/**
 * Set the main module path.
 * This will also update the main module paths.
 * @param {string} path A path.
 */
export function setMainModulePath(path: string): void {
  MAIN_MODULE_PATH = fs.realpathSync(path);
  const sections: string[] = MAIN_MODULE_PATH.split(Path.sep);
  const paths: string[] = [];
  for (let i = sections.length; i > 1; i--) {
    paths.push(sections.slice(0, i).join(Path.sep));
  }
  setMainModulePaths(paths);
}

export function initDefaultMainModulePath(): string | undefined {
  for (const nodeModulesPath of (<Module>require.main).paths) {
    const path = nodeModulesPath.replace(/node_modules$/u, 'package.json');
    try {
      require(path);
      setMainModulePath(path.replace(/package.json$/u, ''));
      return getMainModulePath();
    } catch {
      // Do nothing
    }
  }
}

/**
 * @returns {any} The path to the current main Node module.
 */
export function getMainModulePath(): string {
  if (MAIN_MODULE_PATH) {
    return MAIN_MODULE_PATH;
  }
  initDefaultMainModulePath();
  if (!MAIN_MODULE_PATH) {
    throw new Error('Main node module path could not be found.');
  }
  return MAIN_MODULE_PATH;
}

/**
 * Set the main module paths.
 * @param {string[]} paths A list paths. Like require.main.paths, but starting from the main module path.
 */
export function setMainModulePaths(paths: string[]): void {
  MAIN_MODULE_PATHS = paths;
}

/**
 * Set the main module paths.
 * @return {string[]} A list of paths. Like require.main.paths, but starting from the main module path.
 */
export function getMainModulePaths(): string[] {
  if (MAIN_MODULE_PATHS) {
    return MAIN_MODULE_PATHS;
  }
  initDefaultMainModulePath();
  if (!MAIN_MODULE_PATHS) {
    throw new Error('List of main node module paths could not be found.');
  }
  return MAIN_MODULE_PATHS;
}

/**
 * Get all currently available node module paths.
 * @param path The path to start from.
 * @param cb A callback for each absolute path.
 * @param ignorePaths The paths that should be ignored.
 */
export function getAvailableNodeModules(
  path: string,
  cb: (subPath: string | null) => any,
  ignorePaths: Record<string, boolean> = {},
): void {
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  if (cachedAvailableNodeModules[path]) {
    cachedAvailableNodeModules[path].then(paths => {
      paths.forEach(cb);
      cb(null);
    }).catch(() => cb(null));
  } else {
    cachedAvailableNodeModules[path] = new Promise<string[]>((resolve, reject) => {
      const paths: string[] = [];
      recurse(path, subPath => {
        paths.push(subPath);
        cb(subPath);
      }).then(() => {
        resolve(paths);
        cb(null);
      }).catch(reject);
    });
  }

  async function recurse(subPath: string, subCb: (subSubPath: string) => any): Promise<any> {
    subPath = await realpath(subPath);

    // Avoid infinite loops
    if (ignorePaths[subPath]) {
      return null;
    }
    ignorePaths[subPath] = true;

    try {
      // Check if the path is a node module
      if ((await stat(Path.join(subPath, 'package.json'))).isFile()) {
        subCb(subPath);

        // Start iterating through all node modules inside this root module.
        const rootNodeModules = Path.join(subPath, 'node_modules');
        const modules: string[] = await readdir(rootNodeModules);
        for (const module of modules) {
          // Ignore .bin folders
          if (!module.startsWith('.')) {
            const modulePath = Path.join(rootNodeModules, module);
            // Iterate one level deeper when we find '@' folders
            if (module.startsWith('@')) {
              const scopedModules: string[] = await readdir(modulePath);
              for (const scopedModule of scopedModules) {
                await recurse(Path.join(modulePath, scopedModule), subCb);
              }
            } else {
              await recurse(modulePath, subCb);
            }
          }
        }
      }
    } catch {
      // Do nothing
    }
    return null;
  }
}

/**
 * Get the package.json file from the given path.
 * Require's will be cached.
 * @param path The path.
 * @returns {any} The package.json or null.
 */
export function getPackageJson(path: string): any {
  let data: any = NODE_MODULES_PACKAGE_CONTENTS[path];
  if (!data) {
    if (fs.existsSync(path)) {
      data = require(path);
      if (data) {
        NODE_MODULES_PACKAGE_CONTENTS[path] = data;
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
export function getModuleComponentPaths(path: string): Promise<Record<string, string>> {
  return new Promise((resolve, reject) => {
    const data: Record<string, string> = {};
    getAvailableNodeModules(path, modulePath => {
      if (!modulePath) {
        return resolve(data);
      }
      const pckg: any = getPackageJson(Path.join(modulePath, 'package.json'));
      if (pckg) {
        const currentModuleUri: string = pckg['lsd:module'];
        const relativePath: string = pckg['lsd:components'];
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
export async function getAvailableModuleComponentPaths(scanGlobal: boolean): Promise<Record<string, string>> {
  const globalPath:
  string | undefined = scanGlobal ? globalModules : undefined;
  const paths: string[] = getMainModulePaths();
  if (paths) {
    // Local paths can overwrite global paths
    const subPaths: Record<string, string>[] = await Promise.all([
      globalPath ? getModuleComponentPaths(globalPath) : {},
    ].concat(paths.map(getModuleComponentPaths)));
    return subPaths.reduce((subPath, currentPaths) => {
      for (const [ key, value ] of Object.entries(currentPaths)) {
        subPath[key] = value;
      }
      return subPath;
    }, {});
  }
  throw new Error('No paths were provided');
}

/**
 * Get all JSON-LD contexts reachable from the given path.
 * This checks all available node modules and checks their package.json
 * for `lsd:contexts`.
 * @param path The path to search from.
 * @return A promise resolving to a mapping of context URL to parsed context contents
 */
export function getContextPaths(path: string): Promise<Record<string, any>> {
  return new Promise((resolve, reject) => {
    const data: Record<string, any> = {};
    getAvailableNodeModules(path, modulePath => {
      if (!modulePath) {
        return resolve(data);
      }
      const pckg: any = getPackageJson(Path.join(modulePath, 'package.json'));
      if (pckg) {
        const contexts: Record<string, string> = pckg['lsd:contexts'];
        if (contexts) {
          for (const [ key, value ] of Object.entries(contexts)) {
            if (!(key in data)) {
              const filePath: string = Path.join(modulePath, value);
              data[key] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            }
          }
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
 * @return A promise resolving to a mapping of context URL to parsed context contents
 */
export async function getAvailableContexts(scanGlobal: boolean): Promise<Record<string, any>> {
  const globalPath: string | undefined = scanGlobal ? globalModules : undefined;
  const paths: string[] = getMainModulePaths();
  if (paths) {
    // Local paths can overwrite global paths
    const subPaths: Record<string, string>[] = await Promise.all([
      globalPath ? getContextPaths(globalPath) : {},
    ].concat(paths.map(getContextPaths)));
    return subPaths.reduce((subPath, currentPaths) => {
      for (const [ key, value ] of Object.entries(currentPaths)) {
        subPath[key] = value;
      }
      return subPath;
    }, {});
  }
  throw new Error('No paths were provided');
}

/**
 * Get all import paths reachable from the given path.
 * This checks all available node modules and checks their package.json
 * for `lsd:importPaths`.
 * @param path The path to search from.
 * @return A promise resolving to a mapping of an import prefix URL to an import prefix path
 */
export function getImportPaths(path: string): Promise<Record<string, string>> {
  return new Promise((resolve, reject) => {
    const data: Record<string, string> = {};
    getAvailableNodeModules(path, modulePath => {
      if (!modulePath) {
        return resolve(data);
      }
      const pckg: any = getPackageJson(Path.join(modulePath, 'package.json'));
      if (pckg) {
        const contexts: Record<string, string> = pckg['lsd:importPaths'];
        if (contexts) {
          for (const [ key, value ] of Object.entries(contexts)) {
            if (!(key in data)) {
              data[key] = Path.join(modulePath, value);

              // Crash when the context prefix target does not exist
              if (!fs.existsSync(data[key])) {
                reject(new Error(`Error while parsing import path '${key}' in ${modulePath}: ${data[key]} does not exist.`));
              }
            }
          }
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
export async function getAvailableImportPaths(scanGlobal: boolean): Promise<Record<string, string>> {
  const globalPath: string | undefined = scanGlobal ? globalModules : undefined;
  const paths: string[] = getMainModulePaths();
  if (paths) {
    // Local paths can overwrite global paths
    const subPaths: Record<string, string>[] = await Promise.all([
      globalPath ? getImportPaths(globalPath) : {},
    ].concat(paths.map(getImportPaths)));
    return subPaths.reduce((subPath, currentPaths) => {
      for (const [ key, value ] of Object.entries(currentPaths)) {
        subPath[key] = value;
      }
      return subPath;
    }, {});
  }
  throw new Error('No paths were provided');
}

/**
 * Add a file path to an error message.
 * @param error The original error message.
 * @param filePath The file path.
 * @param fromPath The optional base path.
 * @returns {Error} The new error with file path context.
 */
export function addFilePathToError(error: Error, filePath: string, fromPath?: string): Error {
  return new Error(`Invalid components file "${fromPath ? Path.join(fromPath, filePath) : filePath}":\n${error.stack}`);
}

/**
 * Deterministically converts a URI to a variable name that is safe for usage within JavaScript.
 * @param {string} uri A URI.
 * @return {string} A variable name.
 */
export function uriToVariableName(uri: string): string {
  return uri.replace(/[#./:@\\^-]/gu, '_');
}
