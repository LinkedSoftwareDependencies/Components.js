#!/usr/bin/env node
// Compiles a configuration to a module (single file) that exports the instantiated instance,
// where all dependencies are injected.

import * as Path from 'path';
import type { ParsedArgs } from 'minimist';
import minimist = require('minimist');
import { compileConfig } from '../index.js';

const args: ParsedArgs = minimist(process.argv.slice(2));
if (args._.length !== 1 || args.h || args.help) {
  process.stderr.write(`compile-config compiles a Components.js config file to a JavaScript module

Usage:
  compile-config http://example.org/myInstance -c config.jsonld

Options:
  -c      Path to a Components.js config file, if not provided, the config must be provided via stdin
  -p      The main module path, if not provided, this defaults to the working directory
  -e      The instance by config URI that will be exported, by default this is the provided instance URI.
  -f      If the exported instance should be exposed as a function, which accepts an optional hash of variables.
  -m      A flag to endicate that an ESM [m]odule should be generated instead of CommonJS.
  --help  print this help message
`);
  process.exit(1);
}

const configResourceUri: string = args._[0];
const configPath: string = args.c;
const mainModulePath: string = args.p ? Path.resolve(process.cwd(), args.p) : process.cwd();
let exportVariableName: string | undefined;
if (args.e) {
  exportVariableName = args.e;
}
const asFunction = !!args.f;
const asEsm = !!args.m;

compileConfig(
  mainModulePath,
  configPath,
  configResourceUri,
  exportVariableName,
  asFunction,
  asEsm,
)
  .then((output: string) => process.stdout.write(`${output}\n`))
  .catch(error => {
    process.stderr.write(`${error.stack}\n`);
    process.exit(1);
  });
