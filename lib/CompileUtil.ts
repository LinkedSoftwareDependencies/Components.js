import { ComponentsManager } from './ComponentsManager';
import { ConstructionStrategyCommonJsString } from './construction/strategy/ConstructionStrategyCommonJsString';

/**
 * Compile a configuration stream to a JavaScript source file.
 * @param {string} mainModulePath The main module path.
 * @param {string} configPath Path of the config file.
 * @param {"stream".internal.Stream} configStreamRaw Stream of the config file contents.
 * @param {string} configResourceUri URI of the config element to compile.
 * @param {string} exportVariableName An optional variable name to export instead of the default runner.
 * @param {boolean} asFunction If the exported instance should be exposed as a function,
 *                             which accepts an optional hash of variables.
 * @return {Promise<string>} A string resolving to the JavaScript contents.
 */
export async function compileConfig(
  mainModulePath: string,
  configPath: string,
  configResourceUri: string,
  exportVariableName?: string,
  asFunction?: boolean,
): Promise<string> {
  const constructionStrategy = new ConstructionStrategyCommonJsString({ asFunction, req: require });
  const manager = await ComponentsManager.build({
    mainModulePath,
    constructionStrategy,
    configLoader: async registry => registry.register(configPath),
  });

  // Serialize the config
  const serializationVariableName = await manager.instantiate(configResourceUri);
  let document: string = constructionStrategy.lines.join('\n');

  // Override main variable name if needed
  exportVariableName = exportVariableName ?
    ConstructionStrategyCommonJsString.uriToVariableName(exportVariableName) :
    exportVariableName;
  if (exportVariableName !== serializationVariableName) {
    // Remove the construction of the runner component, as it will not be needed anymore.
    document = document.replace('new (require(\'@comunica/runner\').Runner)', '');
  }

  if (asFunction) {
    // Export as variable-based function
    return `module.exports = function(variables) {
function getVariableValue(name) {
  if (!variables || !(name in variables)) {
    throw new Error('Undefined variable: ' + name);
  }
  return variables[name];
}
${document}
return ${exportVariableName || serializationVariableName};
}
`;
  }
  // Direct export of instantiated component
  return `${document}
module.exports = ${exportVariableName || serializationVariableName};
`;
}
