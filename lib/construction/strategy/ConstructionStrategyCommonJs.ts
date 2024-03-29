import * as Path from 'path';
import type { IModuleState } from '../../loading/ModuleStateBuilder';
import type {
  ICreationStrategyInstanceOptions,
  IConstructionStrategy,
  ICreationStrategyHashOptions,
  ICreationStrategyArrayOptions,
  ICreationStrategySupplierOptions,
  ICreationStrategyPrimitiveOptions, ICreationStrategyVariableOptions,
} from './IConstructionStrategy';

/**
 * A creation strategy for creating instances with CommonJS.
 */
export class ConstructionStrategyCommonJs implements IConstructionStrategy<any> {
  private readonly overrideRequireNames: Record<string, string>;
  private readonly req: NodeJS.Require;

  // eslint-disable-next-line unicorn/no-object-as-default-parameter
  public constructor(options: ICreationStrategyCommonJsOptions = { req: require }) {
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

    // Determine the child of the require'd element
    let subObject;
    if (options.requireElement) {
      const requireElementPath = options.requireElement.split('.');
      try {
        subObject = requireElementPath.reduce((acc: any, subRequireElement: string) => acc[subRequireElement], object);
      } catch {
        throw new Error(`Failed to get module element ${options.requireElement} from module ${options.requireName}`);
      }
    } else {
      subObject = object;
    }
    if (!subObject) {
      throw new Error(`Failed to get module element ${options.requireElement} from module ${options.requireName}`);
    }

    // Call the constructor of the element
    object = subObject;
    if (options.callConstructor) {
      if (typeof object !== 'function') {
        throw new Error(`Attempted to construct ${options.requireElement} from module ${options.requireName} that does not have a constructor`);
      }
      object = new (Function.prototype.bind.apply(object, <[any, ...any]>[{}].concat(options.args)))();
    }

    return object;
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

  public createHash(options: ICreationStrategyHashOptions<any>): any {
    return options.entries.reduce((data: Record<string, any>, entry: { key: string; value: any } | undefined) => {
      if (entry) {
        data[entry.key] = entry.value;
      }
      return data;
    }, {});
  }

  public createArray(options: ICreationStrategyArrayOptions<any>): any {
    return options.elements;
  }

  public async createLazySupplier(options: ICreationStrategySupplierOptions<any>): Promise<any> {
    return options.supplier;
  }

  public createPrimitive(options: ICreationStrategyPrimitiveOptions<any>): any {
    return options.value;
  }

  public getVariableValue(options: ICreationStrategyVariableOptions<any>): any {
    const value = options.settings.variables ? options.settings.variables[options.variableName] : undefined;
    if (value === undefined) {
      throw new Error(`Undefined variable: ${options.variableName}`);
    }
    return value;
  }

  public createUndefined(): any {
    // Return undefined
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
