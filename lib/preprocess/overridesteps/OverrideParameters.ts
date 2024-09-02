import type { Resource } from 'rdf-object';
import { PREFIX_OO } from '../../rdf/Iris.js';
import type { IOverrideStep } from './IOverrideStep.js';
import { extractOverrideStepFields } from './OverrideUtil.js';

/**
 * Override step that replaces properties of the target object.
 * Only the specified parameters will be replaced,
 * others will keep their original value.
 * In case the type is changed all original values will be removed.
 *
 * Uses the following override step fields:
 *  - `overrideValue`: New properties for the object.
 */
export class OverrideParameters implements IOverrideStep {
  public canHandle(config: Resource, step: Resource): boolean {
    return step.property.type.value === PREFIX_OO('OverrideParameters');
  }

  public handle(config: Resource, step: Resource): Resource {
    const { values } = extractOverrideStepFields(step, { parameters: 0, targets: 0, values: 1 });
    const partialResource = values[0];

    // In case the step has a different type, the properties of the previous step don't matter any more,
    // as the object is being replaced completely.
    const originalType = config.property.type.term;
    const newType = partialResource.property.type?.term;

    // In case the type changes we have to delete all the original properties as those correspond to the old type
    if (newType && !newType.equals(originalType)) {
      for (const id of Object.keys(config.properties)) {
        delete config.properties[id];
      }
    }
    for (const property of Object.keys(partialResource.properties)) {
      config.properties[property] = partialResource.properties[property];
    }

    return config;
  }
}
