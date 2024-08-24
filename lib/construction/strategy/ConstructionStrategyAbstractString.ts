import * as Path from 'path';
import type { IModuleState } from '../../loading/ModuleStateBuilder';
import type { ICreationStrategyCommonJsOptions } from './ConstructionStrategyCommonJs';
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
 * A creation strategy for a string representation of CommonJS.
 *
 * When this strategy is plugged into a {@link ComponentsManager},
 * the manager will output a string that represents the name of the variable that has been instantiated.
 * In order to retrieve a string representation of all Common JS logic to construct this variable,
 * the {@link serializeDocument} method can be invoked with this variable string.
 *
 * A typical pattern for using this strategy looks as follows:
 * ```
   const serializationVariableName = await manager.instantiate(configIri);
   const document = constructionStrategy.serializeDocument(serializationVariableName);
 * ```
 *
 * @see compileConfig For a simplified abstraction for using this strategy.
 */
export abstract class ConstructionStrategyAbstractString implements IConstructionStrategy<string> {
  protected readonly overrideRequireNames: Record<string, string>;
  protected readonly asFunction: boolean;
  protected readonly lines: string[] = [];
  protected abstract readonly EXPORT_STRING: string;
  protected abstract readonly ENTRY_KEY: string;


  // eslint-disable-next-line unicorn/no-object-as-default-parameter
  public constructor(options: ICreationStrategyCommonJsStringOptions = { req: require }) {
    this.overrideRequireNames = options.overrideRequireNames || {};
    this.asFunction = Boolean(options.asFunction);
  }

  public abstract createInstance(options: ICreationStrategyInstanceOptions<string>): string;

  /**
   * Get the path to the main module's main entrypoint.
   * @param moduleState The module state.
   * @return {string} The index module path of the current running module (`"main"` entry in package.json).
   */
  public getCurrentRunningModuleMain(moduleState: IModuleState): string {
    const pckg = moduleState.packageJsons[moduleState.mainModulePath];
    return Path.join(moduleState.mainModulePath, pckg[this.ENTRY_KEY]);
  }

  public createHash(options: ICreationStrategyHashOptions<string>): string {
    const sb: string[] = [ '{' ];
    for (const entry of options.entries) {
      if (entry) {
        if (sb.length > 1) {
          sb.push(',');
        }
        sb.push('\n');
        sb.push('  ');
        sb.push(`${entry.key}`);
        sb.push(': ');
        sb.push(entry.value);
      }
    }
    if (sb.length > 1) {
      sb.push('\n');
    }
    sb.push('}');
    return sb.join('');
  }

  public createArray(options: ICreationStrategyArrayOptions<string>): string {
    const sb: string[] = [ '[' ];
    for (const value of options.elements) {
      if (sb.length > 1) {
        sb.push(',');
      }
      sb.push('\n  ', value);
    }
    if (sb.length > 1) {
      sb.push('\n');
    }
    sb.push(']');
    return sb.join('');
  }

  public async createLazySupplier(options: ICreationStrategySupplierOptions<string>): Promise<string> {
    return `new function() { return Promise.resolve(${await options.supplier()}); }`;
  }

  public createPrimitive(options: ICreationStrategyPrimitiveOptions<string>): string {
    if (typeof options.value === 'object') {
      return JSON.stringify(options.value);
    }
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

  /**
   * Deterministically converts a URI to a variable name that is safe for usage within JavaScript.
   * @param {string} uri A URI.
   * @return {string} A variable name.
   */
  public static uriToVariableName(uri: string): string {
    return uri.replace(/[#./:@\\^-]/gu, '_');
  }

  /**
   * Serialize a full Common JS document to a string.
   * @param serializationVariableName The resulting string when calling {@link ComponentsManager.instantiate}.
   * @param exportVariableName An optional variable name that should be exported
   *                           instead of the default (serializationVariableName).
   */
  public serializeDocument(serializationVariableName: string, exportVariableName?: string): string {
    // Join all lines in the document
    const document: string = this.lines.join('\n');

    // Override main variable name if needed
    exportVariableName = (exportVariableName ?
      ConstructionStrategyAbstractString.uriToVariableName(exportVariableName) :
      exportVariableName) || serializationVariableName;

    // Export as variable-based function
    if (this.asFunction) {
      return `${this.EXPORT_STRING} function(variables) {
function getVariableValue(name) {
  if (!variables || !(name in variables)) {
    throw new Error('Undefined variable: ' + name);
  }
  return variables[name];
}
${document}
return ${exportVariableName};
}
`;
    }

    // Direct export of instantiated component
    return `${document}
${this.EXPORT_STRING} ${exportVariableName};
`;
  }
}

export interface ICreationStrategyCommonJsStringOptions extends ICreationStrategyCommonJsOptions {
  /**
   * If the exported instance should be exposed as a function, which accepts an optional hash of variables.
   * If this is true, variables will be extracted from the `variables` hash.
   */
  asFunction?: boolean;
}
