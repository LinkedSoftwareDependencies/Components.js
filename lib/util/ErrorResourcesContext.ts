import NodeUtil = require('util');
import type { Resource } from 'rdf-object';

/**
 * An error that can include a context containing resources for display.
 */
export class ErrorResourcesContext extends Error {
  public readonly context: ErrorContext;

  public constructor(message: string, context: ErrorContext) {
    super(`${message}\n${ErrorResourcesContext.contextToString(context)}`);
    this.name = 'ErrorResourcesContext';
    this.context = context;
  }

  public static contextToString(context: ErrorContext, indent = 0): string {
    return Object.entries(context)
      .map(([ key, value ]) => `${key}: ${typeof value === 'string' ?
        value :
        // eslint-disable-next-line @typescript-eslint/no-extra-parens
        (Array.isArray(value) ?
          value.map(valueSub => ErrorResourcesContext.resourceToString(valueSub)) :
          ErrorResourcesContext.resourceToString(value))}`)
      .join(`\n${' '.repeat(indent)}`);
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
  public static resourceToString(resource: Resource | undefined): string {
    if (!resource) {
      return 'undefined';
    }
    return NodeUtil.inspect({
      term: resource.term,
      properties: resource.properties,
      ...resource.list ? { list: resource.list } : {},
    }, { colors: true, depth: 2 });
  }
}

export type ErrorContext = Record<string, Resource | Resource[] | string | undefined>;
