import type { RdfObjectLoader, Resource } from 'rdf-object';
import { IRIS_RDF, IRIS_XSD } from '../../rdf/Iris';
import type { IErrorContext } from '../../util/ErrorResourcesContext';
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
    const errorContext: IErrorContext = { param };
    const conflict = this.hasValueType(value, param.property.range, errorContext, genericsContext);
    if (!conflict) {
      return value;
    }
    ParameterPropertyHandlerRange.throwIncorrectTypeError(value, param, genericsContext, conflict);
  }

  /**
   * Check if the given value is of the given type.
   *
   * For valid literals, the `valueRaw` field will be set.
   *
   * @param value The value.
   * @param type The parameter's range.
   * @param genericsContext Context for generic types.
   * @param errorContext The context for error reporting.
   * @return IParamValueConflict A conflict value if there was an error, or undefined if there was no error
   */
  public hasValueType(
    value: Resource | undefined,
    type: Resource | undefined,
    errorContext: IErrorContext,
    genericsContext: GenericsContext,
  ): IParamValueConflict | undefined {
    errorContext = { ...errorContext, value, type };

    if (!type) {
      return;
    }

    if (type.isA('ParameterRangeWildcard')) {
      return;
    }

    if (!value && type.isA('ParameterRangeUndefined')) {
      return;
    }

    // Always match variable values
    if (value && value.isA('Variable')) {
      return;
    }

    // Handle literal values
    if (value && value.type === 'Literal') {
      let parsed;
      switch (type.value) {
        case IRIS_XSD.string:
          return;
        case IRIS_XSD.boolean:
          if (value.value === 'true') {
            (<any>value.term).valueRaw = true;
          } else if (value.value === 'false') {
            (<any>value.term).valueRaw = false;
          } else {
            return {
              description: 'value must either be "true" or "false"',
              context: errorContext,
            };
          }
          return;
        case IRIS_XSD.integer:
        case IRIS_XSD.number:
        case IRIS_XSD.int:
        case IRIS_XSD.byte:
        case IRIS_XSD.long:
          parsed = Number.parseInt(value.value, 10);
          if (Number.isNaN(parsed)) {
            return {
              description: `value is not a number`,
              context: errorContext,
            };
          }
          // ParseInt also parses floats to ints!
          if (String(parsed) !== value.value) {
            return {
              description: `value can not be a float`,
              context: errorContext,
            };
          }
          (<any>value.term).valueRaw = parsed;
          return;
        case IRIS_XSD.float:
        case IRIS_XSD.decimal:
        case IRIS_XSD.double:
          parsed = Number.parseFloat(value.value);
          if (Number.isNaN(parsed)) {
            return {
              description: `value is not a number`,
              context: errorContext,
            };
          }
          (<any>value.term).valueRaw = parsed;
          return;
        case IRIS_RDF.JSON:
          try {
            parsed = JSON.parse(value.value);
            (<any>value.term).valueRaw = parsed;
          } catch (error: unknown) {
            return {
              description: `JSON parse exception: ${(<Error> error).message}`,
              context: errorContext,
            };
          }
          return;
      }
    }

    // Allow IRIs to be casted to strings
    if (value && type.value === IRIS_XSD.string && value.type === 'NamedNode') {
      return;
    }

    // Try to match the value with the parameter's range (which will always be defined at this stage)
    // Check if the value has a super-type that equals the parameter's range
    let hasTypeConflict: IParamValueConflict | undefined;
    if (value) {
      const hasTypeConflictInner = this.hasType(
        value,
        type,
        genericsContext,
        value.property.genericTypeInstancesComponentScope,
        value.properties.genericTypeInstances,
        errorContext,
      );
      if (!hasTypeConflictInner) {
        return;
      }
      hasTypeConflict = hasTypeConflictInner;
    } else {
      hasTypeConflict = undefined;
    }

    // Check if the param type is an array
    if (value && type.isA('ParameterRangeArray')) {
      if (!value.list) {
        return {
          description: `value is not an RDF list`,
          context: errorContext,
        };
      }
      const subConflicts = <IParamValueConflict[]> value.list.map(listElement => this
        .hasValueType(listElement, type.property.parameterRangeValue, errorContext, genericsContext))
        .filter(subConflict => subConflict !== undefined);
      return subConflicts.length === 0 ?
        undefined :
        {
          description: `one or more array values are invalid`,
          context: errorContext,
          causes: subConflicts,
        };
    }

    // Check if the param type is a composed type
    if (type.isA('ParameterRangeUnion')) {
      const subConflicts: IParamValueConflict[] = [];
      for (const parameterRangeElement of type.properties.parameterRangeElements) {
        const subConflict = this.hasValueType(value, parameterRangeElement, errorContext, genericsContext);
        if (!subConflict) {
          return;
        }
        subConflicts.push(subConflict);
      }
      return {
        description: `no union values are valid`,
        context: errorContext,
        causes: subConflicts,
      };
    }
    if (type.isA('ParameterRangeIntersection')) {
      const subConflicts = type.properties.parameterRangeElements
        .map(child => this.hasValueType(value, child, errorContext, genericsContext));
      if (subConflicts.every(subConflict => subConflict === undefined)) {
        return;
      }
      return {
        description: `not all intersection values are valid`,
        context: errorContext,
        causes: <IParamValueConflict[]> subConflicts.filter(subConflict => subConflict !== undefined),
      };
    }
    if (type.isA('ParameterRangeTuple')) {
      if (!value) {
        return {
          description: `undefined value is not an RDF list`,
          context: errorContext,
        };
      }
      if (!value.list) {
        return {
          description: `value is not an RDF list`,
          context: errorContext,
        };
      }

      // Iterate over list elements and try to match with tuple types
      const listElements = value.list;
      const tupleTypes = type.properties.parameterRangeElements;
      let listIndex = 0;
      let tupleIndex = 0;
      while (listIndex < listElements.length && tupleIndex < tupleTypes.length) {
        if (tupleTypes[tupleIndex].isA('ParameterRangeRest')) {
          // Rest types can match multiple list elements, so only increment index if no match is found.
          const subConflict = this.hasValueType(
            listElements[listIndex],
            tupleTypes[tupleIndex].property.parameterRangeValue,
            errorContext,
            genericsContext,
          );
          if (subConflict) {
            tupleIndex++;
          } else {
            listIndex++;
          }
        } else {
          const subConflict = this.hasValueType(
            listElements[listIndex],
            tupleTypes[tupleIndex],
            errorContext,
            genericsContext,
          );
          if (subConflict) {
            return {
              description: `tuple element is invalid`,
              context: errorContext,
              causes: [ subConflict ],
            };
          }
          tupleIndex++;
          listIndex++;
        }
      }

      if (!(listIndex === listElements.length &&
        (tupleIndex === tupleTypes.length ||
          (tupleIndex === tupleTypes.length - 1 && tupleTypes[tupleIndex].isA('ParameterRangeRest'))))) {
        return {
          description: `tuple does not contain the expected number of elements`,
          context: errorContext,
        };
      }
      return;
    }
    if (type.isA('ParameterRangeLiteral')) {
      if (value && value.term.equals(type.property.parameterRangeValue.term)) {
        return;
      }
      return {
        description: `literal value is unequal`,
        context: errorContext,
      };
    }

    // Check if the range refers to `keyof ...`
    if (type.isA('ParameterRangeKeyof')) {
      const component = type.property.parameterRangeValue;
      // Simulate a union of the member keys as literal parameter ranges
      const simulatedUnionRange = this.objectLoader.createCompactedResource({
        '@type': 'ParameterRangeUnion',
        parameterRangeElements: component.properties.memberFields.map(memberField => ({
          '@type': 'ParameterRangeLiteral',
          parameterRangeValue: memberField.property.memberFieldName,
        })),
      });
      const subConflict = this.hasValueType(value, simulatedUnionRange, errorContext, genericsContext);
      if (!subConflict) {
        return;
      }
      return {
        description: `keyof value is invalid`,
        context: errorContext,
        causes: [ subConflict ],
      };
    }

    // Check if the range refers to a generic type
    if (type.isA('ParameterRangeGenericTypeReference')) {
      return genericsContext.bindGenericTypeToValue(
        type.property.parameterRangeGenericType.value,
        value,
        (subValue, subType) => this.hasValueType(subValue, subType, errorContext, genericsContext),
        (subType, superType) => this.hasType(
          subType,
          superType,
          genericsContext,
          undefined,
          [],
          errorContext,
        ),
      );
    }

    // Check if the range refers to a component with a generic type
    if (type.isA('ParameterRangeGenericComponent')) {
      if (value) {
        if (!value.property.genericTypeInstances) {
          // For the defined generic type instances, apply them into the instance so they can be checked later during a
          // call to GenericsContext#bindComponentGenericTypes.
          value.property.genericTypeInstancesComponentScope = type.property.component;
          value.properties.genericTypeInstances = type.properties.genericTypeInstances
            .map(genericTypeInstance => {
              // If we have a generic param type reference, instantiate them based on the current generics context
              if (genericTypeInstance.isA('ParameterRangeGenericTypeReference')) {
                if (!genericTypeInstance.property.parameterRangeGenericType) {
                  throw new ErrorResourcesContext(`Invalid generic type instance in a ParameterRangeGenericComponent was detected: missing parameterRangeGenericType property.`, {
                    ...errorContext,
                    genericTypeInstance,
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
        } else {
          // TODO: Once we support manual generics setting, we'll need to check here if we can merge with it.
          // (sometimes, it can also be identical)
        }
      }

      const subConflict = this.hasValueType(value, type.property.component, errorContext, genericsContext);
      if (!subConflict) {
        return;
      }
      return {
        description: `generic component is invalid`,
        context: errorContext,
        causes: [ subConflict ],
      };
    }

    // Check if this param defines a field with sub-params
    if (type.isA('ParameterRangeCollectEntries')) {
      // TODO: Add support for type-checking nested fields with collectEntries
      return;
    }

    return hasTypeConflict || { description: 'unknown parameter type', context: errorContext };
  }

  public static throwIncorrectTypeError(
    value: Resource | undefined,
    parameter: Resource,
    genericsContext: GenericsContext,
    conflict: IParamValueConflict,
  ): never {
    const withTypes = value && value.properties.types.length > 0 ? ` with types "${value.properties.types.map(resource => resource.value)}"` : '';
    // eslint-disable-next-line @typescript-eslint/no-extra-parens
    const valueString = value ? (value.list ? `[${value.list.map(subValue => subValue.value).join(', ')}]` : value.value) : 'undefined';
    throw new ErrorResourcesContext(`The value "${valueString}"${withTypes} for parameter "${parameter.value}" is not of required range type "${ParameterPropertyHandlerRange.rangeToDisplayString(parameter.property.range, genericsContext)}"`, {
      cause: conflict,
      value: value || 'undefined',
      ...Object.keys(genericsContext.bindings).length > 0 ?
        { generics: `[\n  ${Object.entries(genericsContext.bindings)
          .map(([ id, subValue ]) => `<${id}> => ${ParameterPropertyHandlerRange.rangeToDisplayString(subValue, genericsContext)}`)
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
   * @param errorContext
   */
  public hasType(
    value: Resource,
    type: Resource,
    genericsContext: GenericsContext,
    genericTypeInstancesComponentScope: Resource | undefined,
    genericTypeInstances: Resource[],
    errorContext: IErrorContext,
  ): IParamValueConflict | undefined {
    // Immediately return if the terms are equal
    if (value.term.equals(type.term)) {
      return;
    }

    // Otherwise, iterate over the value's super types are recursively call this method again.
    const subConflictTypes: IParamValueConflict[] = [];
    for (const valueSuperType of [ ...value.properties.extends, ...value.properties.type ]) {
      // Special case: if the super component is wrapped in a generic component instantiation, unwrap it.
      if (valueSuperType.property.type?.value === this.objectLoader.contextResolved
        .expandTerm('oo:GenericComponentExtension')) {
        // First recursively continue calling hasType for the unwrapped component
        const hasTypeConflict = this.hasType(
          valueSuperType.property.component,
          type,
          genericsContext,
          genericTypeInstancesComponentScope,
          genericTypeInstances,
          errorContext,
        );
        if (!hasTypeConflict) {
          // If hasType has passed, validate the generic instantiations
          // AND (possibly) the parameter's generic type instances against the component's generic params.
          const superComponent = valueSuperType.property.component;
          const genericsContextInner = new GenericsContext(
            this.objectLoader,
            superComponent.properties.genericTypeParameters,
          );
          const typeTypeValidator = (subType: Resource, superType: Resource): IParamValueConflict | undefined => this
            .hasType(
              subType,
              superType,
              genericsContextInner,
              undefined,
              [],
              errorContext,
            );

          // Try to bind the generic instances from the wrapped generic component instantiation
          const subConflictWrapped = genericsContextInner.bindComponentGenericTypes(
            superComponent,
            valueSuperType.properties.genericTypeInstances
              .map(instance => this.objectLoader.createCompactedResource({
                parameterRangeGenericBindings: instance,
              })),
            { value },
            typeTypeValidator,
          );
          if (subConflictWrapped) {
            return {
              description: `invalid wrapped bindings for generic type instances for generic component extension of "${superComponent.value}"`,
              context: { value, type },
              causes: [ subConflictWrapped ],
            };
          }

          // If the given generic type component scope applies to this component,
          // Try to bind the generic instances from the parameter type-checking.
          if (genericTypeInstancesComponentScope && genericTypeInstancesComponentScope.value === superComponent.value) {
            const subConflictParam = genericsContextInner.bindComponentGenericTypes(
              superComponent,
              genericTypeInstances,
              { value },
              typeTypeValidator,
            );
            if (subConflictParam) {
              return {
                description: `invalid parameter bindings for generic type instances for generic component extension of "${superComponent.value}"`,
                context: { value, type },
                causes: [ subConflictParam ],
              };
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
              } else if (!genericsContextInner.mergeRanges(
                genericsContextInner.bindings[innerGenericType],
                genericTypeInstance,
                typeTypeValidator,
              )) {
                // If the generic type instance is just a type, check it against the value in the inner context.
                // If it does not match, return an error.
                return {
                  description: `invalid binding for generic type <${innerGenericType}> in generic component extension of "${superComponent.value}": existing range "${ParameterPropertyHandlerRange.rangeToDisplayString(genericsContextInner.bindings[innerGenericType], genericsContextInner)}" can not be bound to range "${ParameterPropertyHandlerRange.rangeToDisplayString(genericTypeInstance, genericsContextInner)}"`,
                  context: { value, type },
                };
              }
            }
          }

          return;
        }

        return {
          description: `value is not a subtype of the referenced component in the generic component extension of "${valueSuperType.property.component.value}"`,
          context: { value, type },
          causes: [ hasTypeConflict ],
        };
      }

      // The default case just checks the super type recursively.
      const subConflictType = this.hasType(
        valueSuperType,
        type,
        genericsContext,
        genericTypeInstancesComponentScope,
        genericTypeInstances,
        errorContext,
      );
      if (!subConflictType) {
        return;
      }
      subConflictTypes.push(subConflictType);
    }

    return {
      description: `value is not a subtype of "${type.value}"`,
      context: { value, type },
      ...subConflictTypes.length > 0 ? { causes: subConflictTypes } : {},
    };
  }

  public static rangeToDisplayString(paramRange: Resource | undefined, genericsContext: GenericsContext): string {
    if (!paramRange || paramRange.isA('ParameterRangeWildcard')) {
      return `any`;
    }
    if (paramRange.isA('ParameterRangeUndefined')) {
      return `undefined`;
    }
    if (paramRange.isA('ParameterRangeArray')) {
      return `${ParameterPropertyHandlerRange.rangeToDisplayString(paramRange.property.parameterRangeValue, genericsContext)}[]`;
    }
    if (paramRange.isA('ParameterRangeRest')) {
      return `...${ParameterPropertyHandlerRange.rangeToDisplayString(paramRange.property.parameterRangeValue, genericsContext)}`;
    }
    if (paramRange.isA('ParameterRangeKeyof')) {
      return `keyof ${ParameterPropertyHandlerRange.rangeToDisplayString(paramRange.property.parameterRangeValue, genericsContext)}`;
    }
    if (paramRange.isA('ParameterRangeUnion')) {
      return paramRange.properties.parameterRangeElements
        .map(child => ParameterPropertyHandlerRange.rangeToDisplayString(child, genericsContext))
        .join(' | ');
    }
    if (paramRange.isA('ParameterRangeIntersection')) {
      return paramRange.properties.parameterRangeElements
        .map(child => ParameterPropertyHandlerRange.rangeToDisplayString(child, genericsContext))
        .join(' & ');
    }
    if (paramRange.isA('ParameterRangeTuple')) {
      return `[${paramRange.properties.parameterRangeElements
        .map(child => ParameterPropertyHandlerRange.rangeToDisplayString(child, genericsContext))
        .join(', ')}]`;
    }
    if (paramRange.isA('ParameterRangeLiteral')) {
      return paramRange.property.parameterRangeValue.value;
    }
    if (paramRange.isA('ParameterRangeGenericTypeReference')) {
      const valid = paramRange.property.parameterRangeGenericType.value in genericsContext.genericTypeIds;
      return `${valid ? 'GENERIC: ' : 'UNKNOWN GENERIC: '}${paramRange.property.parameterRangeGenericType.value}`;
    }
    if (paramRange.isA('ParameterRangeGenericComponent')) {
      return `(${ParameterPropertyHandlerRange.rangeToDisplayString(paramRange.property.component, genericsContext)})<${paramRange.properties.genericTypeInstances
        .map(genericTypeInstance => ParameterPropertyHandlerRange.rangeToDisplayString(genericTypeInstance, genericsContext)).join(', ')}>`;
    }
    return paramRange.value;
  }
}

/**
 * Represents a conflict between a value and a type.
 */
export interface IParamValueConflict {
  description: string;
  context: IErrorContext;
  causes?: IParamValueConflict[];
}
