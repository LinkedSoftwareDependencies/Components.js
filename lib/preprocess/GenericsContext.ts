import type { Resource, RdfObjectLoader } from 'rdf-object';

/**
 * Context for binding generic types to a concrete range value.
 */
export class GenericsContext {
  private readonly objectLoader: RdfObjectLoader;
  /**
   * Set of generic type ids.
   * @private
   */
  public readonly genericTypeIds: Record<string, boolean>;
  /**
   * Mapping of generic type id to the resolved range.
   * @private
   */
  public readonly bindings: Record<string, Resource[]>;

  public constructor(objectLoader: RdfObjectLoader, genericTypeParameters: Resource[]) {
    this.objectLoader = objectLoader;
    this.genericTypeIds = Object.fromEntries(genericTypeParameters
      .map(genericTypeParameter => [ genericTypeParameter.value, true ]));
    this.bindings = {};

    for (const genericTypeParameter of genericTypeParameters) {
      if (genericTypeParameter.property.range) {
        this.bindings[genericTypeParameter.value] = genericTypeParameter.properties.range;
      }
    }
  }

  /**
   * Try to to bind the given value to the given generic.
   * @param genericTypeId IRI of the generic to bind.
   * @param value The value to bind to.
   * @param typeValidator Callback for validating values against types.
   */
  public bindGenericTypeToValue(
    genericTypeId: string,
    value: Resource | undefined,
    typeValidator: (subValue: Resource | undefined, subType: Resource) => boolean,
  ): boolean {
    // Fail if an unknown generic type is referenced
    if (!(genericTypeId in this.genericTypeIds)) {
      return false;
    }

    // If the generic was already bound to a range, validate it
    const existingRange = this.bindings[genericTypeId];
    if (existingRange && existingRange.some(existingRangeElement => !typeValidator(value, existingRangeElement))) {
      return false;
    }

    // Infer type of value
    const valueRange = this.inferValueRange(value);

    if (valueRange.length > 0) {
      // If we already had a range, try to align them
      // TODO: this will be needed for resources with common inheritance hierarchies

      // Save inferred type
      this.bindings[genericTypeId] = valueRange;
    }

    return true;
  }

  /**
   * Infer the parameter range of the given value.
   * @param value A value.
   */
  public inferValueRange(value: Resource | undefined): Resource[] {
    // Value is undefined
    if (!value) {
      return [ this.objectLoader.createCompactedResource({ type: 'ParameterRangeUndefined' }) ];
    }

    // Value is a literal
    if (value.term.termType === 'Literal') {
      return [ this.objectLoader.createCompactedResource(value.term.datatype) ];
    }

    // Value is a named node
    return value.properties.type;
  }
}
