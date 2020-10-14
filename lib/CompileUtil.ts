import {Loader, LoaderProperties} from "./Loader";
import {Stream} from "stream";
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
export function compileConfig(properties: LoaderProperties, configPath: string, configStreamRaw: NodeJS.ReadableStream,
                              configResourceUri: string, exportVariableName?: string, asFunction?: boolean): Promise<string> {
    exportVariableName = exportVariableName ? Util.uriToVariableName(exportVariableName) : exportVariableName;
    const loader = new Loader(properties);
    return loader.registerAvailableModuleResources()
        .then(() => {
            return Promise.all([loader._getContexts(), loader._getImportPaths()]).then(([contexts, importPaths]: {[id: string]: string}[]) => {
                const configStream = new RdfParser().parse(configStreamRaw, {
                  fromPath: configPath,
                  path: properties.mainModulePath,
                  contexts,
                  importPaths,
                  ignoreImports: false,
                  absolutizeRelativePaths: true,
                });
                const moduleLines: string[] = [];
                return loader.instantiateFromStream(configResourceUri, configStream, { serializations: moduleLines, asFunction })
                    .then((serializationVariableName: any) => {
                        let document: string = moduleLines.join('\n');
                        if (exportVariableName !== serializationVariableName) {
                            // Remove the instantiation of the runner component, as it will not be needed anymore.
                            document = document.replace('new (require(\'@comunica/runner\').Runner)', '');
                        }
                        if (asFunction) {
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
                          return `${document}
module.exports = ${exportVariableName || serializationVariableName};
`;
                        }
                    });
            });
        });
}
