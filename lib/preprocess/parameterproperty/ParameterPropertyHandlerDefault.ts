import type { Resource } from 'rdf-object';
import type { IParameterPropertyHandler } from './IParameterPropertyHandler';

/**
 * If no value has been set, its default value will be set.
 */
export class ParameterPropertyHandlerDefault implements IParameterPropertyHandler {
  public canHandle(value: Resource[], configRoot: Resource, parameter: Resource, configElement: Resource): boolean {
    return Boolean(value.length === 0 && parameter.property.default);
  }

  public handle(value: Resource[], configRoot: Resource, parameter: Resource, configElement: Resource): Resource[] {
    value = parameter.properties.default;
    return value;
  }
}
