import * as Path from 'path';
import type { IModuleState } from '../ModuleStateBuilder';
import * as Util from '../Util';
import type { ICreationStrategyCommonJsOptions } from './CreationStrategyCommonJs';
import { CreationStrategyCommonJs } from './CreationStrategyCommonJs';
import type { ICreationStrategy,
  ICreationStrategyHashOptions,
  ICreationStrategyInstanceOptions,

  ICreationStrategyArrayOptions,
  ICreationStrategyPrimitiveOptions,
  ICreationStrategySupplierOptions,
  ICreationStrategyVariableOptions } from './ICreationStrategy';

/**
 * A creation strategy for a string representation of CommonJS.
 */
export class CreationStrategyCommonJsString implements ICreationStrategy<string> {
  private readonly overrideRequireNames: Record<string, string>;
  private readonly asFunction: boolean;
  private readonly strategyCommonJs: CreationStrategyCommonJs;

  public readonly lines: string[] = [];

  public constructor(options: ICreationStrategyCommonJsStringOptions = {}) {
    this.overrideRequireNames = options.overrideRequireNames || {};
    this.asFunction = Boolean(options.asFunction);
    this.strategyCommonJs = new CreationStrategyCommonJs(this.overrideRequireNames);
  }

  public createInstance(options: ICreationStrategyInstanceOptions<string>): string {
    // Call require()
    options.requireName = this.overrideRequireNames[options.requireName] || options.requireName;
    let resultingRequirePath: string;
    try {
      this.strategyCommonJs.requireCurrentRunningModuleIfCurrent(options.settings.moduleState, options.requireName);
      resultingRequirePath = `.${Path.sep}${Path.relative(options.settings.moduleState.mainModulePath,
        this.getCurrentRunningModuleMain(options.settings.moduleState))}`;
    } catch {
      resultingRequirePath = options.requireName;
    }
    let serialization = `require('${resultingRequirePath.replace(/\\/gu, '/')}')`;

    // Determine the child of the require'd element
    if (options.requireElement) {
      serialization += `.${options.requireElement}`;
    }

    // Call the constructor of the element
    if (options.callConstructor) {
      serialization = `new (${serialization})(${options.args.join(',')})`;
    }

    // Add a line to our file to declare the instantiated element as a const
    const serializationVariableName = Util.uriToVariableName(options.instanceId);
    serialization = `const ${serializationVariableName} = ${serialization};`;
    this.lines.push(serialization);
    serialization = serializationVariableName;

    return serialization;
  }

  /**
   * Get the path to the main module's main entrypoint.
   * @param moduleState The module state.
   * @return {string} The index module path of the current running module (`"main"` entry in package.json).
   */
  public getCurrentRunningModuleMain(moduleState: IModuleState): string {
    const pckg = moduleState.packageJsons[moduleState.mainModulePath];
    return Path.join(moduleState.mainModulePath, pckg.main);
  }

  protected stringify(data: any): string {
    return JSON.stringify(data, null, '  ').replace(/(^|[^\\])"/gu, '$1');
  }

  public createHash(options: ICreationStrategyHashOptions<string>): string {
    return this.stringify(this.strategyCommonJs.createHash({
      settings: options.settings,
      entries: options.entries.map(entry => {
        if (entry) {
          entry = { key: `'${entry.key}'`, value: entry.value };
        }
        return entry;
      }),
    }));
  }

  public createArray(options: ICreationStrategyArrayOptions<string>): string {
    return this.stringify(this.strategyCommonJs.createArray(options));
  }

  public async createLazySupplier(options: ICreationStrategySupplierOptions<string>): Promise<string> {
    return `new function() { return Promise.resolve(${await options.supplier()}); }`;
  }

  public createPrimitive(options: ICreationStrategyPrimitiveOptions<string>): string {
    return typeof options.value === 'string' ? `'${options.value}'` : `${options.value}`;
  }

  public getVariableValue(options: ICreationStrategyVariableOptions<string>): string {
    if (this.asFunction) {
      return `getVariableValue('${options.variableName}')`;
    }
    throw new Error(`Detected a variable during config compilation: ${options.variableName}. Variables are not supported, but require the -f flag to expose the compiled config as function.`);
  }

  public createUndefined(): string {
    return 'undefined';
  }
}

export interface ICreationStrategyCommonJsStringOptions extends ICreationStrategyCommonJsOptions {
  /**
   * If the exported instance should be exposed as a function, which accepts an optional hash of variables.
   * If this is true, variables will be extracted from the `variables` hash.
   */
  asFunction?: boolean;
}
