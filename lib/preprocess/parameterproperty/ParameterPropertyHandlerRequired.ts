import type { RdfObjectLoader, Resource } from 'rdf-object';
import { ErrorResourcesContext } from '../../util/ErrorResourcesContext';
import type { IParameterPropertyHandler } from './IParameterPropertyHandler';

/**
 * If no value has been set, but a value is required, throw.
 */
export class ParameterPropertyHandlerRequired implements IParameterPropertyHandler {
  private readonly objectLoader: RdfObjectLoader;

  public constructor(objectLoader: RdfObjectLoader) {
    this.objectLoader = objectLoader;
  }

  public canHandle(value: Resource[], configRoot: Resource, parameter: Resource, configElement: Resource): boolean {
    return Boolean(value.length === 0 && parameter.property.required);
  }

  public handle(value: Resource[], configRoot: Resource, parameter: Resource, configElement: Resource): Resource[] {
    throw new ErrorResourcesContext(`No value was set for required parameter "${parameter.value}"`, {
      config: configElement,
      parameter,
    });
  }
}
