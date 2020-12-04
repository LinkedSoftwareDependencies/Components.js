import type { RdfObjectLoader, Resource } from 'rdf-object';
import { resourceIdToString, resourceToString } from '../../Util';
import type { IParameterPropertyHandler } from './IParameterPropertyHandler';

/**
 * If no value has been set, and a given default-scope applies, its default value will be set.
 */
export class ParameterPropertyHandlerDefaultScoped implements IParameterPropertyHandler {
  private readonly objectLoader: RdfObjectLoader;

  public constructor(objectLoader: RdfObjectLoader) {
    this.objectLoader = objectLoader;
  }

  public canHandle(value: Resource[], configRoot: Resource, parameter: Resource, configElement: Resource): boolean {
    return Boolean(value.length === 0 && parameter.property.defaultScoped);
  }

  public handle(value: Resource[], configRoot: Resource, parameter: Resource, configElement: Resource): Resource[] {
    // Multiple scopes can be defined
    for (const scoped of parameter.properties.defaultScoped) {
      // Require defaultScope
      if (!scoped.property.defaultScope) {
        throw new Error(`Invalid defaultScoped for parameter '${resourceIdToString(parameter, this.objectLoader)}': Missing defaultScope.
Parameter: ${resourceToString(parameter)}`);
      }

      // Multiple scope type references can be defined
      for (const scopeType of scoped.properties.defaultScope) {
        // Require defaultScopedValue
        if (!scoped.property.defaultScopedValue) {
          throw new Error(`Invalid defaultScoped for parameter '${resourceIdToString(parameter, this.objectLoader)}': Missing defaultScopedValue.
Parameter: ${resourceToString(parameter)}`);
        }

        // Apply the scope if the config is of the required type (also considering sub-types)
        if (configRoot.isA(scopeType.term)) {
          value.push(...scoped.properties.defaultScopedValue);
        }
      }
    }
    return value;
  }
}
