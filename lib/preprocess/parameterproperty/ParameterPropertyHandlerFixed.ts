import type { Resource } from 'rdf-object';
import type { IParameterPropertyHandler } from './IParameterPropertyHandler';

/**
 * Irrespective of any set values, prepend the parameter's fixed values.
 */
export class ParameterPropertyHandlerFixed implements IParameterPropertyHandler {
  public canHandle(value: Resource[], configRoot: Resource, parameter: Resource, configElement: Resource): boolean {
    return Boolean(parameter.property.fixed);
  }

  public handle(value: Resource[], configRoot: Resource, parameter: Resource, configElement: Resource): Resource[] {
    value.unshift(...parameter.properties.fixed);
    return value;
  }
}
