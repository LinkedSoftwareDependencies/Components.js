import type { RdfObjectLoader, Resource } from 'rdf-object';
import { ErrorResourcesContext } from '../util/ErrorResourcesContext';
import type { IParameterPropertyHandler } from './parameterproperty/IParameterPropertyHandler';
import { ParameterPropertyHandlerDefault } from './parameterproperty/ParameterPropertyHandlerDefault';
import { ParameterPropertyHandlerDefaultScoped } from './parameterproperty/ParameterPropertyHandlerDefaultScoped';
import { ParameterPropertyHandlerFixed } from './parameterproperty/ParameterPropertyHandlerFixed';
import { ParameterPropertyHandlerLazy } from './parameterproperty/ParameterPropertyHandlerLazy';
import { ParameterPropertyHandlerRange } from './parameterproperty/ParameterPropertyHandlerRange';

/**
 * Handles component parameters in the context of a config.
 */
export class ParameterHandler {
  private readonly objectLoader: RdfObjectLoader;
  private readonly parameterPropertyHandlers: IParameterPropertyHandler[];

  public constructor(options: IParameterHandlerOptions) {
    this.objectLoader = options.objectLoader;
    this.parameterPropertyHandlers = [
      new ParameterPropertyHandlerDefaultScoped(this.objectLoader),
      new ParameterPropertyHandlerDefault(this.objectLoader),
      new ParameterPropertyHandlerFixed(this.objectLoader),
      new ParameterPropertyHandlerRange(this.objectLoader),
      new ParameterPropertyHandlerLazy(),
    ];
  }

  /**
   * Obtain the values of the given parameter in the context of the given config.
   * @param configRoot The root config resource that we are working in.
   * @param parameter The parameter resource to get the value for.
   * @param configElement Part of the config resource to look for parameter instantiations as predicates.
   * @return The parameter value
   */
  public applyParameterValues(
    configRoot: Resource,
    parameter: Resource,
    configElement: Resource,
  ): Resource | undefined {
    // Make sure that we always have a single value with list elements in it.
    const values = configElement.properties[parameter.value];
    let value: Resource | undefined;
    if (values.length === 1) {
      value = values[0];
    } else if (values.length > 0) {
      throw new ErrorResourcesContext(`Detected multiple values for parameter ${parameter.value}. RDF lists should be used for defining multiple values.`, {
        arguments: values,
      });
    }

    // Run the value through all applicable parameters property handlers.
    for (const handler of this.parameterPropertyHandlers) {
      if (handler.canHandle(value, configRoot, parameter, configElement)) {
        value = handler.handle(value, configRoot, parameter, configElement);
      }
    }

    return value;
  }
}

export interface IParameterHandlerOptions {
  objectLoader: RdfObjectLoader;
}
