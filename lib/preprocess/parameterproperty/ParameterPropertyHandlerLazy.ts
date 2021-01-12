import type { Resource } from 'rdf-object';
import type { IParameterPropertyHandler } from './IParameterPropertyHandler';

/**
 * If the parameter is marked as lazy,
 * make the value inherit this lazy tag so that it can be handled later.
 */
export class ParameterPropertyHandlerLazy implements IParameterPropertyHandler {
  public canHandle(value: Resource[], configRoot: Resource, parameter: Resource, configElement: Resource): boolean {
    return Boolean(parameter.property.lazy);
  }

  public handle(value: Resource[], configRoot: Resource, parameter: Resource, configElement: Resource): Resource[] {
    for (const subValue of value) {
      subValue.property.lazy = parameter.property.lazy;
    }
    return value;
  }
}
