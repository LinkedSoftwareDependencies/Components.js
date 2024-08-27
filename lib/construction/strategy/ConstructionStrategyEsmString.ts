import * as Path from 'path';
import { ConstructionStrategyAbstractString, IConstructionStrategyAbstractStringOptions } from './ConstructionStrategyAbstractString';
import type { ICreationStrategyESMoptions } from './ConstructionStrategyEsm';
import type {
  ICreationStrategyInstanceOptions,
} from './IConstructionStrategy';
import { ConstructionStrategyCommonJs } from './ConstructionStrategyCommonJs';

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
export class ConstructionStrategyESMString extends ConstructionStrategyAbstractString {
  protected EXPORT_STRING = 'export default';
  protected ENTRY_KEY = 'module';
  private CLASS_STRING = '_class';
  private overrideRequireNames: Record<string, string>;
  private strategyCommonJs: ConstructionStrategyCommonJs;

  // eslint-disable-next-line unicorn/no-object-as-default-parameter
  public constructor(options: ICreationStrategyCommonJsStringOptions = { req: require }) {
    super(options);
    this.overrideRequireNames = options.overrideRequireNames || {};
    this.strategyCommonJs = new ConstructionStrategyCommonJs(options);
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

    let serializationVariableName = ConstructionStrategyESMString.uriToVariableName(options.instanceId);
    let serialization: string;

    if (options.callConstructor) {
      serializationVariableName += this.CLASS_STRING;
    }

    serialization = 'import ';
    if (options.requireElement === serializationVariableName) {
      serialization += `{ ${serializationVariableName} }`;
    } else if (options.requireElement) {
      serialization += `{ ${options.requireElement} as ${serializationVariableName} }`;
    } else {
      serialization += `* as ${serializationVariableName}`;
    }
    serialization += ` from '${resultingRequirePath.replace(/\\/gu, '/')}';`;

    this.outerLines.push(serialization);

    // Call the constructor of the element
    if (options.callConstructor) {
      this.lines.push(`const ${serializationVariableName.slice(0, -this.CLASS_STRING.length)} = new ${serializationVariableName}(${options.args.join(', ')});`);
      return serializationVariableName.slice(0, -this.CLASS_STRING.length);
    }

    return serializationVariableName;
  }
}

export interface ICreationStrategyCommonJsStringOptions extends ICreationStrategyESMoptions, IConstructionStrategyAbstractStringOptions {
}
