import type { Resource } from 'rdf-object';
import { IRIS_RDF } from '../rdf/Iris.js';
import type {
  IComponentConfigPreprocessorHandleResponse,
} from './ConfigPreprocessorComponent.js';
import {
  ConfigPreprocessorComponent,
} from './ConfigPreprocessorComponent.js';
import {
  ConstructorArgumentsElementMappingHandlerCollectEntries,
} from './constructorargumentsmapping/ConstructorArgumentsElementMappingHandlerCollectEntries.js';
import {
  ConstructorArgumentsElementMappingHandlerElements,
} from './constructorargumentsmapping/ConstructorArgumentsElementMappingHandlerElements.js';
import {
  ConstructorArgumentsElementMappingHandlerFields,
} from './constructorargumentsmapping/ConstructorArgumentsElementMappingHandlerFields.js';
import {
  ConstructorArgumentsElementMappingHandlerKeyValue,
} from './constructorargumentsmapping/ConstructorArgumentsElementMappingHandlerKeyValue.js';
import {
  ConstructorArgumentsElementMappingHandlerList,
} from './constructorargumentsmapping/ConstructorArgumentsElementMappingHandlerList.js';
import type {
  IConstructorArgumentsElementMappingHandler,
} from './constructorargumentsmapping/IConstructorArgumentsElementMappingHandler.js';
import type {
  IConstructorArgumentsMapper,
} from './constructorargumentsmapping/IConstructorArgumentsMapper.js';
import type { GenericsContext } from './GenericsContext.js';

/**
 * Handles config that refer to a component as type.
 * The component may have parameters that can be applied on the config.
 * Additionally, the component applies a custom constructor arguments mapping for its parameters.
 */
export class ConfigPreprocessorComponentMapped extends ConfigPreprocessorComponent
  implements IConstructorArgumentsMapper {
  private readonly mappingHandlers: IConstructorArgumentsElementMappingHandler[] = [
    new ConstructorArgumentsElementMappingHandlerKeyValue(),
    new ConstructorArgumentsElementMappingHandlerCollectEntries(this.parameterHandler),
    new ConstructorArgumentsElementMappingHandlerFields(),
    new ConstructorArgumentsElementMappingHandlerElements(),
    new ConstructorArgumentsElementMappingHandlerList(),
  ];

  public override canHandle(config: Resource): IComponentConfigPreprocessorHandleResponse | undefined {
    const handleResponse = super.canHandle(config);
    if (handleResponse && !handleResponse.component.property.constructorArguments) {
      return;
    }
    return handleResponse;
  }

  public override transformConstructorArguments(
    config: Resource,
    handleResponse: IComponentConfigPreprocessorHandleResponse,
  ): Resource {
    const constructorArgs = handleResponse.component.property.constructorArguments;
    const genericsContext = this.createGenericsContext(handleResponse, config);
    return this.applyConstructorArgumentsParameters(config, constructorArgs, config, genericsContext);
  }

  public applyConstructorArgumentsParameters(
    configRoot: Resource,
    constructorArgs: Resource,
    configElement: Resource,
    genericsContext: GenericsContext,
  ): Resource {
    // Check if this constructor args resource can be handled by one of the built-in handlers.
    for (const handler of this.mappingHandlers) {
      if (handler.canHandle(configRoot, constructorArgs, configElement, this, genericsContext)) {
        return handler.handle(configRoot, constructorArgs, configElement, this, genericsContext);
      }
    }

    // Fallback to original constructor args
    return constructorArgs;
  }

  public getParameterValue(
    configRoot: Resource,
    parameter: Resource,
    configElement: Resource,
    rawValue: boolean,
    genericsContext: GenericsContext,
  ): Resource | undefined {
    let valueOut: Resource | undefined;

    if (parameter.type === 'NamedNode' && parameter.value === IRIS_RDF.subject) {
      valueOut = this.objectLoader.createCompactedResource(`"${configElement.value}"`);
    } else if (parameter.type === 'NamedNode' && !parameter.property.fields) {
      valueOut = this.parameterHandler
        .applyParameterValues(configRoot, parameter, configElement, genericsContext);
    } else {
      valueOut = this.applyConstructorArgumentsParameters(configRoot, parameter, configElement, genericsContext);
    }

    // If the referenced IRI should become a plain string
    if (rawValue) {
      valueOut = valueOut?.list ?
        this.objectLoader.createCompactedResource({
          list: valueOut.list.map(valueOutSub => `"${valueOutSub.value}"`),
        }) :
        this.objectLoader.createCompactedResource(`"${valueOut ? valueOut.value : 'undefined'}"`);
    }
    return valueOut;
  }
}
