import type { Resource } from 'rdf-object';
import type { RdfObjectLoader } from 'rdf-object/lib/RdfObjectLoader';
import type { Logger } from 'winston';
import { ErrorResourcesContext } from '../util/ErrorResourcesContext';
import type { IConfigPreprocessor, IConfigPreprocessorTransform } from './IConfigPreprocessor';

/**
 * An {@link IConfigPreprocessor} that handles the overriding of parameters.
 * Values in the given {@link Resource}s will be replaced if any overriding object is found,
 * targeting this resource.
 */
export class ConfigPreprocessorOverride implements IConfigPreprocessor<Record<string, Resource>> {
  public readonly objectLoader: RdfObjectLoader;
  public readonly componentResources: Record<string, Resource>;
  public readonly logger: Logger;

  private overrides: Record<string, Record<string, Resource>> | undefined;

  public constructor(options: IComponentConfigPreprocessorOverrideOptions) {
    this.objectLoader = options.objectLoader;
    this.componentResources = options.componentResources;
    this.logger = options.logger;
  }

  /**
   * Checks if there are any overrides targeting the given resource.
   * @param config - Resource to find overrides for.
   *
   * @returns A key/value object with keys being the properties that have an override.
   */
  public canHandle(config: Resource): Record<string, Resource> | undefined {
    if (!this.overrides) {
      this.overrides = this.createOverrideObjects();
    }
    return this.overrides[config.value];
  }

  /**
   * Override the resource with the stored values.
   * @param config - The resource to override.
   * @param handleResponse - Override values that were found for this resource.
   */
  public transform(config: Resource, handleResponse: Record<string, Resource>): IConfigPreprocessorTransform {
    for (const id of Object.keys(config.properties)) {
      const overrideValue = handleResponse[id];
      if (overrideValue) {
        config.properties[id] = [ overrideValue ];
      }
    }
    return { rawConfig: config, finishTransformation: false };
  }

  /**
   * Clear all cached overrides so they will be calculated again on the next call.
   */
  public reset(): void {
    this.overrides = undefined;
  }

  /**
   * Generates a cache of all overrides found in the object loader.
   * Keys of the object are the identifiers of the resources that need to be modified,
   * values are key/value maps listing all parameters with their new values.
   */
  public createOverrideObjects(): Record<string, Record<string, Resource>> {
    const overrides = [ ...this.findOverrideTargets() ];
    const chains = this.createOverrideChains(overrides);
    this.validateChains(chains);
    const overrideObjects: Record<string, Record<string, Resource>> = {};
    for (const chain of chains) {
      const { target, values } = this.chainToOverrideObject(chain);
      if (Object.keys(values).length > 0) {
        overrideObjects[target] = values;
      }
    }
    return overrideObjects;
  }

  /**
   * Finds all Override resources in the object loader and links them to their target resource.
   */
  protected * findOverrideTargets(): Iterable<{ override: Resource; target: Resource }> {
    const overrideUri = this.objectLoader.contextResolved.expandTerm('oo:Override')!;
    const overrideInstanceUri = this.objectLoader.contextResolved.expandTerm('oo:overrideInstance')!;
    for (const [ id, resource ] of Object.entries(this.objectLoader.resources)) {
      if (resource.isA(overrideUri) && resource.value !== overrideUri) {
        const targets = resource.properties[overrideInstanceUri];
        if (!targets || targets.length === 0) {
          this.logger.warn(`Missing overrideInstance for ${id}. This Override will be ignored.`);
          continue;
        }
        if (targets.length > 1) {
          throw new ErrorResourcesContext(`Detected multiple overrideInstance targets for ${id}`, {
            override: resource,
          });
        }
        yield { override: resource, target: targets[0] };
      }
    }
  }

  /**
   * Chains all Overrides together if they reference each other.
   * E.g., if the input is a list of Overrides A -> B, B -> C, D -> E,
   * the result wil be [[ A, B, C ], [ D, E ]].
   *
   * @param overrides - All Overrides that have to be combined.
   */
  protected createOverrideChains(overrides: { override: Resource; target: Resource }[]): Resource[][] {
    // Start by creating small chains: from each override to its immediate target
    const overrideChains = Object.fromEntries(
      overrides.map(({ override, target }): [ string, Resource[]] =>
        [ override.value, [ override, target ]]),
    );

    // Then keep combining those smaller chains into bigger chains until they are complete.
    // If there is an override cycle (A -> B -> ... -> A) it will delete itself from the list of chains here.
    let change = true;
    while (change) {
      change = false;
      for (const [ id, chain ] of Object.entries(overrideChains)) {
        let next = chain[chain.length - 1];
        // If the next part of the chain is found in `overrideChains` we can merge them and remove the tail entry
        while (overrideChains[next.value]) {
          change = true;
          const nextChain = overrideChains[next.value];
          // First element of nextChain will be equal to last element of this chain
          overrideChains[id].push(...nextChain.slice(1));
          // In case of a cycle there will be a point where next equals the first element,
          // at which point it will delete itself.
          delete overrideChains[next.value];
          next = chain[chain.length - 1];
        }
        // Reset the loop since we are modifying the object we are iterating over
        if (change) {
          break;
        }
      }
    }

    return Object.values(overrideChains);
  }

  /**
   * Throws an error in case there are 2 chains targeting the same resource.
   * @param chains - The override chains to check.
   */
  protected validateChains(chains: Resource[][]): void {
    const targets = chains.map((chain): string => chain[chain.length - 1].value);
    for (let i = 0; i < targets.length; ++i) {
      const duplicateIdx = targets.findIndex((target, idx): boolean => idx > i && target === targets[i]);
      if (duplicateIdx > 0) {
        const target = chains[i][chains[i].length - 1];
        const duplicate1 = chains[i][chains[i].length - 2];
        const duplicate2 = chains[duplicateIdx][chains[duplicateIdx].length - 2];
        throw new ErrorResourcesContext(`Found multiple Overrides targeting ${targets[i]}`, {
          target,
          overrides: [ duplicate1, duplicate2 ],
        });
      }
    }
  }

  /**
   * Merges all Overrides in a chain to create a single override object
   * containing replacement values for all relevant parameters of the final entry in the chain.
   *
   * @param chain - The chain of Overrides, with a normal resource as the last entry in the array.
   */
  protected chainToOverrideObject(chain: Resource[]): { target: string; values: Record<string, Resource> } {
    const { target, type } = this.getChainTarget(chain);

    // Apply all overrides sequentially, starting from the one closest to the target.
    // This ensures the most recent override has priority.
    const parameters = this.componentResources[type.value].properties.parameters;
    const mergedOverride: Record<string, Resource> = {};
    for (let i = chain.length - 2; i >= 0; --i) {
      const filteredObject = this.filterOverrideObject(chain[i], target, parameters);
      Object.assign(mergedOverride, filteredObject);
    }
    return { target: target.value, values: mergedOverride };
  }

  /**
   * Finds the final target and its type in an override chain.
   * @param chain - The chain to find the target of.
   */
  protected getChainTarget(chain: Resource[]): { target: Resource; type: Resource } {
    const rdfTypeUri = this.objectLoader.contextResolved.expandTerm('rdf:type')!;
    const target = chain[chain.length - 1];
    const types = target.properties[rdfTypeUri];
    if (!types || types.length === 0) {
      throw new ErrorResourcesContext(`Missing type for override target ${target.value} of Override ${chain[chain.length - 2].value}`, {
        target,
        override: chain[chain.length - 2],
      });
    }
    if (types.length > 1) {
      throw new ErrorResourcesContext(`Found multiple types for override target ${target.value} of Override ${chain[chain.length - 2].value}`, {
        target,
        override: chain[chain.length - 2],
      });
    }
    return { target, type: types[0] };
  }

  /**
   * Extracts all relevant parameters of an Override with their corresponding new value.
   * @param override - The Override to apply.
   * @param target - The target resource to apply the Override to.
   * @param parameters - The parameters that are relevant for the target.
   */
  protected filterOverrideObject(override: Resource, target: Resource, parameters: Resource[]):
  Record<string, Resource> {
    const overrideParametersUri = this.objectLoader.contextResolved.expandTerm('oo:overrideParameters')!;
    const overrideObjects = override.properties[overrideParametersUri];
    if (!overrideObjects || overrideObjects.length === 0) {
      this.logger.warn(`No overrideParameters found for ${override.value}.`);
      return {};
    }
    if (overrideObjects.length > 1) {
      throw new ErrorResourcesContext(`Detected multiple values for overrideParameters in Override ${override.value}`, {
        override,
      });
    }
    const overrideObject = overrideObjects[0];

    // Only keep the parameters that are known to the type of the target object
    const filteredObject: Record<string, Resource> = {};
    for (const parameter of parameters) {
      const overrideValues = overrideObject.properties[parameter.value];
      if (!overrideValues || overrideValues.length === 0) {
        continue;
      }
      if (overrideValues.length > 1) {
        throw new ErrorResourcesContext(`Detected multiple values for override parameter ${parameter.value} in Override ${override.value}. RDF lists should be used for defining multiple values.`, {
          arguments: overrideValues,
          target,
          override,
        });
      }
      filteredObject[parameter.value] = overrideValues[0];
    }
    return filteredObject;
  }
}

export interface IComponentConfigPreprocessorOverrideOptions {
  objectLoader: RdfObjectLoader;
  componentResources: Record<string, Resource>;
  logger: Logger;
}
