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

export const PREFIXES: Record<string, string> = {
  oo: 'https://linkedsoftwaredependencies.org/vocabularies/object-oriented#',
  om: 'https://linkedsoftwaredependencies.org/vocabularies/object-mapping#',
  rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
  rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
  xsd: 'http://www.w3.org/2001/XMLSchema#',
  doap: 'http://usefulinc.com/ns/doap#',
  owl: 'http://www.w3.org/2002/07/owl#',
};

export const DF: DataFactory = new DataFactory<RDF.Quad>();
export const IRI_ABSTRACT_CLASS: RDF.NamedNode = DF.namedNode(`${PREFIXES.oo}AbstractClass`);
export const IRI_CLASS: RDF.NamedNode = DF.namedNode(`${PREFIXES.oo}Class`);
export const IRI_COMPONENT_INSTANCE: RDF.NamedNode = DF.namedNode(`${PREFIXES.oo}ComponentInstance`);
export const IRI_VARIABLE: RDF.NamedNode = DF.namedNode(`${PREFIXES.om}Variable`);
export const IRI_MODULE: RDF.NamedNode = DF.namedNode(`${PREFIXES.oo}Module`);

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
 * Convert the given resource to a compact string.
 * Mainly used for error reporting.
 *
 * Note that this will remove certain fields from the resource,
 * so only use this when throwing an error that will stop the process.
 *
 * @param resource A resource.
 */
export function resourceToString(resource: Resource): string {
  delete (<any> resource).predicates;
  delete (<any> resource).propertiesUri;
  delete (<any> resource).property;
  return NodeUtil.inspect(resource, { colors: true, depth: 2 });
}

/**
 * Convert the term value of the given resource to a compacted term based on the object loader's context.
 * @param resource A resource.
 * @param objectLoader An object loader.
 */
export function resourceIdToString(resource: Resource, objectLoader: RdfObjectLoader): string {
  return objectLoader.contextResolved.compactIri(resource.value);
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
        throw new Error(`Missing required oo:defaultScope value for a default scope.\n${resourceToString(param)}`);
      }
      scoped.properties.defaultScope.forEach((scope: Resource) => {
        if (!scoped.property.defaultScopedValue) {
          throw new Error(`Missing required oo:defaultScopedValue value for a default scope.\n${resourceToString(param)}`);
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
    throw new Error(`Parameter ${resourceIdToString(param, objectLoader)} is required, but no value for it has been set in ${resourceIdToString(paramValueMapping, objectLoader)}.
${resourceToString(paramValueMapping)}`);
  }

  // Force-add fixed parameter values
  if (param.property.fixed) {
    // If the parameter value must be unique and a value has already been set, crash
    if (param.property.unique) {
      if (value.length > 0) {
        throw new Error(`A parameter is unique, has a fixed value, but also has another defined value.\n${resourceToString(param)}`);
      } else {
        value = param.properties.fixed;
      }
    } else {
      // Otherwise, add to the value
      if (!Array.isArray(value)) {
        throw new Error(`Values must be an array\n${resourceToString(param)}`);
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
    value.forEach(subValue => captureType(subValue, param, objectLoader));
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
 * @param objectLoader The object loader.
 */
export function captureType(value: Resource, param: Resource, objectLoader: RdfObjectLoader): Resource {
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
    throw new Error(`${value.value} is not of type ${param.property.range.value} for parameter ${resourceIdToString(param, objectLoader)}`);
  }
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
