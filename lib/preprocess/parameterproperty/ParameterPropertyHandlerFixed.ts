import type { Resource, RdfObjectLoader } from 'rdf-object';
import { ErrorResourcesContext } from '../../util/ErrorResourcesContext.js';
import type { IParameterPropertyHandler } from './IParameterPropertyHandler.js';

/**
 * Irrespective of any set values, prepend the parameter's fixed values.
 */
export class ParameterPropertyHandlerFixed implements IParameterPropertyHandler {
  private readonly objectLoader: RdfObjectLoader;

  public constructor(objectLoader: RdfObjectLoader) {
    this.objectLoader = objectLoader;
  }

  public canHandle(value: Resource | undefined, configRoot: Resource, parameter: Resource): boolean {
    return Boolean(parameter.property.fixed);
  }

  public handle(
    value: Resource | undefined,
    configRoot: Resource,
    parameter: Resource,
    configElement: Resource,
  ): Resource | undefined {
    if (parameter.properties.fixed.length > 1) {
      throw new ErrorResourcesContext(`Invalid fixed value for parameter "${parameter.value}": Only one value can be defined, or an RDF list must be provided`, { parameter });
    }

    if (value) {
      const fixedValues: Resource[] = parameter.property.fixed.list || [ parameter.property.fixed ];
      if (value.list) {
        value.list.unshift(...fixedValues);
      } else {
        value = this.objectLoader.createCompactedResource({
          list: [
            ...fixedValues,
            value,
          ],
        });
      }
    } else {
      value = parameter.property.fixed;
    }

    return value;
  }
}
