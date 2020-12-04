import NodeUtil = require('util');
import { DataFactory } from 'rdf-data-factory';
import type * as RDF from 'rdf-js';
import type { Resource, RdfObjectLoader } from 'rdf-object';

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
