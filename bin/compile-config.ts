#!/usr/bin/env node
// Compiles a configuration to a module (single file) that exports the instantiated instance, where all dependencies are injected.

import {Stream} from "stream";

const Loader = require(__dirname + '/..').Loader;
import {ParsedArgs} from "minimist";
import minimist = require('minimist');
import * as fs from "fs";
import * as Path from "path";
import Util = require("../lib/Util");

const args: ParsedArgs = minimist(process.argv.slice(2));
if (args._.length !== 1 || args.h || args.help) {
    throw new Error(`compile-config compiles a Components.js config file to a JavaScript module

Usage:
  compile-config http://example.org/myInstance -c config.jsonld
  cat config.jsonld | compile-config http://example.org/myInstance

Options:
  -c      Path to a Components.js config file, if not provided, the config must be provided via stdin
  -p      The main module path, if not provided, this defaults to the working directory
  -g      If global modules should be included as well next to local modules.
  -e      The instance by config URI that will be exported, by default this is the provided instance URI.
  --help  print this help message
      `);
}

const configResourceUri: string = args._[0];

let configStreamRaw: Stream;
let configPath: string;
if (args.c) {
    configStreamRaw = fs.createReadStream(args.c, { encoding: 'utf8' });
    configPath = args.c;
} else {
    configStreamRaw = process.stdin;
    configPath = '.';
}

let mainModulePath: string;
if (args.p) {
    mainModulePath = Path.resolve(process.cwd(), args.p);
} else {
    mainModulePath = process.cwd();
}

let exportVariableName: string = null;
if (args.e) {
    exportVariableName = Util.uriToVariableName(args.e);
}

let scanGlobal: boolean = !!args.g;

const loader = new Loader({ mainModulePath, scanGlobal });
loader.registerAvailableModuleResources()
    .then(function() {
        return loader._getContexts().then((contexts: {[id: string]: string}) => {
            const configStream: Stream = Util.parseRdf(configStreamRaw, configPath, mainModulePath, false, true, contexts);
            const moduleLines: string[] = [];
            loader.instantiateFromStream(configResourceUri, configStream, { serializations: moduleLines })
                .then((serializationVariableName: any) => {
                    let document: string = moduleLines.join('\n');
                    if (exportVariableName !== serializationVariableName) {
                        // Remove the instantiation of the runner component, as it will not be needed anymore.
                        document = document.replace('new (require(\'@comunica/runner\').Runner)', '');
                    }
                    console.log(document + '\n' + 'module.exports = ' + (exportVariableName || serializationVariableName) + ';');
                }).catch(console.error);
        }).catch(console.error);
    }).catch(console.error);
