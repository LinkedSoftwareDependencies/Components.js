import { Loader, LoaderProperties } from "./Loader";
import Util = require("./Util");
import { RdfParser } from './rdf/RdfParser';

/**
 * Compile a configuration stream to a JavaScript source file.
 * @param {LoaderProperties} properties Properties for the loader.
 * @param {string} configPath Path of the config file.
 * @param {"stream".internal.Stream} configStreamRaw Stream of the config file contents.
 * @param {string} configResourceUri URI of the config element to compile.
 * @param {string} exportVariableName An optional variable name to export instead of the default runner.
 * @param {boolean} asFunction If the exported instance should be exposed as a function, which accepts an optional hash of variables.
 * @return {Promise<string>} A string resolving to the JavaScript contents.
 */
export async function compileConfig(properties: LoaderProperties & { mainModulePath: string }, configPath: string, configStreamRaw: NodeJS.ReadableStream,
                                    configResourceUri: string, exportVariableName?: string, asFunction?: boolean): Promise<string> {
  // Load modules and config
  const loader = new Loader(properties);
  await loader.registerAvailableModuleResources();
  const [contexts, importPaths] = await Promise.all([loader._getContexts(), loader._getImportPaths()]);
  const configStream = new RdfParser().parse(configStreamRaw, {
    fromPath: configPath,
    path: properties.mainModulePath,
    contexts,
    importPaths,
    ignoreImports: false,
    absolutizeRelativePaths: true,
  });

  // Serialize the config
  const moduleLines: string[] = [];
  const serializationVariableName = await loader.instantiateFromStream(configResourceUri, configStream, { serializations: moduleLines, asFunction })
  let document: string = moduleLines.join('\n');

  // Override main variable name if needed
  exportVariableName = exportVariableName ? Util.uriToVariableName(exportVariableName) : exportVariableName;
  if (exportVariableName !== serializationVariableName) {
    // Remove the instantiation of the runner component, as it will not be needed anymore.
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
  } else {
    // Direct export of instantiated component
    return `${document}
module.exports = ${exportVariableName || serializationVariableName};
`;
  }
}
