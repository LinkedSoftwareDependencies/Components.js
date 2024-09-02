import type { Resource } from 'rdf-object';
import { PREFIX_OO } from '../../rdf/Iris.js';
import type { IOverrideStep } from './IOverrideStep.js';
import { extractOverrideStepFields, findResourceIndex, getPropertyResourceList } from './OverrideUtil.js';

/**
 * Override step that inserts elements in a list before a specific element.
 *
 * Uses the following override step fields:
 *  - `overrideParameter`: Parameter of the original object that contains the list.
 *  - `overrideTarget`: Element already in the list that is used as reference. This can be a named node or a literal.
 *  - `overrideValue`: Element(s) to insert immediately before the target element.
 */
export class OverrideListInsertBefore implements IOverrideStep {
  public canHandle(config: Resource, step: Resource): boolean {
    return step.property.type.value === PREFIX_OO('OverrideListInsertBefore');
  }

  public handle(config: Resource, step: Resource): Resource {
    const { parameters, targets, values } = extractOverrideStepFields(step, { parameters: 1, targets: 1 });

    const list = getPropertyResourceList(config, parameters[0]);

    const index = findResourceIndex(list, targets[0]);

    list.splice(index, 0, ...values);

    return config;
  }
}
