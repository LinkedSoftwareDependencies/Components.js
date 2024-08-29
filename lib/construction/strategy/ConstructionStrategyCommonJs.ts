import * as Path from 'path';
import type { IModuleState } from '../../loading/ModuleStateBuilder';
import { ConstructionStrategyAbstract } from './ConstructionStrategyAbstract';
import type {
  ICreationStrategyInstanceOptions,
} from './IConstructionStrategy';

/**
 * A creation strategy for creating instances with CommonJS.
 */
export class ConstructionStrategyCommonJs extends ConstructionStrategyAbstract {
  private readonly overrideRequireNames: Record<string, string>;
  private readonly req: NodeJS.Require;

  // eslint-disable-next-line unicorn/no-object-as-default-parameter
  public constructor(options: ICreationStrategyCommonJsOptions = { req: require }) {
    super();
    this.overrideRequireNames = options.overrideRequireNames || {};
    this.req = options.req;
  }

  public createInstance(options: ICreationStrategyInstanceOptions<any>): any {
    // Call require()
    options.requireName = this.overrideRequireNames[options.requireName] || options.requireName;

    // First try requiring current module, and fallback to a plain require
    let object: any;
    const currentResult = this.requireCurrentRunningModuleIfCurrent(options.moduleState, options.requireName);
    object = currentResult !== false ?
      currentResult.value :
      this.req(options.requireName.startsWith('.') ?
        Path.join(process.cwd(), options.requireName) :
        this.req.resolve(options.requireName, { paths: [ options.moduleState.mainModulePath ]}));

    return this.createObject(options, object);
  }

  /**
   * Require the given module iff the module is the current main module.
   * This is done by looking for the nearest package.json.
   * @param moduleState The module state.
   * @param requireName The module name that should be required.
   * @returns {any} The require() result
   */
  public requireCurrentRunningModuleIfCurrent(moduleState: IModuleState, requireName: string): { value: any } | false {
    const pckg = moduleState.packageJsons[moduleState.mainModulePath];
    if (pckg) {
      if (requireName === pckg.name) {
        const mainPath: string = Path.posix.join(moduleState.mainModulePath, pckg.main);
        const required = this.req(mainPath);
        if (required) {
          return { value: required };
        }
      }
    }
    return false;
  }
}

export interface ICreationStrategyCommonJsOptions {
  /**
   * Overrides for `require()` calls.
   * For example, an override entry `abc -> def` will map all calls from `require('abc')` to `require('def')`.
   */
  overrideRequireNames?: Record<string, string>;
  /**
   * The `require` instance.
   */
  req: NodeJS.Require;
}
