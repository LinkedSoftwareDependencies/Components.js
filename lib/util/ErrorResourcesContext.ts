import { Resource } from 'rdf-object';
import type { IParamValueConflict } from '../preprocess/parameterproperty/ParameterPropertyHandlerRange.js';

/**
 * An error that can include a context containing resources for display.
 */
export class ErrorResourcesContext extends Error {
  public readonly context: IErrorContext;

  public constructor(message: string, context: IErrorContext) {
    super(message);
    this.name = 'ErrorResourcesContext';
    this.context = context;
  }

  public exportContext(): any {
    return ErrorResourcesContext.contextToJson(this.context);
  }

  public static contextToJson(context: IErrorContext): any {
    return Object.fromEntries(Object.entries(context)
      .map(([ key, value ]) => {
        let mapped: any;
        if (typeof value === 'string') {
          mapped = value;
        } else if (Array.isArray(value)) {
          mapped = value.map(valueSub => ErrorResourcesContext.resourceToJson(valueSub));
        } else if (value instanceof Resource || value === undefined) {
          mapped = ErrorResourcesContext.resourceToJson(value);
        } else if ('description' in value) {
          mapped = ErrorResourcesContext.conflictToJson(<IParamValueConflict> value);
        } else {
          mapped = ErrorResourcesContext.contextToJson(value);
        }
        return [ key, mapped ];
      }));
  }

  public static resourceToJson(resource: Resource | undefined): any {
    if (resource) {
      return resource.toJSON(1);
    }
  }

  public static conflictToJson(conflict: IParamValueConflict): any {
    const data: any = { description: conflict.description };
    if (conflict.causes) {
      data.causes = [];
      // Only pick the first 2 conflicts for visualization
      for (const subConflict of conflict.causes.slice(0, 1)) {
        data.causes.push(ErrorResourcesContext.conflictToJson(subConflict));
      }
    } else {
      data.context = ErrorResourcesContext.contextToJson(conflict.context);
    }
    return data;
  }
}

// eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style
export interface IErrorContext {
  [key: string]: Resource | Resource[] | string | undefined | IErrorContext | IParamValueConflict;
}
