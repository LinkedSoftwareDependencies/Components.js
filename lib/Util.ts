import NodeUtil = require('util');
import type { Resource, RdfObjectLoader } from 'rdf-object';

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
