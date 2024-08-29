import type {
  IConstructionStrategy,
  ICreationStrategyArrayOptions,
  ICreationStrategyHashOptions,
  ICreationStrategyInstanceOptions,
  ICreationStrategyPrimitiveOptions,
  ICreationStrategySupplierOptions,
  ICreationStrategyVariableOptions,
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

  public createObject(options: ICreationStrategyInstanceOptions<any>, object: any): any {
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
}
