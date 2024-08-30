import type { Resource } from 'rdf-object';
import type { RdfObjectLoader } from 'rdf-object/lib/RdfObjectLoader.js';
import type { Logger } from 'winston';
import { IRIS_OO, PREFIX_OO } from '../rdf/Iris.js';
import { uniqueTypes } from '../rdf/ResourceUtil.js';
import { ErrorResourcesContext } from '../util/ErrorResourcesContext.js';
import type { IConfigPreprocessor, IConfigPreprocessorTransform } from './IConfigPreprocessor.js';
import type { IOverrideStep } from './overridesteps/IOverrideStep.js';
import { OverrideListInsertAfter } from './overridesteps/OverrideListInsertAfter.js';
import { OverrideListInsertAt } from './overridesteps/OverrideListInsertAt.js';
import { OverrideListInsertBefore } from './overridesteps/OverrideListInsertBefore.js';
import { OverrideListRemove } from './overridesteps/OverrideListRemove.js';
import { OverrideMapEntry } from './overridesteps/OverrideMapEntry.js';
import { OverrideParameters } from './overridesteps/OverrideParameters.js';

/**
 * An {@link IConfigPreprocessor} that handles the overriding of parameters.
 * Values in the given {@link Resource}s will be replaced if any overriding object is found,
 * targeting this resource.
 */
export class ConfigPreprocessorOverride implements IConfigPreprocessor<Resource[]> {
  public readonly objectLoader: RdfObjectLoader;
  public readonly componentResources: Record<string, Resource>;
  public readonly logger: Logger;

  private readonly stepHandlers: IOverrideStep[];
  private overrides: Record<string, Resource[]> | undefined;

  public constructor(options: IComponentConfigPreprocessorOverrideOptions) {
    this.objectLoader = options.objectLoader;
    this.componentResources = options.componentResources;
    this.logger = options.logger;

    this.stepHandlers = [
      new OverrideParameters(),
      new OverrideListInsertBefore(),
      new OverrideListInsertAfter(),
      new OverrideListInsertAt(),
      new OverrideListRemove(),
      new OverrideMapEntry(),
    ];
  }

  /**
   * Checks if there are any overrides targeting the given resource.
   * @param config - Resource to find overrides for.
   *
   * @returns A list of override steps to apply to the target, in order.
   */
  public canHandle(config: Resource): Resource[] | undefined {
    if (!this.overrides) {
      this.overrides = this.createOverrideSteps();
    }
    return this.overrides[config.value];
  }

  /**
   * Override the resource with the stored override steps.
   * @param config - The resource to override.
   * @param handleResponse - Override steps that were found for this resource.
   */
  public transform(config: Resource, handleResponse: Resource[]): IConfigPreprocessorTransform {
    // Apply all override steps sequentially
    for (const step of handleResponse) {
      let handler: IOverrideStep | undefined;
      for (const stepHandler of this.stepHandlers) {
        if (stepHandler.canHandle(config, step)) {
          handler = stepHandler;
          break;
        }
      }
      if (!handler) {
        throw new ErrorResourcesContext(`Found no handler supporting an override step of type ${step.property.type.value}`, {
          step,
        });
      }
      handler.handle(config, step);
    }

    return { rawConfig: config, finishTransformation: false };
  }

  /**
   * Clear all cached overrides, so they will be calculated again on the next call.
   */
  public reset(): void {
    this.overrides = undefined;
  }

  /**
   * Generates a cache of all overrides found in the object loader.
   * Keys of the object are the identifiers of the resources that need to be modified,
   * values are key/value maps listing all parameters with their new values.
   */
  public createOverrideSteps(): Record<string, Resource[]> {
    const overrides = [ ...this.findOverrideTargets() ];
    const chains = this.createOverrideChains(overrides);
    this.validateChains(chains);
    const overrideSteps: Record<string, Resource[]> = {};
    for (const chain of chains) {
      const { target, steps } = this.chainToOverrideSteps(chain);
      if (Object.keys(steps).length > 0) {
        overrideSteps[target.value] = steps;
      }
    }
    return overrideSteps;
  }

  /**
   * Finds all Override resources in the object loader and links them to their target resource.
   */
  protected * findOverrideTargets(): Iterable<{ override: Resource; target: Resource }> {
    for (const [ id, resource ] of Object.entries(this.objectLoader.resources)) {
      if (resource.isA(IRIS_OO.Override) && resource.value !== IRIS_OO.Override) {
        const targets = resource.properties[IRIS_OO.overrideInstance];
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
   * The last element in the array will always be the non-Override resource being targeted.
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
   * Merges all Overrides in a chain to create a single list of override steps.
   * The order of the steps is the order in which they should be applied,
   * with the first entry being the first step of the override closest to the target resource.
   *
   * @param chain - The chain of Overrides, with a normal resource as the last entry in the array.
   */
  protected chainToOverrideSteps(chain: Resource[]): { target: Resource; steps: Resource[] } {
    const target = this.getChainTarget(chain);
    const steps: Resource[] = [];
    for (let i = chain.length - 2; i >= 0; --i) {
      const subStepProperties = chain[i].properties[IRIS_OO.overrideSteps];

      if (subStepProperties.length > 1) {
        throw new ErrorResourcesContext(`Detected multiple values for overrideSteps in Override ${chain[i].value}. RDF lists should be used for defining multiple values.`, {
          override: chain[i],
        });
      }

      let subSteps = subStepProperties[0]?.list ?? subStepProperties;

      // Translate simplified format to override step
      if (chain[i].properties[IRIS_OO.overrideParameters].length > 0) {
        subSteps = [ this.simplifiedOverrideToStep(chain[i]) ];
      }

      if (subSteps.length === 0) {
        this.logger.warn(`No steps found for Override ${chain[i].value}. This Override will be ignored.`);
        continue;
      }

      steps.push(...subSteps);
    }
    return { target, steps };
  }

  /**
   * Finds the final target and validates its type value.
   * @param chain - The chain to find the target of.
   */
  protected getChainTarget(chain: Resource[]): Resource {
    const target = chain[chain.length - 1];
    const types = uniqueTypes(target, this.componentResources);
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
    return target;
  }

  /**
   *
   * @param override
   * @protected
   */
  protected simplifiedOverrideToStep(override: Resource): Resource {
    const overrideObjects = override.properties[IRIS_OO.overrideParameters];
    if (overrideObjects.length > 1) {
      throw new ErrorResourcesContext(`Detected multiple values for overrideParameters in Override ${override.value}`, {
        override,
      });
    }
    return this.objectLoader.createCompactedResource({
      types: PREFIX_OO('OverrideParameters'),
      overrideValue: overrideObjects[0],
    });
  }
}

export interface IComponentConfigPreprocessorOverrideOptions {
  objectLoader: RdfObjectLoader;
  componentResources: Record<string, Resource>;
  logger: Logger;
}
