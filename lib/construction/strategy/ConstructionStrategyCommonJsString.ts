import * as Path from 'path';
import { ConstructionStrategyAbstractString } from './ConstructionStrategyAbstractString';
import { ConstructionStrategyCommonJs, type ICreationStrategyCommonJsOptions } from './ConstructionStrategyCommonJs';
import type {
  ICreationStrategyInstanceOptions,
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
export class ConstructionStrategyCommonJsString extends ConstructionStrategyAbstractString {
  protected EXPORT_STRING = 'module.exports =';
  protected ENTRY_KEY = 'main';
  private readonly strategyCommonJs: ConstructionStrategyCommonJs;
  private readonly overrideRequireNames: Record<string, string>;

  // eslint-disable-next-line unicorn/no-object-as-default-parameter
  public constructor(options: ICreationStrategyCommonJsStringOptions = { req: require }) {
    super(options);
    this.strategyCommonJs = new ConstructionStrategyCommonJs(options);
    this.overrideRequireNames = options.overrideRequireNames || {};
  }

  public createInstance(options: ICreationStrategyInstanceOptions<string>): string {
    // Call require()
    options.requireName = this.overrideRequireNames[options.requireName] || options.requireName;

    // First try requiring current module, and fallback to a plain require
    const currentResult = this.strategyCommonJs
      .requireCurrentRunningModuleIfCurrent(options.moduleState, options.requireName);
    const resultingRequirePath = currentResult !== false ?
      `.${Path.sep}${Path.relative(
        options.moduleState.mainModulePath,
        this.getCurrentRunningModuleMain(options.moduleState),
      )}` :
      options.requireName;
    let serialization = `require('${resultingRequirePath.replace(/\\/gu, '/')}')`;

    // Determine the child of the require'd element
    if (options.requireElement) {
      serialization += `.${options.requireElement}`;
    }

    // Call the constructor of the element
    if (options.callConstructor) {
      serialization = `new (${serialization})(${options.args.join(', ')})`;
    }

    // Add a line to our file to declare the instantiated element as a const
    const serializationVariableName = ConstructionStrategyCommonJsString.uriToVariableName(options.instanceId);
    serialization = `const ${serializationVariableName} = ${serialization};`;
    this.lines.push(serialization);
    serialization = serializationVariableName;

    return serialization;
  }
}

export interface ICreationStrategyCommonJsStringOptions extends ICreationStrategyCommonJsOptions {
  /**
   * If the exported instance should be exposed as a function, which accepts an optional hash of variables.
   * If this is true, variables will be extracted from the `variables` hash.
   */
  asFunction?: boolean;
}
