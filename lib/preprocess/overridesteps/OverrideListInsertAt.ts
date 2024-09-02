import type { Resource } from 'rdf-object';
import { PREFIX_OO } from '../../rdf/Iris.js';
import { ErrorResourcesContext } from '../../util/ErrorResourcesContext.js';
import type { IOverrideStep } from './IOverrideStep.js';
import { extractOverrideStepFields, getPropertyResourceList } from './OverrideUtil.js';

/**
 * Override step that inserts elements in a list at a specific index.
 * A negative index can be used to count from the back of the list.
 * An index of `-0` can be used to insert at the end of the list.
 *
 * Uses the following override step fields:
 *  - `overrideParameter`: Parameter of the original object that contains the list.
 *  - `overrideTarget`: A literal containing the index.
 *  - `overrideValue`: Element(s) to insert at the chosen index.
 */
export class OverrideListInsertAt implements IOverrideStep {
  public canHandle(config: Resource, step: Resource): boolean {
    return step.property.type.value === PREFIX_OO('OverrideListInsertAt');
  }

  public handle(config: Resource, step: Resource): Resource {
    const { parameters, targets, values } = extractOverrideStepFields(step, { parameters: 1, targets: 1 });

    const list = getPropertyResourceList(config, parameters[0]);

    const val = targets[0].value;
    if (!/^-?\d+$/u.test(val)) {
      throw new ErrorResourcesContext(`Invalid index in Override step OverrideListInsertAt for parameter ${parameters[0].value}: ${val}`, {
        config,
        step,
      });
    }

    // Support adding elements at the end using -0
    if (val === '-0') {
      list.push(...values);
    } else {
      const index = Number.parseInt(val, 10);
      list.splice(index, 0, ...values);
    }

    return config;
  }
}
