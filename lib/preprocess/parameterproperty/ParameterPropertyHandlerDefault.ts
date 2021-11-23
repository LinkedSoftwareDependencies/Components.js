import type { Resource, RdfObjectLoader } from 'rdf-object';
import { IRIS_RDF } from '../../rdf/Iris';
import { ErrorResourcesContext } from '../../util/ErrorResourcesContext';
import type { IParameterPropertyHandler } from './IParameterPropertyHandler';

/**
 * If no value has been set, its default value will be set.
 */
export class ParameterPropertyHandlerDefault implements IParameterPropertyHandler {
  private readonly objectLoader: RdfObjectLoader;

  public constructor(objectLoader: RdfObjectLoader) {
    this.objectLoader = objectLoader;
  }

  public canHandle(value: Resource | undefined, configRoot: Resource, parameter: Resource): boolean {
    return Boolean(!value && parameter.property.default);
  }

  public handle(
    value: Resource | undefined,
    configRoot: Resource,
    parameter: Resource,
    configElement: Resource,
  ): Resource | undefined {
    if (parameter.properties.default.length > 1) {
      throw new ErrorResourcesContext(`Invalid default value for parameter "${parameter.value}": Only one value can be defined, or an RDF list must be provided`, { parameter });
    }

    return parameter.property.default.list ?
      this.objectLoader.createCompactedResource({
        list: parameter.property.default.list.map(subValue => this.handleValue(subValue, configElement)),
      }) :
      this.handleValue(parameter.property.default, configElement);
  }

  protected handleValue(value: Resource, configElement: Resource): Resource {
    if (value.type === 'NamedNode' && value.value === IRIS_RDF.subject) {
      value = this.objectLoader.createCompactedResource(`"${configElement.value}"`);
    }
    return value;
  }
}
