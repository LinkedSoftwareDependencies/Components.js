import { CreationStrategyCommonJsString } from './creationstrategy/CreationStrategyCommonJsString';
import type { ILoaderProperties } from './Loader';
import { Loader } from './Loader';
import { RdfParser } from './rdf/RdfParser';

/**
 * Compile a configuration stream to a JavaScript source file.
 * @param {ILoaderProperties} properties Properties for the loader.
 * @param {string} configPath Path of the config file.
 * @param {"stream".internal.Stream} configStreamRaw Stream of the config file contents.
 * @param {string} configResourceUri URI of the config element to compile.
 * @param {string} exportVariableName An optional variable name to export instead of the default runner.
 * @param {boolean} asFunction If the exported instance should be exposed as a function,
 *                             which accepts an optional hash of variables.
 * @return {Promise<string>} A string resolving to the JavaScript contents.
 */
export async function compileConfig(
  properties: ILoaderProperties & { mainModulePath: string },
  configPath: string,
  configStreamRaw: NodeJS.ReadableStream,
  configResourceUri: string,
  exportVariableName?: string,
  asFunction?: boolean,
): Promise<string> {
  // Load modules and config
  const creationStrategy = new CreationStrategyCommonJsString({ asFunction, req: require });
  const loader = new Loader(properties, creationStrategy);
  await loader.registerAvailableModuleResources();
  const state = await loader.getModuleState();
  const configStream = new RdfParser().parse(configStreamRaw, {
    path: configPath,
    contexts: state.contexts,
    importPaths: state.importPaths,
    logger: loader.logger,
  });

  // Serialize the config
  await loader.registerConfigStream(configStream);
  const serializationVariableName = await loader.getComponentInstance(configResourceUri);
  let document: string = creationStrategy.lines.join('\n');

  // Override main variable name if needed
  exportVariableName = exportVariableName ?
    CreationStrategyCommonJsString.uriToVariableName(exportVariableName) :
    exportVariableName;
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
  }
  // Direct export of instantiated component
  return `${document}
module.exports = ${exportVariableName || serializationVariableName};
`;
}
