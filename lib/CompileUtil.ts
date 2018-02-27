import {Loader, LoaderProperties} from "./Loader";
import {Stream} from "stream";
import Util = require("./Util");

/**
 * Compile a configuration stream to a JavaScript source file.
 * @param {LoaderProperties} properties Properties for the loader.
 * @param {string} configPath Path of the config file.
 * @param {"stream".internal.Stream} configStreamRaw Stream of the config file contents.
 * @param {string} configResourceUri URI of the config element to compile.
 * @param {string} exportVariableName An optional variable name to export instead of the default runner.
 * @return {Promise<string>} A string resolving to the JavaScript contents.
 */
export function compileConfig(properties: LoaderProperties, configPath: string, configStreamRaw: Stream,
                              configResourceUri: string, exportVariableName?: string): Promise<string> {
    exportVariableName = Util.uriToVariableName(exportVariableName);
    const loader = new Loader(properties);
    return loader.registerAvailableModuleResources()
        .then(() => {
            return loader._getContexts().then((contexts: {[id: string]: string}) => {
                const configStream: Stream = Util.parseRdf(configStreamRaw, configPath, properties.mainModulePath, false, true, contexts);
                const moduleLines: string[] = [];
                return loader.instantiateFromStream(configResourceUri, configStream, { serializations: moduleLines })
                    .then((serializationVariableName: any) => {
                        let document: string = moduleLines.join('\n');
                        if (exportVariableName !== serializationVariableName) {
                            // Remove the instantiation of the runner component, as it will not be needed anymore.
                            document = document.replace('new (require(\'@comunica/runner\').Runner)', '');
                        }
                        return document + '\n' + 'module.exports = ' + (exportVariableName || serializationVariableName) + ';';
                    });
            });
        });
}