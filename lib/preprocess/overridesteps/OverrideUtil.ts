import type { Resource } from 'rdf-object';
import { PREFIX_OO } from '../../rdf/Iris';
import { ErrorResourcesContext } from '../../util/ErrorResourcesContext';

export const OVERRIDE_STEP_FIELD_NAMES = <const> [ 'parameter', 'target', 'value' ];
export type OverrideStepFieldName = `${typeof OVERRIDE_STEP_FIELD_NAMES[number]}s`;

/**
 * Extracts the fields from an override step and checks if the correct amount is present.
 * Will throw an error if the amount doesn't match what is expected.
 *
 * @param step - Override step to get the fields from.
 * @param expected - For each field, how many are expected. The value can be undefined if there is no fixed amount.
 */
export function extractOverrideStepFields(step: Resource, expected: { [key in OverrideStepFieldName]?: number } = {}):
Record<OverrideStepFieldName, Resource[]> {
  // Type is not correct yet now but will be completed in the loop below
  const result = <Record<OverrideStepFieldName, Resource[]>> {};

  for (const key of OVERRIDE_STEP_FIELD_NAMES) {
    const overrideKey = `override${key[0].toUpperCase()}${key.slice(1)}`;
    const propertiesKey = <const> `${key}s`;
    const properties = step.properties[PREFIX_OO(overrideKey)];
    if (properties.length > 1) {
      throw new ErrorResourcesContext(`Detected multiple values for ${overrideKey} in Override step ${step.value}. RDF lists should be used for defining multiple values.`, {
        overrideStep: step,
      });
    }

    const list = properties[0]?.list ?? properties;

    if (typeof expected[propertiesKey] === 'number' && list.length !== expected[propertiesKey]) {
      throw new ErrorResourcesContext(`Expected ${expected[propertiesKey]} entries for ${overrideKey} but found ${list.length} in Override step ${step.value}`, {
        overrideStep: step,
      });
    }
    result[propertiesKey] = list;
  }

  return result;
}

/**
 * Returns a list containing all values for the given resource found with the given property.
 * In case there are multiple matches, the lists will be merged.
 * The parameter of the resource will be updated to have a single value which is the returned list,
 * so the returned list can be updated to modify the resource directly.
 *
 * @param config
 * @param parameter
 */
export function getPropertyResourceList(config: Resource, parameter: Resource): Resource[] {
  const properties = config.properties[parameter.value];
  if (!properties || properties.length === 0) {
    return [];
  }

  // Having multiple lists can happen if multiple config files add elements to the same list
  const list = properties.flatMap(prop => prop.list);
  if (list.some(res => res === undefined)) {
    throw new ErrorResourcesContext(`Invalid target in Override step targeting ${config.value}: ${parameter.value} does not reference a list`, {
      config,
    });
  }

  config.properties[parameter.value] = [ properties[0] ];
  properties[0].list = <Resource[]>list;

  return properties[0].list;
}

/**
 * Finds the index of the given resource in the given list.
 * Will throw an error if the resource is not found.
 *
 * @param list - The list to find the resource in.
 * @param target - The resource to find.
 */
export function findResourceIndex(list: Resource[], target: Resource): number {
  const index = list.findIndex((element): boolean => element.term.equals(target.term));
  if (index < 0) {
    throw new ErrorResourcesContext(`Unable to find ${target.value} in targeted list while overriding.`, {
      target,
      list,
    });
  }
  return index;
}
