import type { Resource } from 'rdf-object';
import type { IParameterPropertyHandler } from './IParameterPropertyHandler';

/**
 * If the parameter is marked as lazy,
 * make the value inherit this lazy tag so that it can be handled later.
 */
export class ParameterPropertyHandlerLazy implements IParameterPropertyHandler {
  public canHandle(value: Resource | undefined, configRoot: Resource, parameter: Resource): boolean {
    return Boolean(parameter.property.lazy);
  }

  public handle(
    value: Resource | undefined,
    configRoot: Resource,
    parameter: Resource,
    configElement: Resource,
  ): Resource | undefined {
    if (value) {
      if (value.list) {
        for (const subValue of value.list) {
          subValue.property.lazy = parameter.property.lazy;
        }
      } else {
        value.property.lazy = parameter.property.lazy;
      }
    }
    return value;
  }
}
