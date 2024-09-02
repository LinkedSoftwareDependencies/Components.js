import type { RdfObjectLoader, Resource } from 'rdf-object';
import { ErrorResourcesContext } from '../../util/ErrorResourcesContext.js';
import type { IParameterPropertyHandler } from './IParameterPropertyHandler.js';

/**
 * If no value has been set, and a given default-scope applies, its default value will be set.
 */
export class ParameterPropertyHandlerDefaultScoped implements IParameterPropertyHandler {
  private readonly objectLoader: RdfObjectLoader;

  public constructor(objectLoader: RdfObjectLoader) {
    this.objectLoader = objectLoader;
  }

  public canHandle(value: Resource | undefined, configRoot: Resource, parameter: Resource): boolean {
    return Boolean(!value && parameter.property.defaultScoped);
  }

  public handle(
    value: Resource | undefined,
    configRoot: Resource,
    parameter: Resource,
    configElement: Resource,
  ): Resource | undefined {
    let applyingValue: Resource | undefined;
    for (const scoped of parameter.properties.defaultScoped) {
      // Require defaultScope
      if (!scoped.property.defaultScope) {
        throw new ErrorResourcesContext(`Invalid defaultScoped for parameter "${parameter.value}": Missing defaultScope`, { parameter });
      }

      // Multiple scope type references can be defined
      for (const scopeType of scoped.properties.defaultScope) {
        // Require defaultScopedValue
        if (!scoped.property.defaultScopedValue) {
          throw new ErrorResourcesContext(`Invalid defaultScoped for parameter "${parameter.value}": Missing defaultScopedValue`, { parameter });
        }

        // Require RDF list or single value
        if (scoped.properties.defaultScopedValue.length > 1) {
          throw new ErrorResourcesContext(`Invalid defaultScoped value for parameter "${parameter.value}": Only one defaultScopedValue can be defined, or an RDF list must be provided`, { parameter });
        }

        // Apply the scope if the config is of the required type (also considering sub-types)
        if (configRoot.isA(scopeType.term)) {
          applyingValue = !applyingValue ?
            scoped.property.defaultScopedValue :
            this.objectLoader.createCompactedResource({
              list: [
                ...applyingValue.list || [ applyingValue ],
                ...scoped.property.defaultScopedValue.list || [ scoped.property.defaultScopedValue ],
              ],
            });
        }
      }
    }
    return applyingValue;
  }
}
