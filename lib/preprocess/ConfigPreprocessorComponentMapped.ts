import type { Resource } from 'rdf-object';
import * as Util from '../Util';
import { resourceIdToString, resourceToString } from '../Util';
import type {
  IComponentConfigPreprocessorHandleResponse,
} from './ConfigPreprocessorComponent';
import {
  ConfigPreprocessorComponent,
} from './ConfigPreprocessorComponent';

/**
 * Handles config that refer to a component as type.
 * The component may have parameters that can be applied on the config.
 * Additionally, the component applies a custom constructor arguments mapping for its parameters.
 */
export class ConfigPreprocessorComponentMapped extends ConfigPreprocessorComponent {
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
  ): Resource[] {
    const constructorArgs = handleResponse.component.property.constructorArguments;
    return this.applyConstructorArgumentsParameters(config, constructorArgs, config);
  }

  /**
   * Map config with param instantiations to a raw config according to the given constructor arguments definition.
   *
   * For example, the constructor arg { key: '"param0"', value: 'http://example.org/param0' }
   * with config { 'http://example.org/param0': '"abc"' }
   * will be mapped to { key: '"param0"', value: '"abc"' }.
   *
   * @param configRoot The root config resource that we are working in.
   * @param constructorArgs Object mapping definition inside the constructor arguments.
   * @param configElement Part of the config resource to look for parameter instantiations as predicates.
   */
  public applyConstructorArgumentsParameters(
    configRoot: Resource,
    constructorArgs: Resource,
    configElement: Resource,
  ): Resource[] {
    if (constructorArgs.property.value || constructorArgs.property.valueRawReference) {
      // Plain key-value object
      if (constructorArgs.property.key &&
        constructorArgs.property.key.type === 'Literal' &&
        !constructorArgs.property.collectEntries) {
        const ret = this.objectLoader.createCompactedResource({});
        ret.property.key = constructorArgs.property.key;
        for (const value of this.getParameterValue(
          configRoot,
          constructorArgs.property.value || constructorArgs.property.valueRawReference,
          configElement,
          Boolean(constructorArgs.property.valueRawReference),
        )) {
          ret.properties.value.push(value);
        }
        return [ ret ];
      }

      // Direct value
      if (!constructorArgs.property.key && !constructorArgs.property.collectEntries) {
        return this.getParameterValue(
          configRoot,
          constructorArgs.property.value || constructorArgs.property.valueRawReference,
          configElement,
          Boolean(constructorArgs.property.valueRawReference),
        );
      }

      // Dynamic key-value's based on collectEntries
      if (!constructorArgs.property.collectEntries) {
        throw new Error(`Detected illegal IRI object key '${constructorArgs.property.key.term.value}', which is only allowed with collectEntries.
Constructor arguments: ${resourceToString(constructorArgs)}
Parsed config: ${resourceToString(configRoot)}`);
      }
      return constructorArgs.properties.collectEntries.reduce((data: Resource[], entry: Resource) => {
        if (entry.type !== 'NamedNode') {
          throw new Error(`Detected illegal collectEntries value (${entry.type}), must be an IRI.
Constructor arguments: ${resourceToString(constructorArgs)}
Parsed config: ${resourceToString(configRoot)}`);
        }
        for (const value of Util.applyParameterValues(configRoot, entry, configElement, this.objectLoader)) {
          data.push(value);
        }
        return data;
      }, [])
        .map((entryResource: Resource) => {
          let key: Resource | undefined;
          let value: Resource;
          if (constructorArgs.property.key) {
            if (constructorArgs.property.key.type === 'NamedNode' && constructorArgs.property.key.value === `${Util.PREFIXES.rdf}subject`) {
              key = this.objectLoader.getOrMakeResource(Util.DF.literal(entryResource.value));
            } else if (entryResource.properties[constructorArgs.property.key.value].length !== 1) {
              throw new Error(`Detected more than one key value in collectEntries.
Key: ${resourceIdToString(constructorArgs.property.key, this.objectLoader)}
Key values: ${entryResource.properties[constructorArgs.property.key.value].map(res => res.term.value)} 
Collect entry: ${resourceToString(entryResource)}
Constructor arguments: ${resourceToString(constructorArgs)}
Parsed config: ${resourceToString(configRoot)}`);
            } else {
              key = entryResource.properties[constructorArgs.property.key.value][0];
            }
          }

          if (constructorArgs.property.value.type === 'NamedNode' && constructorArgs.property.value.value === `${Util.PREFIXES.rdf}subject`) {
            value = this.objectLoader.getOrMakeResource(Util.DF.literal(entryResource.value));
          } else if (constructorArgs.property.value.type === 'NamedNode' && constructorArgs.property.value.value === `${Util.PREFIXES.rdf}object`) {
            value = this.applyConstructorArgumentsParameters(configRoot, entryResource, configElement)[0];
          } else if (constructorArgs.property.value && (constructorArgs.property.value.property.fields ||
            constructorArgs.property.value.property.elements)) {
            // Nested mapping should reduce the parameter scope
            // TODO: in the case of elements, perhaps we don't always just want the first
            value = this.getParameterValue(configRoot, constructorArgs.property.value, entryResource, false)[0];
          } else if (entryResource.properties[constructorArgs.property.value.value].length !== 1) {
            throw new Error(`Detected more than one value value in collectEntries.
Value: ${resourceIdToString(constructorArgs.property.value, this.objectLoader)}
Value values: ${entryResource.properties[constructorArgs.property.value.value].map(res => res.term.value)} 
Collect entry: ${resourceToString(entryResource)}
Constructor arguments: ${resourceToString(constructorArgs)}
Parsed config: ${resourceToString(configRoot)}`);
          } else {
            value = entryResource.properties[constructorArgs.property.value.value][0];
          }
          if (key) {
            const ret = this.objectLoader.getOrMakeResource(Util.DF.blankNode());
            ret.property.key = key;
            value.property.unique = this.objectLoader.createCompactedResource('"true"');
            ret.property.value = value;
            return ret;
          }
          return value;
        });
    }

    // A collection of key-value pairs that form an object
    if (constructorArgs.property.fields) {
      const ret = this.objectLoader.createCompactedResource({});
      for (const field of constructorArgs.properties.fields) {
        for (const mappedResource of this.applyConstructorArgumentsParameters(configRoot, field, configElement)) {
          ret.properties.fields.push(mappedResource);
        }
      }
      ret.property.unique = this.objectLoader.createCompactedResource('"true"');
      return [ ret ];
    }

    // An array of objects is mapped to multiple mapped property values
    if (constructorArgs.property.elements) {
      if (!constructorArgs.property.elements.list) {
        throw new Error(`Illegal non-RDF-list elements.
Elements: ${resourceToString(constructorArgs.property.elements)}
Constructor arguments: ${resourceToString(constructorArgs)}
Parsed config: ${resourceToString(configRoot)}`);
      }
      const ret = this.objectLoader.createCompactedResource({});
      for (const element of constructorArgs.property.elements.list) {
        if (element.type !== 'NamedNode' && !element.property.value && !element.property.valueRawReference) {
          throw new Error(`Illegal elements value, must be an IRI or resource with value/valueRawReference.
Elements value: ${resourceToString(element)}
Elements: ${resourceToString(constructorArgs.property.elements)}
Constructor arguments: ${resourceToString(constructorArgs)}
Parsed config: ${resourceToString(configRoot)}`);
        }
        for (const value of this.getParameterValue(
          configRoot,
          element,
          configElement,
          Boolean(element.property.valueRawReference),
        )) {
          ret.properties.value.push(value);
        }
      }
      return [ ret ];
    }

    // An RDF list of objects is mapped to an RDF list of mapped objects
    if (constructorArgs.list) {
      const ret = this.objectLoader.createCompactedResource({});
      ret.list = [];
      for (const argument of constructorArgs.list) {
        const mappeds = argument.property.fields || argument.property.elements ?
          this.applyConstructorArgumentsParameters(configRoot, argument, configElement) :
          this.getParameterValue(configRoot, argument, configElement, false);
        for (const mapped of mappeds) {
          ret.list.push(mapped);
        }
      }
      return [ ret ];
    }
    return [ constructorArgs ];
  }

  /**
   * Obtain the value(s) of the given parameter in the given config.
   * @param configRoot The root config resource that we are working in.
   * @param parameter The parameter resource to get the value for.
   * @param configElement Part of the config resource to look for parameter instantiations as predicates.
   * @param rawValue If the IRI represents a raw string value instead of a parameter reference.
   */
  public getParameterValue(
    configRoot: Resource,
    parameter: Resource,
    configElement: Resource,
    rawValue: boolean,
  ): Resource[] {
    let valueOut: Resource[];

    if (parameter.type === 'NamedNode' && parameter.value === `${Util.PREFIXES.rdf}subject`) {
      valueOut = [ this.objectLoader.createCompactedResource(`"${configElement.value}"`) ];
      valueOut[0].property.unique = this.objectLoader.createCompactedResource('"true"');
    } else if (parameter.type === 'NamedNode') {
      valueOut = Util.applyParameterValues(configRoot, parameter, configElement, this.objectLoader);
    } else {
      valueOut = this.applyConstructorArgumentsParameters(configRoot, parameter, configElement);
    }
    // TODO: check if we really want to singularize this here
    if (rawValue) {
      valueOut = [ this.objectLoader.createCompactedResource(`"${valueOut[0].value}"`) ];
      valueOut[0].property.unique = this.objectLoader.createCompactedResource('"true"');
    }
    return valueOut;
  }
}
