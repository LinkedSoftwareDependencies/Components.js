import * as Path from 'path';
import { ConstructionStrategyAbstractString } from './ConstructionStrategyAbstractString';
import type { ICreationStrategyCommonJsOptions } from './ConstructionStrategyCommonJs';
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
export class ConstructionStrategyESMString extends ConstructionStrategyAbstractString {
  protected EXPORT_STRING = 'export default';
  protected ENTRY_KEY = 'module';

  // eslint-disable-next-line unicorn/no-object-as-default-parameter
  public constructor(options: ICreationStrategyCommonJsStringOptions = { req: require }) {
    super(options);
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
      serializationVariableName += 'Class';
    }

    if (options.settings.esm) {
      serialization = 'import ';
      if (options.requireElement === serializationVariableName) {
        serialization += `{ ${serializationVariableName} }`;
      } else if (options.requireElement) {
        serialization += `{ ${options.requireElement} as ${serializationVariableName} }`;
      } else {
        serialization += `* as ${serializationVariableName}`;
      }
      serialization += ` from '${resultingRequirePath.replace(/\\/gu, '/')}';`;
    } else {
      serialization = `require('${resultingRequirePath.replace(/\\/gu, '/')}')`;

      // Determine the child of the require'd element
      if (options.requireElement) {
        serialization += `.${options.requireElement}`;
      }

      // Add a line to our file to declare the instantiated element as a const
      serialization = `const ${serializationVariableName} = ${serialization};`;
    }

    this.lines.push(serialization);

    // Call the constructor of the element
    if (options.callConstructor) {
      this.lines.push(`const ${serializationVariableName.slice(0, -5)} = new ${serializationVariableName}(${options.args.join(', ')});`);
      return serializationVariableName.slice(0, -5);
    }

    return serializationVariableName;
  }
}

export interface ICreationStrategyCommonJsStringOptions extends ICreationStrategyCommonJsOptions {
  /**
   * If the exported instance should be exposed as a function, which accepts an optional hash of variables.
   * If this is true, variables will be extracted from the `variables` hash.
   */
  asFunction?: boolean;
}
