import type { RdfObjectLoader } from 'rdf-object';
import { Resource } from 'rdf-object';
import { PREFIXES, resourceIdToString, resourceToString } from '../Util';

/**
 * Handles component parameters in the context of a config.
 */
export class ParameterHandler {
  private readonly objectLoader: RdfObjectLoader;

  public constructor(options: IParameterHandlerOptions) {
    this.objectLoader = options.objectLoader;
  }

  /**
   * Obtain the values of the given parameter in the context of the given config.
   * @param configRoot The root config resource that we are working in.
   * @param parameter The parameter resource to get the value for.
   * @param configElement Part of the config resource to look for parameter instantiations as predicates.
   * @return The parameter value(s)
   */
  public applyParameterValues(
    configRoot: Resource,
    parameter: Resource,
    configElement: Resource,
  ): Resource[] {
    let value: Resource[] = configElement.properties[parameter.value];
    // Set default value if no value has been given
    if (value.length === 0 && parameter.property.defaultScoped) {
      for (const scoped of parameter.properties.defaultScoped) {
        if (!scoped.property.defaultScope) {
          throw new Error(`Invalid defaultScoped for parameter '${resourceIdToString(parameter, this.objectLoader)}': Missing defaultScope.
Parameter: ${resourceToString(parameter)}`);
        }
        for (const scope of scoped.properties.defaultScope) {
          if (!scoped.property.defaultScopedValue) {
            throw new Error(`Invalid defaultScoped for parameter '${resourceIdToString(parameter, this.objectLoader)}': Missing defaultScopedValue.
Parameter: ${resourceToString(parameter)}`);
          }
          if (configRoot.isA(scope.term)) {
            value = scoped.properties.defaultScopedValue;
          }
        }
      }
    }

    if (value.length === 0 && parameter.property.default) {
      value = parameter.properties.default;
    }

    if (value.length === 0 && parameter.property.required) {
      throw new Error(`No value was set for required parameter '${resourceIdToString(parameter, this.objectLoader)}' in config '${resourceIdToString(configElement, this.objectLoader)}'.
Config: ${resourceToString(configElement)}
Parameter: ${resourceToString(parameter)}`);
    }

    // Prepend fixed parameter values
    if (parameter.property.fixed) {
      value.unshift(...parameter.properties.fixed);
    }

    // If the value is singular, and the value should be unique, transform the array to a single element
    if (parameter.property.unique && parameter.property.unique.value === 'true' && value.length > 0) {
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
    }

    // If a param range is defined, apply the type and validate the range.
    if (parameter.property.range) {
      for (const subValue of value) {
        this.captureType(subValue, parameter);
      }
    }

    // If the parameter is marked as lazy,
    // make the value inherit this lazy tag so that it can be handled later.
    if (value && parameter.property.lazy) {
      for (const subValue of value) {
        subValue.property.lazy = parameter.property.lazy;
      }
    }

    return value;
  }

  /**
   * Apply the given datatype to the given literal.
   * Checks if the datatype is correct and casts to the correct js type.
   * Will throw an error if the type has an invalid value.
   * Will be ignored if the value is not a literal or the type is not recognized.
   * @param value The value.
   * @param param The parameter.
   */
  public captureType(value: Resource, param: Resource): Resource {
    if (value.type === 'Literal') {
      let parsed;
      switch (param.property.range.value) {
        case `${PREFIXES.xsd}boolean`:
          if (value.value === 'true') {
            (<any>value.term).valueRaw = true;
          } else if (value.value === 'false') {
            (<any>value.term).valueRaw = false;
          } else {
            this.throwIncorrectTypeError(value, param);
          }
          break;
        case `${PREFIXES.xsd}integer`:
        case `${PREFIXES.xsd}number`:
        case `${PREFIXES.xsd}int`:
        case `${PREFIXES.xsd}byte`:
        case `${PREFIXES.xsd}long`:
          parsed = Number.parseInt(value.value, 10);
          if (Number.isNaN(parsed)) {
            this.throwIncorrectTypeError(value, param);
          } else {
            // ParseInt also parses floats to ints!
            if (String(parsed) !== value.value) {
              this.throwIncorrectTypeError(value, param);
            }
            (<any>value.term).valueRaw = parsed;
          }
          break;
        case `${PREFIXES.xsd}float`:
        case `${PREFIXES.xsd}decimal`:
        case `${PREFIXES.xsd}double`:
          parsed = Number.parseFloat(value.value);
          if (Number.isNaN(parsed)) {
            this.throwIncorrectTypeError(value, param);
          } else {
            (<any>value.term).valueRaw = parsed;
          }
          break;
      }
    }
    return value;
  }

  protected throwIncorrectTypeError(value: Resource, param: Resource): void {
    throw new Error(`${value.value} is not of type ${param.property.range.value} for parameter ${resourceIdToString(param, this.objectLoader)}`);
  }
}

export interface IParameterHandlerOptions {
  objectLoader: RdfObjectLoader;
}
