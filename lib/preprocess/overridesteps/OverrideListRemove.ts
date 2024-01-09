import type { Resource } from 'rdf-object';
import { PREFIX_OO } from '../../rdf/Iris';
import type { IOverrideStep } from './IOverrideStep';
import { extractOverrideStepFields, findResourceIndex, getPropertyResourceList } from './OverrideUtil';

/**
 * Override step that removes specified elements.
 *
 * Uses the following override step fields:
 *  - `overrideParameter`: Parameter of the original object that contains the list.
 *  - `overrideTarget`: Element(s) already in the list that need to be removed. These can be named nodes or literals.
 */
export class OverrideListRemove implements IOverrideStep {
  public canHandle(config: Resource, step: Resource): boolean {
    return step.property.type.value === PREFIX_OO('OverrideListRemove');
  }

  public handle(config: Resource, step: Resource): Resource {
    const { parameters, targets, values } = extractOverrideStepFields(step, { parameters: 1, values: 0 });

    const list = getPropertyResourceList(config, parameters[0]);

    const indexes: number[] = [];
    for (const element of targets) {
      indexes.push(findResourceIndex(list, element));
    }

    // Highest number first so indexes remain correct while sorting
    indexes.sort((left, right) => right - left);

    for (const index of indexes) {
      list.splice(index, 1);
    }

    return config;
  }
}
