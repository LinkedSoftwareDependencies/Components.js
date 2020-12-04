import type { RdfObjectLoader, Resource } from 'rdf-object';
import { PREFIXES, resourceIdToString } from '../../Util';
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
