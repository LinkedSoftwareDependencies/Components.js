import type { RdfObjectLoader, Resource } from 'rdf-object';
import { IRIS_RDF, IRIS_XSD } from '../../rdf/Iris';
import { ErrorResourcesContext } from '../../util/ErrorResourcesContext';
import type { IParameterPropertyHandler } from './IParameterPropertyHandler';

/**
 * If a param range is defined, apply the type and validate the range.
 */
export class ParameterPropertyHandlerRange implements IParameterPropertyHandler {
  private readonly objectLoader: RdfObjectLoader;

  public constructor(objectLoader: RdfObjectLoader) {
    this.objectLoader = objectLoader;
  }

  public canHandle(value: Resource[], configRoot: Resource, parameter: Resource, configElement: Resource): boolean {
    return Boolean(parameter.property.range);
  }

  public handle(value: Resource[], configRoot: Resource, parameter: Resource, configElement: Resource): Resource[] {
    for (const subValue of value) {
      this.captureType(subValue, parameter);
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
    if (this.hasParamValueValidType(value, param, param.property.range)) {
      return value;
    }
    this.throwIncorrectTypeError(value, param);
  }

  /**
   * Apply the given datatype to the given literal.
   * Checks if the datatype is correct and casts to the correct js type.
   * Will throw an error if the type has an invalid value.
   * Will be ignored if the value is not a literal or the type is not recognized.
   * @param value The value.
   * @param param The parameter.
   * @param paramRange The parameter's range.
   */
  public hasParamValueValidType(value: Resource, param: Resource, paramRange: Resource): boolean {
    if (value.type === 'Literal') {
      let parsed;
      switch (paramRange.value) {
        case IRIS_XSD.string:
          return true;
        case IRIS_XSD.boolean:
          if (value.value === 'true') {
            (<any>value.term).valueRaw = true;
          } else if (value.value === 'false') {
            (<any>value.term).valueRaw = false;
          } else {
            return false;
          }
          return true;
        case IRIS_XSD.integer:
        case IRIS_XSD.number:
        case IRIS_XSD.int:
        case IRIS_XSD.byte:
        case IRIS_XSD.long:
          parsed = Number.parseInt(value.value, 10);
          if (Number.isNaN(parsed)) {
            return false;
          }
          // ParseInt also parses floats to ints!
          if (String(parsed) !== value.value) {
            return false;
          }
          (<any>value.term).valueRaw = parsed;
          return true;
        case IRIS_XSD.float:
        case IRIS_XSD.decimal:
        case IRIS_XSD.double:
          parsed = Number.parseFloat(value.value);
          if (Number.isNaN(parsed)) {
            return false;
          }
          (<any>value.term).valueRaw = parsed;
          return true;
        case IRIS_RDF.JSON:
          try {
            parsed = JSON.parse(value.value);
            (<any>value.term).valueRaw = parsed;
          } catch {
            return false;
          }
          return true;
      }
    }

    // Allow IRIs to be casted to strings
    if (paramRange && paramRange.value === IRIS_XSD.string && value.type === 'NamedNode') {
      return true;
    }

    if (!value.isA('Variable') && paramRange && !value.isA(paramRange.term)) {
      // Check if the param type is a composed type
      if (paramRange.isA('ParameterRangeUnion')) {
        return paramRange.properties.parameterRangeElements
          .some(child => this.hasParamValueValidType(value, param, child));
      }
      if (paramRange.isA('ParameterRangeIntersection')) {
        return paramRange.properties.parameterRangeElements
          .every(child => this.hasParamValueValidType(value, param, child));
      }

      // Check if this param defines a field with sub-params
      if (paramRange.properties.parameters.length > 0) {
        // TODO: Add support for type-checking nested fields with collectEntries
      } else {
        return false;
      }
    }

    return true;
  }

  protected throwIncorrectTypeError(value: Resource, parameter: Resource): never {
    const withTypes = value.properties.types.length > 0 ? ` with types "${value.properties.types.map(resource => resource.value)}"` : '';
    throw new ErrorResourcesContext(`The value "${value.value}"${withTypes} for parameter "${parameter.value}" is not of required range type "${this.rangeToDisplayString(parameter.property.range)}"`, {
      value,
      parameter,
    });
  }

  protected rangeToDisplayString(paramRange: Resource): string {
    if (paramRange.isA('ParameterRangeUnion')) {
      return paramRange.properties.parameterRangeElements
        .map(child => this.rangeToDisplayString(child))
        .join(' | ');
    }
    if (paramRange.isA('ParameterRangeIntersection')) {
      return paramRange.properties.parameterRangeElements
        .map(child => this.rangeToDisplayString(child))
        .join(' & ');
    }
    return paramRange.value;
  }
}
