import type { Resource } from 'rdf-object';
import { PREFIX_OO } from '../../rdf/Iris';
import { ErrorResourcesContext } from '../../util/ErrorResourcesContext';
import type { IOverrideStep } from './IOverrideStep';
import { extractOverrideStepFields, getPropertyResourceList } from './OverrideUtil';

/**
 * Override step that updates an entry in a key/value map.
 *
 * Uses the following override step fields:
 *  - `overrideParameter`: Parameter of the original object that contains the key/value map.
 *  - `overrideTarget`: The key that needs to be updated.
 *  - `overrideValue`: The new value for the key. In case this is not defined, the key will be deleted instead.
 */
export class OverrideMapEntry implements IOverrideStep {
  public canHandle(config: Resource, step: Resource): boolean {
    return step.property.type.value === PREFIX_OO('OverrideMapEntry');
  }

  public handle(config: Resource, step: Resource): Resource {
    const { parameters, targets, values } = extractOverrideStepFields(step, { parameters: 1, targets: 1 });

    const properties = this.findProperties(config.property.type, parameters[0]);

    const entries = getPropertyResourceList(config, parameters[0]);
    const index = this.findEntryIndex(entries, targets[0], properties);

    if (values.length === 0) {
      // Remove the entry
      entries.splice(index, 1);
    } else {
      // Replace the value of the entry
      entries[index].properties[properties.value.value] = values;
    }

    return config;
  }

  /**
   * Finds the URIs used to link to the key and value of a map entry.
   *
   * @param type - Type of the class that contains the key/value map.
   * @param parameter - Parameter of the class used to link to the key/value map.
   */
  protected findProperties(type: Resource, parameter: Resource): { key: Resource; value: Resource } {
    const constructArgs = type.property.constructorArguments.list ?? [];
    for (const arg of constructArgs) {
      const fields = arg.property.fields.list ?? [];
      for (const field of fields) {
        let collectEntries = field.property.collectEntries;
        // Not sure when this is not a list in practice.
        // Based on behaviour in `ConstructorArgumentsElementMappingHandlerCollectEntries`.
        if (collectEntries.list) {
          collectEntries = collectEntries.list[0];
        }
        if (collectEntries.term.equals(parameter.term)) {
          return { key: field.property.key, value: field.property.value };
        }
      }
    }

    throw new ErrorResourcesContext(`Unable to find key/value URIs for parameter ${parameter.value}`, {
      type,
      parameter,
    });
  }

  /**
   * Finds the index in a list of key/value map entries of the entry with the matching key.
   *
   * @param entries - List of key/value map entries.
   * @param key - Key of the entry to find.
   * @param properties - URIs used to link the key and value of a map entry.
   */
  protected findEntryIndex(entries: Resource[], key: Resource, properties: { key: Resource; value: Resource }): number {
    for (const [ i, entry ] of entries.entries()) {
      if (key.term.equals(entry.property[properties.key.value].term)) {
        return i;
      }
    }

    throw new ErrorResourcesContext(`Unable to find key/value entry with key ${key.value}`, {
      entries,
      key,
      properties,
    });
  }
}
