import * as Path from 'path';
// Import syntax only works in Node > 12
const fs = require('fs').promises;

/**
 * Collects the paths to all available modules and components.
 */
export class ModuleStateBuilder {
  /**
   * Build the module state.
   * @param req The `require` instance.
   * @param mainModulePathIn An optional path to the main module from which the search should start.
   */
  public async buildModuleState(req: NodeJS.Require, mainModulePathIn?: string): Promise<IModuleState> {
    const mainModulePath = await fs.realpath(mainModulePathIn || this.buildDefaultMainModulePath(req));
    const nodeModuleImportPaths = this.buildNodeModuleImportPaths(mainModulePath);
    const nodeModulePaths = await this.buildNodeModulePaths(nodeModuleImportPaths);
    const packageJsons = await this.buildPackageJsons(nodeModulePaths);
    const componentModules = await this.buildComponentModules(packageJsons);
    const contexts = await this.buildComponentContexts(packageJsons);
    const importPaths = await this.buildComponentImportPaths(packageJsons);
    return {
      mainModulePath,
      nodeModuleImportPaths,
      nodeModulePaths,
      packageJsons,
      componentModules,
      contexts,
      importPaths,
    };
  }

  /**
   * Determine the default main module path based on the current directory.
   * @param req The `require` instance.
   */
  public buildDefaultMainModulePath(req: NodeJS.Require): string {
    if (!req.main) {
      throw new Error(`Corrupt Node.js state: Could not find a main module.`);
    }
    for (const nodeModulesPath of req.main.paths) {
      const path = nodeModulesPath.replace(/node_modules$/u, 'package.json');
      try {
        req(path);
        return path.replace(/package.json$/u, '');
      } catch {
        // Do nothing
      }
    }
    throw new Error(`Corrupt Node.js state: None of the main module paths are valid.`);
  }

  /**
   * All paths that need to be considered when handling imports from the current main module path.
   */
  public buildNodeModuleImportPaths(mainModulePath: string): string[] {
    const sections: string[] = mainModulePath.split(Path.sep);
    const paths: string[] = [];
    for (let i = sections.length; i > 1; i--) {
      paths.push(sections.slice(0, i).join(Path.sep));
    }
    return paths;
  }

  /**
   * Get all currently available node module paths.
   * @param nodeModuleImportPaths The main module paths to start from.
   */
  public async buildNodeModulePaths(nodeModuleImportPaths: string[]): Promise<string[]> {
    const nodeModulePaths: string[] = [];
    const ignorePaths: Record<string, boolean> = {};
    await Promise.all(nodeModuleImportPaths.map(async path => this
      .buildNodeModulePathsInner(path, nodeModulePaths, ignorePaths)));
    return nodeModulePaths;
  }

  /**
   * Get all currently available node module paths.
   * @param path The path to start from.
   * @param nodeModulePaths The array of node module paths to append to.
   * @param ignorePaths The paths that should be ignored.
   */
  protected async buildNodeModulePathsInner(
    path: string,
    nodeModulePaths: string[],
    ignorePaths: Record<string, boolean>,
  ): Promise<void> {
    // Make sure we're working with an absolute paths without symlinks
    path = await fs.realpath(path);

    // Avoid infinite loops
    if (ignorePaths[path]) {
      return;
    }
    ignorePaths[path] = true;

    try {
      // Check if the path is a Node module
      if ((await fs.stat(Path.join(path, 'package.json'))).isFile()) {
        nodeModulePaths.push(path);

        // Recursively handle all the Node modules of this valid Node module
        const dependenciesPath = Path.join(path, 'node_modules');
        for (const dependency of await fs.readdir(dependenciesPath)) {
          // Ignore hidden folders, such as .bin
          if (!dependency.startsWith('.')) {
            const dependencyPath = Path.join(dependenciesPath, dependency);
            if (dependency.startsWith('@')) {
              // Iterate one level deeper when we find scoped Node modules
              const scopedModules: string[] = await fs.readdir(dependencyPath);
              await Promise.all(scopedModules.map(async scopedModule => this.buildNodeModulePathsInner(
                Path.join(dependencyPath, scopedModule),
                nodeModulePaths,
                ignorePaths,
              )));
            } else {
              await this.buildNodeModulePathsInner(dependencyPath, nodeModulePaths, ignorePaths);
            }
          }
        }
      }
    } catch {
      // Ignore invalid paths
    }
  }

  /**
   * Read the package.json files from all the given Node modules.
   * @param nodeModulePaths An array of node module paths.
   */
  public async buildPackageJsons(nodeModulePaths: string[]): Promise<Record<string, any>> {
    const packageJsons: Record<string, any> = {};
    await Promise.all(nodeModulePaths.map(async modulePath => {
      packageJsons[modulePath] = JSON.parse(await fs.readFile(Path.join(modulePath, 'package.json'), 'utf8'));
    }));
    return packageJsons;
  }

  /**
   * Get all Components.js modules from the given package.json files.
   * @param packageJsons A hash of Node module path to package.json contents.
   * @return A hash of module id (`lsd:module`) to absolute component paths (`lsd:components`).
   */
  public async buildComponentModules(packageJsons: Record<string, any>): Promise<Record<string, string>> {
    const componentModules: Record<string, string> = {};
    for (const [ modulePath, pckg ] of Object.entries(packageJsons)) {
      const currentModuleUri: string = pckg['lsd:module'];
      const relativePath: string = pckg['lsd:components'];
      if (currentModuleUri && relativePath) {
        if (!(currentModuleUri in componentModules)) {
          componentModules[currentModuleUri] = Path.join(modulePath, relativePath);
        }
      }
    }
    return componentModules;
  }

  /**
   * Get all Components.js contexts from the given package.json files.
   * @param packageJsons A hash of Node module path to package.json contents.
   * @return A hash of context id (key of `lsd:contexts`) to absolute context paths (value of `lsd:contexts`).
   */
  public async buildComponentContexts(packageJsons: Record<string, any>): Promise<Record<string, string>> {
    const componentContexts: Record<string, string> = {};
    await Promise.all(Object.entries(packageJsons).map(async([ modulePath, pckg ]) => {
      const contexts: Record<string, string> = pckg['lsd:contexts'];
      if (contexts) {
        for (const [ key, value ] of Object.entries(contexts)) {
          const filePath: string = Path.join(modulePath, value);
          const fileContents = JSON.parse(await fs.readFile(filePath, 'utf8'));
          if (!(key in componentContexts)) {
            componentContexts[key] = fileContents;
          }
        }
      }
    }));
    return componentContexts;
  }

  /**
   * Get all Components.js modules from the given package.json files.
   * @param packageJsons A hash of Node module path to package.json contents.
   * @return A hash of context id (key of `lsd:importPaths`) to absolute context paths (value of `lsd:importPaths`).
   */
  public async buildComponentImportPaths(packageJsons: Record<string, any>): Promise<Record<string, string>> {
    const componentImportPaths: Record<string, string> = {};
    await Promise.all(Object.entries(packageJsons).map(async([ modulePath, pckg ]) => {
      const importPaths: Record<string, string> = pckg['lsd:importPaths'];
      if (importPaths) {
        for (const [ key, value ] of Object.entries(importPaths)) {
          if (!(key in componentImportPaths)) {
            componentImportPaths[key] = Path.join(modulePath, value);

            // Crash when the context prefix target does not exist
            let stat;
            try {
              stat = await fs.stat(componentImportPaths[key]);
            } catch {
              throw new Error(`Error while parsing import path '${key}' in ${modulePath}: ${componentImportPaths[key]} does not exist.`);
            }
            if (!stat.isDirectory()) {
              throw new Error(`Error while parsing import path '${key}' in ${modulePath}: ${componentImportPaths[key]} is not a directory.`);
            }
          }
        }
      }
    }));
    return componentImportPaths;
  }
}

export interface IModuleState {
  /**
   * Path to the current Node module from which all importing is done.
   */
  mainModulePath: string;
  /**
   * All paths that are considered when handling imports.
   * This starts from the main module, and traverses up to parents.
   */
  nodeModuleImportPaths: string[];
  /**
   * All paths to Node modules that are in scope for the current module.
   * All reachable node modules in node_modules folders.
   */
  nodeModulePaths: string[];
  /**
   * A hash of absolute module paths to parsed package.json files (JSON).
   */
  packageJsons: Record<string, any>;
  /**
   * All Components.js modules.
   * This hash maps module IRIs (`lsd:module`)
   * to absolute component paths (`lsd:components`).
   */
  componentModules: Record<string, string>;
  /**
   * All Components.js contexts.
   * This hash maps context IRIs (key of `lsd:contexts`)
   * to absolute context paths (value of `lsd:contexts`).
   */
  contexts: Record<string, string>;
  /**
   * All Components.js import paths.
   * This hash maps import path base IRIs (key of `lsd:importPaths`)
   * to absolute base paths (value of `lsd:importPaths`).
   */
  importPaths: Record<string, string>;
}
