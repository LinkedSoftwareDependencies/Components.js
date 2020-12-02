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
export const IRI_MODULE: RDF.NamedNode = DF.namedNode(`${PREFIXES.oo}Module`);

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
  delete (<any> resource).context;
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
  return resource.value;
}

/**
 * Apply parameter values for the given parameter.
 * @param configRoot The root config resource that we are working in.
 * @param parameter The parameter resource to get the value for.
 * @param configElement Part of the config resource to look for parameter instantiations as predicates.
 * @param objectLoader The current RDF object loader.
 * @return The parameter value(s)
 */
export function applyParameterValues(
  configRoot: Resource,
  parameter: Resource,
  configElement: Resource,
  objectLoader: RdfObjectLoader,
): Resource[] {
  let value: Resource[] = configElement.properties[parameter.value];
  // Set default value if no value has been given
  if (value.length === 0 && parameter.property.defaultScoped) {
    for (const scoped of parameter.properties.defaultScoped) {
      if (!scoped.property.defaultScope) {
        throw new Error(`Missing required oo:defaultScope value for a default scope.\n${resourceToString(parameter)}`);
      }
      for (const scope of scoped.properties.defaultScope) {
        if (!scoped.property.defaultScopedValue) {
          throw new Error(`Missing required oo:defaultScopedValue value for a default scope.\n${resourceToString(parameter)}`);
        }
        if (configRoot.isA(scope.term)) {
          value = scoped.properties.defaultScopedValue;
        }
      }
    }
  }

  if (value.length === 0 && parameter.property.default) {
    value = parameter.properties.default;
  }
  if (value.length === 0 && parameter.property.required) {
    throw new Error(`Parameter ${resourceIdToString(parameter, objectLoader)} is required, but no value for it has been set in ${resourceIdToString(configElement, objectLoader)}.
${resourceToString(configElement)}`);
  }

  // Force-add fixed parameter values
  if (parameter.property.fixed) {
    // If the parameter value must be unique and a value has already been set, crash
    if (parameter.property.unique) {
      if (value.length > 0) {
        throw new Error(`A parameter is unique, has a fixed value, but also has another defined value.\n${resourceToString(parameter)}`);
      } else {
        value = parameter.properties.fixed;
      }
    } else {
      // Otherwise, add to the value
      if (!Array.isArray(value)) {
        throw new Error(`Values must be an array\n${resourceToString(parameter)}`);
      }
      for (const fixed of parameter.properties.fixed) {
        value.push(fixed);
      }
    }
  }

  // If the value is singular, and the value should be unique, transform the array to a single element
  if (parameter.property.unique && parameter.property.unique.value === 'true' && value.length > 0) {
    value = [ value[0] ];

    // !!!Hack incoming!!!
    // We make a manual resource to ensure uniqueness from other resources.
    // This is needed because literals may occur different times in param values.
    // This ensures that the unique label is only applied to the current occurrence, instead of all occurrences.
    // TODO: improve this
    const newValue = new Resource({ term: value[0].term, context: objectLoader.contextResolved });
    for (const key of Object.keys(value[0].properties)) {
      for (const subValue of value[0].properties[key]) {
        newValue.properties[key].push(subValue);
      }
    }
    value = [ newValue ];

    for (const subValue of value) {
      subValue.property.unique = parameter.property.unique;
    }
  }

  // If a param range is defined, apply the type and validate the range.
  if (parameter.property.range) {
    for (const subValue of value) {
      captureType(subValue, parameter, objectLoader);
    }
  }

  // If the parameter is marked as lazy,
  // make the value inherit this lazy tag so that it can be handled later.
  if (value && parameter.property.lazy) {
    for (const subValue of value) {
      subValue.property.lazy = parameter.property.lazy;
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
