import { ComponentsManager } from './ComponentsManager';
import { ConstructionStrategyCommonJsString } from './construction/strategy/ConstructionStrategyCommonJsString';

/**
 * Compile a configuration stream to a JavaScript source file.
 * @param {string} mainModulePath The main module path.
 * @param {string} configPath Path of the config file.
 * @param {string} configIri IRI of the config element to compile.
 * @param {string} exportVariableName An optional variable name to export instead of the default runner.
 * @param {boolean} asFunction If the exported instance should be exposed as a function,
 *                             which accepts an optional hash of variables.
 * @return {Promise<string>} A string resolving to the JavaScript contents.
 */
export async function compileConfig(
  mainModulePath: string,
  configPath: string,
  configIri: string,
  exportVariableName?: string,
  asFunction?: boolean,
): Promise<string> {
  // Set up the components manager
  const constructionStrategy = new ConstructionStrategyCommonJsString({ asFunction, req: require });
  const manager = await ComponentsManager.build({
    mainModulePath,
    constructionStrategy,
    configLoader: async registry => registry.register(configPath),
  });

  // Serialize the config
  const serializationVariableName = await manager.instantiate(configIri);
  return constructionStrategy.serializeDocument(serializationVariableName, exportVariableName);
}
