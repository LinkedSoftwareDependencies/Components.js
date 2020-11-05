#!/usr/bin/env node
// Compiles a configuration to a module (single file) that exports the instantiated instance,
// where all dependencies are injected.

import * as fs from 'fs';
import * as Path from 'path';
import type { Readable } from 'stream';
import type { ParsedArgs } from 'minimist';
import minimist = require('minimist');
import { compileConfig } from '..';

const args: ParsedArgs = minimist(process.argv.slice(2));
if (args._.length !== 1 || args.h || args.help) {
  process.stderr.write(`compile-config compiles a Components.js config file to a JavaScript module

Usage:
  compile-config http://example.org/myInstance -c config.jsonld
  cat config.jsonld | compile-config http://example.org/myInstance

Options:
  -c      Path to a Components.js config file, if not provided, the config must be provided via stdin
  -p      The main module path, if not provided, this defaults to the working directory
  -g      If global modules should be included as well next to local modules.
  -e      The instance by config URI that will be exported, by default this is the provided instance URI.
  -f      If the exported instance should be exposed as a function, which accepts an optional hash of variables.
  --help  print this help message
`);
  process.exit(1);
}

const configResourceUri: string = args._[0];

let configStreamRaw: Readable;
let configPath: string;
if (args.c) {
  configStreamRaw = fs.createReadStream(args.c, { encoding: 'utf8' });
  configPath = args.c;
} else {
  configStreamRaw = process.stdin;
  configPath = '.';
}

const mainModulePath: string = args.p ? Path.resolve(process.cwd(), args.p) : process.cwd();

let exportVariableName: string | undefined;
if (args.e) {
  exportVariableName = args.e;
}

const scanGlobal = !!args.g;

const asFunction = !!args.f;

compileConfig(
  { mainModulePath, scanGlobal },
  configPath,
  configStreamRaw,
  configResourceUri,
  exportVariableName,
  asFunction,
)
  .then((output: string) => process.stdout.write(`${output}\n`))
  .catch(error => {
    process.stderr.write(`${error.stack}\n`);
    process.exit(1);
  });
