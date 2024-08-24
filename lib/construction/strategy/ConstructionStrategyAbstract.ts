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
export abstract class ConstructionStrategyAbstract implements IConstructionStrategy<any> {
  public abstract createInstance(options: ICreationStrategyInstanceOptions<any>): any;
  
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
