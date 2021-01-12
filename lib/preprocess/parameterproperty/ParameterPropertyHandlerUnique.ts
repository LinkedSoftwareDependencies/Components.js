import type { RdfObjectLoader } from 'rdf-object';
import { Resource } from 'rdf-object';
import type { IParameterPropertyHandler } from './IParameterPropertyHandler';

/**
 * If the value is singular, and the value should be unique, transform to a single element.
 */
export class ParameterPropertyHandlerUnique implements IParameterPropertyHandler {
  private readonly objectLoader: RdfObjectLoader;

  public constructor(objectLoader: RdfObjectLoader) {
    this.objectLoader = objectLoader;
  }

  public canHandle(value: Resource[], configRoot: Resource, parameter: Resource, configElement: Resource): boolean {
    return Boolean(parameter.property.unique && parameter.property.unique.value === 'true' && value.length > 0);
  }

  public handle(value: Resource[], configRoot: Resource, parameter: Resource, configElement: Resource): Resource[] {
    value = [ value[0] ];

    // !!!Hack incoming!!!
    // We make a manual resource to ensure uniqueness from other resources.
    // This is needed because literals may occur different times in param values.
    // This ensures that the unique label is only applied to the current occurrence, instead of all occurrences.
    // TODO: improve this
    const newValue = new Resource({ term: value[0].term, context: this.objectLoader.contextResolved });
    for (const key of Object.keys(value[0].properties)) {
      for (const subValue of value[0].properties[key]) {
        newValue.properties[key].push(subValue);
      }
    }
    value = [ newValue ];

    value[0].property.unique = parameter.property.unique;

    return value;
  }
}
