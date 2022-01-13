import type { RdfObjectLoader, Resource } from 'rdf-object';
import { IRIS_RDF, IRIS_XSD } from '../../rdf/Iris';
import { ErrorResourcesContext } from '../../util/ErrorResourcesContext';
import { GenericsContext } from '../GenericsContext';
import type { IParameterPropertyHandler } from './IParameterPropertyHandler';

/**
 * If a param range is defined, apply the type and validate the range.
 */
export class ParameterPropertyHandlerRange implements IParameterPropertyHandler {
  private readonly objectLoader: RdfObjectLoader;

  public constructor(objectLoader: RdfObjectLoader) {
    this.objectLoader = objectLoader;
  }

  public canHandle(value: Resource | undefined, configRoot: Resource, parameter: Resource): boolean {
    return Boolean(parameter.property.range);
  }

  public handle(
    value: Resource | undefined,
    configRoot: Resource,
    parameter: Resource,
    configElement: Resource,
    genericsContext: GenericsContext,
  ): Resource | undefined {
    this.captureType(value, parameter, genericsContext);
    return value;
  }

  /**
   * Apply the given datatype to the given literal.
   * Checks if the datatype is correct and casts to the correct js type.
   * Will throw an error if the type has an invalid value.
   * Will be ignored if the value is not a literal or the type is not recognized.
   * @param value The value.
   * @param param The parameter.
   * @param genericsContext Context for generic types.
   */
  public captureType(
    value: Resource | undefined,
    param: Resource,
    genericsContext: GenericsContext,
  ): Resource | undefined {
    if (this.hasParamValueValidType(value, param, param.property.range, genericsContext)) {
      return value;
    }
    this.throwIncorrectTypeError(value, param, genericsContext);
  }

  /**
   * Apply the given datatype to the given literal.
   * Checks if the datatype is correct and casts to the correct js type.
   * Will throw an error if the type has an invalid value.
   * Will be ignored if the value is not a literal or the type is not recognized.
   * @param value The value.
   * @param param The parameter.
   * @param paramRange The parameter's range.
   * @param genericsContext Context for generic types.
   */
  public hasParamValueValidType(
    value: Resource | undefined,
    param: Resource,
    paramRange: Resource,
    genericsContext: GenericsContext,
  ): boolean {
    if (!paramRange) {
      return true;
    }

    if (paramRange.isA('ParameterRangeWildcard')) {
      return true;
    }

    if (!value && paramRange.isA('ParameterRangeUndefined')) {
      return true;
    }

    // Always match variable values
    if (value && value.isA('Variable')) {
      return true;
    }

    if (value && value.type === 'Literal') {
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
    if (value && paramRange.value === IRIS_XSD.string && value.type === 'NamedNode') {
      return true;
    }

    // Try to match the value with the parameter's range (which will always be defined at this stage)
    // Check if the value has a super-type that equals the parameter's range
    if (value && this.hasType(
      value,
      paramRange,
      genericsContext,
      value.property.genericTypeInstancesComponentScope,
      value.properties.genericTypeInstances,
    )) {
      return true;
    }

    // Check if the param type is an array
    if (value && paramRange.isA('ParameterRangeArray')) {
      if (!value.list) {
        return false;
      }
      return value.list.every(listElement => this
        .hasParamValueValidType(listElement, param, paramRange.property.parameterRangeValue, genericsContext));
    }

    // Check if the param type is a composed type
    if (paramRange.isA('ParameterRangeUnion')) {
      return paramRange.properties.parameterRangeElements
        .some(child => this.hasParamValueValidType(value, param, child, genericsContext));
    }
    if (paramRange.isA('ParameterRangeIntersection')) {
      return paramRange.properties.parameterRangeElements
        .every(child => this.hasParamValueValidType(value, param, child, genericsContext));
    }
    if (paramRange.isA('ParameterRangeTuple')) {
      if (!value || !value.list) {
        return false;
      }

      // Iterate over list elements and try to match with tuple types
      const listElements = value.list;
      const tupleTypes = paramRange.properties.parameterRangeElements;
      let listIndex = 0;
      let tupleIndex = 0;
      while (listIndex < listElements.length && tupleIndex < tupleTypes.length) {
        if (tupleTypes[tupleIndex].isA('ParameterRangeRest')) {
          // Rest types can match multiple list elements, so only increment index if no match is found.
          if (!this.hasParamValueValidType(
            listElements[listIndex],
            param,
            tupleTypes[tupleIndex].property.parameterRangeValue,
            genericsContext,
          )) {
            tupleIndex++;
          } else {
            listIndex++;
          }
        } else {
          if (!this.hasParamValueValidType(
            listElements[listIndex],
            param,
            tupleTypes[tupleIndex],
            genericsContext,
          )) {
            return false;
          }
          tupleIndex++;
          listIndex++;
        }
      }

      return listIndex === listElements.length &&
        (tupleIndex === tupleTypes.length ||
          (tupleIndex === tupleTypes.length - 1 && tupleTypes[tupleIndex].isA('ParameterRangeRest')));
    }
    if (paramRange.isA('ParameterRangeLiteral')) {
      return Boolean(value && value.term.equals(paramRange.property.parameterRangeValue.term));
    }

    // Check if the range refers to `keyof ...`
    if (paramRange.isA('ParameterRangeKeyof')) {
      const component = paramRange.property.parameterRangeValue;
      // Simulate a union of the member keys as literal parameter ranges
      const simulatedUnionRange = this.objectLoader.createCompactedResource({
        '@type': 'ParameterRangeUnion',
        parameterRangeElements: component.properties.memberKeys.map(memberKey => ({
          '@type': 'ParameterRangeLiteral',
          parameterRangeValue: memberKey,
        })),
      });
      return this.hasParamValueValidType(value, param, simulatedUnionRange, genericsContext);
    }

    // Check if the range refers to a generic type
    if (paramRange.isA('ParameterRangeGenericTypeReference')) {
      return genericsContext.bindGenericTypeToValue(
        paramRange.property.parameterRangeGenericType.value,
        value,
        (subValue, subType) => this.hasParamValueValidType(subValue, param, subType, genericsContext),
      );
    }

    // Check if the range refers to a component with a generic type
    if (paramRange.isA('ParameterRangeGenericComponent')) {
      if (value) {
        if (value.property.genericTypeInstances) {
          // Once we support manual generics setting, we'll need to check here if we can merge with it.
          throw new ErrorResourcesContext(`Simultaneous manual generic type passing and generic type inference are not supported yet.`, { parameter: param, value });
        }

        // For the defined generic type instances, apply them into the instance so they can be checked later during a
        // call to GenericsContext#bindComponentGenericTypes.
        value.property.genericTypeInstancesComponentScope = paramRange.property.component;
        value.properties.genericTypeInstances = paramRange.properties.genericTypeInstances
          .map(genericTypeInstance => {
            // If we have a generic param type reference, instantiate them based on the current generics context
            if (genericTypeInstance.isA('ParameterRangeGenericTypeReference')) {
              if (!genericTypeInstance.property.parameterRangeGenericType) {
                throw new ErrorResourcesContext(`Invalid generic type instance in a ParameterRangeGenericComponent was detected: missing parameterRangeGenericType property.`, {
                  parameter: param,
                  genericTypeInstance,
                  value,
                });
              }

              return this.objectLoader.createCompactedResource({
                '@type': 'ParameterRangeGenericTypeReference',
                parameterRangeGenericType: genericTypeInstance.property.parameterRangeGenericType.value,
                parameterRangeGenericBindings: genericsContext
                  .bindings[genericTypeInstance.property.parameterRangeGenericType.value],
              });
            }

            // For all other param types, return the as-is
            return genericTypeInstance;
          });
      }

      return this.hasParamValueValidType(value, param, paramRange.property.component, genericsContext);
    }

    // Check if this param defines a field with sub-params
    if (paramRange.isA('ParameterRangeCollectEntries')) {
      // TODO: Add support for type-checking nested fields with collectEntries
      return true;
    }

    return false;
  }

  protected throwIncorrectTypeError(
    value: Resource | undefined,
    parameter: Resource,
    genericsContext: GenericsContext,
  ): never {
    const withTypes = value && value.properties.types.length > 0 ? ` with types "${value.properties.types.map(resource => resource.value)}"` : '';
    // eslint-disable-next-line @typescript-eslint/no-extra-parens
    const valueString = value ? (value.list ? `[${value.list.map(subValue => subValue.value).join(', ')}]` : value.value) : 'undefined';
    throw new ErrorResourcesContext(`The value "${valueString}"${withTypes} for parameter "${parameter.value}" is not of required range type "${this.rangeToDisplayString(parameter.property.range, genericsContext)}"`, {
      value: value || 'undefined',
      ...Object.keys(genericsContext.bindings).length > 0 ?
        { generics: `[\n  ${Object.entries(genericsContext.bindings)
          .map(([ id, subValue ]) => `<${id}> => ${this.rangeToDisplayString(subValue, genericsContext)}`)
          .join(',\n  ')}\n]` } :
        {},
      parameter,
    });
  }

  /**
   * Check if the given value is of the given type.
   * @param value A value.
   * @param type A type.
   * @param genericsContext The current generics context.
   * @param genericTypeInstancesComponentScope
   * @param genericTypeInstances
   * @protected
   */
  protected hasType(
    value: Resource,
    type: Resource,
    genericsContext: GenericsContext,
    genericTypeInstancesComponentScope: Resource | undefined,
    genericTypeInstances: Resource[],
  ): boolean {
    // Immediately return if the terms are equal
    if (value.term.equals(type.term)) {
      return true;
    }

    // Otherwise, iterate over the value's super types are recursively call this method again.
    for (const valueSuperType of [ ...value.properties.extends, ...value.properties.type ]) {
      // Special case: if the super component is wrapped in a generic component instantiation, unwrap it.
      if (valueSuperType.property.type?.value === this.objectLoader.contextResolved
        .expandTerm('oo:GenericComponentExtension')) {
        // First recursively continue calling hasType for the unwrapped component
        if (this.hasType(
          valueSuperType.property.component,
          type,
          genericsContext,
          genericTypeInstancesComponentScope,
          genericTypeInstances,
        )) {
          // If hasType has passed, validate the generic instantiations
          // AND (possibly) the parameter's generic type instances against the component's generic params.
          const superComponent = valueSuperType.property.component;
          const genericsContextInner = new GenericsContext(
            this.objectLoader,
            superComponent.properties.genericTypeParameters,
          );

          // Try to bind the generic instances from the wrapped generic component instantiation
          if (!genericsContextInner.bindComponentGenericTypes(
            superComponent,
            valueSuperType.properties.genericTypeInstances
              .map(instance => this.objectLoader.createCompactedResource({
                parameterRangeGenericBindings: instance,
              })),
            { value },
          )) {
            return false;
          }

          // If the given generic type component scope applies to this component,
          // Try to bind the generic instances from the parameter type-checking.
          if (genericTypeInstancesComponentScope && genericTypeInstancesComponentScope.value === superComponent.value) {
            if (!genericsContextInner.bindComponentGenericTypes(
              superComponent,
              genericTypeInstances,
              { value },
            )) {
              return false;
            }

            // Extract the bound generic instances from the inner context into the actual context.
            // This is needed for cases where param generics are bound via a wrapped generic component instantiation.
            for (const [ i, genericTypeInstance ] of genericTypeInstances.entries()) {
              const innerGenericType = genericTypeInstancesComponentScope.properties.genericTypeParameters[i].value;
              if (genericTypeInstance.isA('ParameterRangeGenericTypeReference')) {
                // If the generic type instance refers to another generic,
                // bind it to the corresponding value of the inner context
                const outerGenericType = genericTypeInstance.property.parameterRangeGenericType.value;
                genericsContext.bindings[outerGenericType] = genericsContextInner.bindings[innerGenericType];
              } else if (!this.hasType(
                genericsContextInner.bindings[innerGenericType],
                genericTypeInstance,
                genericsContext,
                undefined,
                [],
              )) {
                // If the generic type instance is just a type, check it against the value in the inner context.
                // If it does not match, return false.
                return false;
              }
            }
          }

          return true;
        }

        return false;
      }

      // The default case just checks the super type recursively.
      if (this.hasType(
        valueSuperType,
        type,
        genericsContext,
        genericTypeInstancesComponentScope,
        genericTypeInstances,
      )) {
        return true;
      }
    }

    return false;
  }

  public rangeToDisplayString(paramRange: Resource | undefined, genericsContext: GenericsContext): string {
    if (!paramRange) {
      return `any`;
    }
    if (paramRange.isA('ParameterRangeUndefined')) {
      return `undefined`;
    }
    if (paramRange.isA('ParameterRangeArray')) {
      return `${this.rangeToDisplayString(paramRange.property.parameterRangeValue, genericsContext)}[]`;
    }
    if (paramRange.isA('ParameterRangeRest')) {
      return `...${this.rangeToDisplayString(paramRange.property.parameterRangeValue, genericsContext)}`;
    }
    if (paramRange.isA('ParameterRangeKeyof')) {
      return `keyof ${this.rangeToDisplayString(paramRange.property.parameterRangeValue, genericsContext)}`;
    }
    if (paramRange.isA('ParameterRangeUnion')) {
      return paramRange.properties.parameterRangeElements
        .map(child => this.rangeToDisplayString(child, genericsContext))
        .join(' | ');
    }
    if (paramRange.isA('ParameterRangeIntersection')) {
      return paramRange.properties.parameterRangeElements
        .map(child => this.rangeToDisplayString(child, genericsContext))
        .join(' & ');
    }
    if (paramRange.isA('ParameterRangeTuple')) {
      return `[${paramRange.properties.parameterRangeElements
        .map(child => this.rangeToDisplayString(child, genericsContext))
        .join(', ')}]`;
    }
    if (paramRange.isA('ParameterRangeLiteral')) {
      return paramRange.property.parameterRangeValue.value;
    }
    if (paramRange.isA('ParameterRangeGenericTypeReference')) {
      const valid = paramRange.property.parameterRangeGenericType.value in genericsContext.genericTypeIds;
      return `<${valid ? '' : 'UNKNOWN GENERIC: '}${paramRange.property.parameterRangeGenericType.value}>`;
    }
    if (paramRange.isA('ParameterRangeGenericComponent')) {
      return `(${this.rangeToDisplayString(paramRange.property.component, genericsContext)})${paramRange.properties.genericTypeInstances
        .map(genericTypeInstance => this.rangeToDisplayString(genericTypeInstance, genericsContext)).join('')}`;
    }
    return paramRange.value;
  }
}
