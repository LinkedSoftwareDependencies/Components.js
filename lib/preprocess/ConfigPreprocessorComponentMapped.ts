import type { Resource } from 'rdf-object';
import { IRIS_RDF } from '../rdf/Iris';
import type {
  IComponentConfigPreprocessorHandleResponse,
} from './ConfigPreprocessorComponent';
import {
  ConfigPreprocessorComponent,
} from './ConfigPreprocessorComponent';
import {
  ConstructorArgumentsElementMappingHandlerCollectEntries,
} from './constructorargumentsmapping/ConstructorArgumentsElementMappingHandlerCollectEntries';
import {
  ConstructorArgumentsElementMappingHandlerElements,
} from './constructorargumentsmapping/ConstructorArgumentsElementMappingHandlerElements';
import {
  ConstructorArgumentsElementMappingHandlerFields,
} from './constructorargumentsmapping/ConstructorArgumentsElementMappingHandlerFields';
import {
  ConstructorArgumentsElementMappingHandlerKeyValue,
} from './constructorargumentsmapping/ConstructorArgumentsElementMappingHandlerKeyValue';
import {
  ConstructorArgumentsElementMappingHandlerList,
} from './constructorargumentsmapping/ConstructorArgumentsElementMappingHandlerList';
import type {
  IConstructorArgumentsElementMappingHandler,
} from './constructorargumentsmapping/IConstructorArgumentsElementMappingHandler';
import type {
  IConstructorArgumentsMapper,
} from './constructorargumentsmapping/IConstructorArgumentsMapper';

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

  public canHandle(config: Resource): IComponentConfigPreprocessorHandleResponse | undefined {
    const handleResponse = super.canHandle(config);
    if (handleResponse && !handleResponse.component.property.constructorArguments) {
      return;
    }
    return handleResponse;
  }

  public transformConstructorArguments(
    config: Resource,
    handleResponse: IComponentConfigPreprocessorHandleResponse,
  ): Resource {
    const constructorArgs = handleResponse.component.property.constructorArguments;
    return this.applyConstructorArgumentsParameters(config, constructorArgs, config);
  }

  public applyConstructorArgumentsParameters(
    configRoot: Resource,
    constructorArgs: Resource,
    configElement: Resource,
  ): Resource {
    // Check if this constructor args resource can be handled by one of the built-in handlers.
    for (const handler of this.mappingHandlers) {
      if (handler.canHandle(configRoot, constructorArgs, configElement, this)) {
        return handler.handle(configRoot, constructorArgs, configElement, this);
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
  ): Resource | undefined {
    let valueOut: Resource | undefined;

    if (parameter.type === 'NamedNode' && parameter.value === IRIS_RDF.subject) {
      valueOut = this.objectLoader.createCompactedResource(`"${configElement.value}"`);
    } else if (parameter.type === 'NamedNode' && !parameter.property.fields) {
      valueOut = this.parameterHandler.applyParameterValues(configRoot, parameter, configElement);
    } else {
      valueOut = this.applyConstructorArgumentsParameters(configRoot, parameter, configElement);
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
