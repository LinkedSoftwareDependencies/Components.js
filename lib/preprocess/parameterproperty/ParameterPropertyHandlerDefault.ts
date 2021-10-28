import type { Resource, RdfObjectLoader } from 'rdf-object';
import { IRIS_RDF } from '../../rdf/Iris';
import type { IParameterPropertyHandler } from './IParameterPropertyHandler';

/**
 * If no value has been set, its default value will be set.
 */
export class ParameterPropertyHandlerDefault implements IParameterPropertyHandler {
  private readonly objectLoader: RdfObjectLoader;

  public constructor(objectLoader: RdfObjectLoader) {
    this.objectLoader = objectLoader;
  }

  public canHandle(value: Resource[], configRoot: Resource, parameter: Resource, configElement: Resource): boolean {
    return Boolean(value.length === 0 && parameter.property.default);
  }

  public handle(value: Resource[], configRoot: Resource, parameter: Resource, configElement: Resource): Resource[] {
    value = parameter.properties.default;
    value = value.map(subValue => {
      if (subValue.type === 'NamedNode' && subValue.value === IRIS_RDF.subject) {
        subValue = this.objectLoader.createCompactedResource(`"${configElement.value}"`);
      }
      return subValue;
    });
    return value;
  }
}
