import * as Path from 'path';
import type { IModuleState } from '../../loading/ModuleStateBuilder.js';
import { ConstructionStrategyAbstract } from './ConstructionStrategyAbstract.js';
import type {
  ICreationStrategyInstanceOptions,
} from './IConstructionStrategy.js';

/**
 * A creation strategy for creating instances with CommonJS.
 */
export class ConstructionStrategyESM extends ConstructionStrategyAbstract {
  private readonly overrideRequireNames: Record<string, string>;

  // eslint-disable-next-line unicorn/no-object-as-default-parameter
  public constructor(options: ICreationStrategyESMoptions) {
    super();
    this.overrideRequireNames = options.overrideRequireNames || {};
  }

  public async createInstance(options: ICreationStrategyInstanceOptions<any>): Promise<any> {
    // Call require()
    options.requireName = this.overrideRequireNames[options.requireName] || options.requireName;

    // First try requiring current module, and fallback to a plain require
    const currentResult = await this.requireCurrentRunningModuleIfCurrent(options.moduleState, options.requireName);
    const object = currentResult !== false ?
      currentResult.value :
      await import(
        options.requireName.startsWith('.') ?
          Path.join(process.cwd(), options.requireName) :
        // TODO See if we need to supply { paths: [ options.moduleState.mainModulePath ]} somehow
          options.requireName
      );

    return this.createObject(options, object);
  }

  /**
   * Require the given module iff the module is the current main module.
   * This is done by looking for the nearest package.json.
   * @param moduleState The module state.
   * @param requireName The module name that should be required.
   * @returns {any} The require() result
   */
  public async requireCurrentRunningModuleIfCurrent(
    moduleState: IModuleState,
    requireName: string,
  ): Promise<{ value: any } | false> {
    const pckg = moduleState.packageJsons[moduleState.mainModulePath];
    if (pckg) {
      if (requireName === pckg.name) {
        const mainPath: string = Path.posix.join(moduleState.mainModulePath, pckg.module);
        const required = await import(mainPath);
        if (required) {
          return { value: required };
        }
      }
    }
    return false;
  }
}

export interface ICreationStrategyESMoptions {
  /**
   * Overrides for `require()` calls.
   * For example, an override entry `abc -> def` will map all calls from `require('abc')` to `require('def')`.
   */
  overrideRequireNames?: Record<string, string>;
}
