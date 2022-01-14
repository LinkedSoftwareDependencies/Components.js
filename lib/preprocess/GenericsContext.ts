import type * as RDF from '@rdfjs/types';
import type { Resource, RdfObjectLoader } from 'rdf-object';
import { ErrorResourcesContext } from '../util/ErrorResourcesContext';
import type { IParamValueConflict } from './parameterproperty/ParameterPropertyHandlerRange';
import { ParameterPropertyHandlerRange } from './parameterproperty/ParameterPropertyHandlerRange';

/**
 * Context for binding generic types to a concrete range value.
 */
export class GenericsContext {
  private static readonly XSD_INHERITANCE_TABLE: Record<string, Set<string>> = {
    'http://www.w3.org/2001/XMLSchema#number': new Set<string>([
      'http://www.w3.org/2001/XMLSchema#integer',
      'http://www.w3.org/2001/XMLSchema#long',
      'http://www.w3.org/2001/XMLSchema#int',
      'http://www.w3.org/2001/XMLSchema#byte',
      'http://www.w3.org/2001/XMLSchema#short',
      'http://www.w3.org/2001/XMLSchema#negativeInteger',
      'http://www.w3.org/2001/XMLSchema#nonNegativeInteger',
      'http://www.w3.org/2001/XMLSchema#nonPositiveInteger',
      'http://www.w3.org/2001/XMLSchema#positiveInteger',
      'http://www.w3.org/2001/XMLSchema#unsignedByte',
      'http://www.w3.org/2001/XMLSchema#unsignedInt',
      'http://www.w3.org/2001/XMLSchema#unsignedLong',
      'http://www.w3.org/2001/XMLSchema#unsignedShort',
      'http://www.w3.org/2001/XMLSchema#double',
      'http://www.w3.org/2001/XMLSchema#decimal',
      'http://www.w3.org/2001/XMLSchema#float',
    ]),
    'http://www.w3.org/2001/XMLSchema#string': new Set<string>([
      'http://www.w3.org/2001/XMLSchema#normalizedString',
      'http://www.w3.org/2001/XMLSchema#anyURI',
      'http://www.w3.org/2001/XMLSchema#base64Binary',
      'http://www.w3.org/2001/XMLSchema#language',
      'http://www.w3.org/2001/XMLSchema#Name',
      'http://www.w3.org/2001/XMLSchema#NCName',
      'http://www.w3.org/2001/XMLSchema#NMTOKEN',
      'http://www.w3.org/2001/XMLSchema#token',
      'http://www.w3.org/2001/XMLSchema#hexBinary',
      'http://www.w3.org/2001/XMLSchema#langString',
    ]),
  };

  private readonly objectLoader: RdfObjectLoader;
  /**
   * Set of generic type ids.
   * @private
   */
  public genericTypeIds: Record<string, boolean>;
  /**
   * Mapping of generic type id to the resolved range.
   * @private
   */
  public bindings: Record<string, Resource>;

  public constructor(objectLoader: RdfObjectLoader, genericTypeParameters: Resource[]) {
    this.objectLoader = objectLoader;
    this.genericTypeIds = Object.fromEntries(genericTypeParameters
      .map(genericTypeParameter => [ genericTypeParameter.value, true ]));
    this.bindings = {};

    for (const genericTypeParameter of genericTypeParameters) {
      if (genericTypeParameter.property.range) {
        this.bindings[genericTypeParameter.value] = genericTypeParameter.property.range;
      }
    }
  }

  /**
   * Try to to bind the given value to the given generic.
   * @param genericTypeId IRI of the generic to bind.
   * @param value The value to bind to.
   * @param typeValidator Callback for validating values against types.
   * @return boolean True if the binding was valid and took place.
   */
  public bindGenericTypeToValue(
    genericTypeId: string,
    value: Resource | undefined,
    typeValidator: (subValue: Resource | undefined, subType: Resource) => IParamValueConflict | undefined,
  ): IParamValueConflict | undefined {
    // Fail if an unknown generic type is referenced
    if (!(genericTypeId in this.genericTypeIds)) {
      return {
        description: `unknown generic <${genericTypeId}> is being referenced`,
        context: { value },
      };
    }

    // If the generic was already bound to a range, validate it
    const existingRange = this.bindings[genericTypeId];
    if (existingRange) {
      const subConflict = typeValidator(value, existingRange);
      if (subConflict) {
        return {
          description: `generic <${genericTypeId}> with existing range "${ParameterPropertyHandlerRange.rangeToDisplayString(existingRange, this)}" can not contain the given value`,
          context: { existingRange, value },
          causes: [ subConflict ],
        };
      }
    }

    // Infer type of value
    const valueRange = this.inferValueRange(value);
    if (!valueRange) {
      return;
    }

    // Save inferred type
    return this.bindGenericTypeToRange(genericTypeId, valueRange);
  }

  /**
   * Try to bind the given range to the given generic.
   * @param genericTypeId IRI of the generic to bind.
   * @param range The range to bind to.
   * @return boolean True if the binding was valid and took place.
   */
  public bindGenericTypeToRange(
    genericTypeId: string,
    range: Resource,
  ): IParamValueConflict | undefined {
    // Fail if an unknown generic type is referenced
    if (!(genericTypeId in this.genericTypeIds)) {
      return {
        description: `unknown generic <${genericTypeId}> is being referenced`,
        context: {},
      };
    }

    // If we already had a range, check if they match
    if (this.bindings[genericTypeId]) {
      const mergedRange = this.mergeRanges(this.bindings[genericTypeId], range);
      if (!mergedRange) {
        return {
          description: `generic <${genericTypeId}> with existing range "${ParameterPropertyHandlerRange.rangeToDisplayString(this.bindings[genericTypeId], this)}" can not be bound to range "${ParameterPropertyHandlerRange.rangeToDisplayString(range, this)}"`,
          context: {
            existingRange: this.bindings[genericTypeId],
            newRange: range,
          },
        };
      }

      range = mergedRange;
    }

    this.bindings[genericTypeId] = range;
  }

  /**
   * Infer the parameter range of the given value.
   * @param value A value.
   */
  public inferValueRange(value: Resource | undefined): Resource | undefined {
    // Value is undefined
    if (!value) {
      return this.objectLoader.createCompactedResource({ '@type': 'ParameterRangeUndefined' });
    }

    // Value is a literal
    if (value.term.termType === 'Literal') {
      return this.objectLoader.createCompactedResource(value.term.datatype);
    }

    // Value is a named node
    const types = value.properties.type;
    if (types.length > 1) {
      return this.objectLoader.createCompactedResource({
        '@type': 'ParameterRangeUnion',
        parameterRangeElements: types,
      });
    }
    return types[0];
  }

  /**
   * Merge the given ranges into a new range.
   * This will return undefined in the ranges are incompatible.
   *
   * If one type is more specific than the other, it will return the narrowest type.
   *
   * @param rangeA A first range.
   * @param rangeB A second range.
   */
  public mergeRanges(rangeA: Resource, rangeB: Resource): Resource | undefined {
    // Immediately return if the terms are equal
    if (rangeA.term.equals(rangeB.term)) {
      return rangeA;
    }

    // Check XSD inheritance relationship
    if (this.isXsdSubType(rangeA.term, rangeB.term)) {
      return rangeA;
    }
    if (this.isXsdSubType(rangeB.term, rangeA.term)) {
      return rangeB;
    }

    // Ranges always match with generic references
    if (rangeA.isA('ParameterRangeGenericTypeReference')) {
      return rangeB;
    }
    if (rangeB.isA('ParameterRangeGenericTypeReference')) {
      return rangeA;
    }

    // Check parameter range types
    if (rangeA.property.type?.term.equals(rangeB.property.type?.term)) {
      // Check sub-value for specific param range cases
      if (rangeA.isA('ParameterRangeArray') ||
        rangeA.isA('ParameterRangeRest') ||
        rangeA.isA('ParameterRangeKeyof')) {
        const valueA = rangeA.property.parameterRangeValue;
        const valueB = rangeB.property.parameterRangeValue;
        const merged = this.mergeRanges(valueA, valueB);
        if (!merged) {
          return;
        }
        return this.objectLoader.createCompactedResource({
          '@type': rangeA.property.type,
          parameterRangeValue: merged,
        });
      }

      // Check sub-values for specific param range cases
      if (rangeA.isA('ParameterRangeUnion') ||
        rangeA.isA('ParameterRangeIntersection') ||
        rangeA.isA('ParameterRangeTuple')) {
        const valuesA = rangeA.properties.parameterRangeElements;
        const valuesB = rangeB.properties.parameterRangeElements;
        if (valuesA.length !== valuesB.length) {
          return;
        }
        const merged = valuesA.map((valueA, i) => this.mergeRanges(valueA, valuesB[i]));
        if (merged.some(subValue => !subValue)) {
          return;
        }
        return this.objectLoader.createCompactedResource({
          '@type': rangeA.property.type,
          parameterRangeElements: merged,
        });
      }

      return rangeA;
    }
  }

  /**
   * Check if the given type is a subtype of the given super type.
   * @param type A type node.
   * @param potentialSuperType A potential super type node.
   */
  public isXsdSubType(type: RDF.Term, potentialSuperType: RDF.Term): boolean {
    const values = GenericsContext.XSD_INHERITANCE_TABLE[potentialSuperType.value];
    return values && values.has(type.value);
  }

  /**
   * Apply the give generic type instances for the given component's generic type parameters.
   *
   * This will throw if the number of passed instances does not match with
   * the number of generic type parameters on the component.
   *
   * @param component The component
   * @param genericTypeInstances The generic type instances to apply.
   * @param errorContext The context for error reporting.
   * @return boolean False if the application failed due to a binding error. True otherwise
   */
  public bindComponentGenericTypes(
    component: Resource,
    genericTypeInstances: Resource[],
    errorContext: Record<string, Resource | Resource[] | string>,
  ): IParamValueConflict | undefined {
    const genericTypeParameters = component.properties.genericTypeParameters;

    // Don't do anything if no generic type instances are passed.
    if (genericTypeInstances.length === 0) {
      return {
        description: `no generic type instances are passed`,
        context: errorContext,
      };
    }

    // Throw if an unexpected number of generic type instances are passed.
    if (genericTypeParameters.length !== genericTypeInstances.length) {
      throw new ErrorResourcesContext(`Invalid generic type instantiation: a different amount of generic types are passed (${genericTypeInstances.length}) than are defined on the component (${genericTypeParameters.length}).`, {
        passedGenerics: genericTypeInstances,
        definedGenerics: genericTypeParameters,
        component,
        ...errorContext,
      });
    }

    // Populate with manually defined generic type bindings
    for (const [ i, genericTypeInstance ] of genericTypeInstances.entries()) {
      // Remap generic type IRI to inner generic type IRI
      const genericTypeIdInner = genericTypeParameters[i].value;
      if (genericTypeInstance.property.parameterRangeGenericBindings) {
        const subConflict = this.bindGenericTypeToRange(
          genericTypeIdInner,
          genericTypeInstance.property.parameterRangeGenericBindings,
        );
        if (subConflict) {
          return {
            description: `invalid binding for generic <${genericTypeIdInner}>`,
            context: errorContext,
            causes: [ subConflict ],
          };
        }
      }
      this.genericTypeIds[genericTypeIdInner] = true;
    }
  }
}
