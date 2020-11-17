import * as Path from 'path';
import type { Resource, RdfObjectLoader } from 'rdf-object';
import type { IInstancePool } from '../IInstancePool';
import type { IModuleState } from '../ModuleStateBuilder';
import * as Util from '../Util';
import type { IComponentFactoryOptionsBase } from './ComponentFactoryOptions';
import type { IComponentFactory, ICreationSettings, ICreationSettingsInner } from './IComponentFactory';
import Dict = NodeJS.Dict;
import Module = NodeJS.Module;

/**
 * Factory for component definitions with explicit arguments.
 */
export class UnnamedComponentFactory implements IComponentFactory {
  protected readonly objectLoader: RdfObjectLoader;
  protected readonly config: Resource;
  protected readonly constructable: boolean;
  protected readonly overrideRequireNames: Dict<string>;
  protected readonly instancePool: IInstancePool;

  public constructor(options: IComponentFactoryOptionsBase) {
    this.objectLoader = options.objectLoader;
    this.config = options.config;
    this.constructable = options.constructable;
    this.overrideRequireNames = options.overrideRequireNames;
    this.instancePool = options.instancePool;

    // Validate params
    this.validateParam(this.config, 'requireName', 'Literal');
    this.validateParam(this.config, 'requireElement', 'Literal', true);
    this.validateParam(this.config, 'requireNoConstructor', 'Literal', true);
  }

  /**
   * Check if the given field of given type exists in the given resource.
   * @param resource A resource to look in.
   * @param field A field name to look for.
   * @param type The term type to expect.
   * @param optional If the field is optional.
   */
  public validateParam(resource: Resource, field: string, type: string, optional?: boolean): void {
    if (!resource.property[field]) {
      if (!optional) {
        throw new Error(`Expected ${field} to exist in ${Util.resourceToString(resource)}`);
      } else {
        return;
      }
    }
    if (resource.property[field].type !== type) {
      throw new Error(`Expected ${field} in ${Util.resourceToString(resource)} to be of type ${type}`);
    }
  }

  /**
   * Convert the given argument value resource into a JavaScript object or primitive.
   * @param value One or more argument values.
   * @param settings Creation settings.
   */
  public async getArgumentValue(value: Resource | Resource[], settings: ICreationSettings): Promise<any> {
    if (Array.isArray(value)) {
      // Unwrap unique values out of the array
      if (value[0].property.unique && value[0].property.unique.value === 'true') {
        return this.getArgumentValue(value[0], settings);
      }
      // Otherwise, keep the array form
      return await Promise.all(value
        .map(element => this.getArgumentValue(element, settings)));
    }
    // HasFields is a hack for making UnmappedNamedComponentFactory work
    if (value.property.fields || value.property.hasFields) {
      // The parameter is an object
      const entries = await Promise.all(value.properties.fields.map(async(entry: Resource) => {
        if (!entry.property.key) {
          throw new Error(`Parameter object entries must have keys, but found: ${Util.resourceToString(entry)}`);
        }
        if (entry.property.key.type !== 'Literal') {
          throw new Error(`Parameter object keys must be literals, but found type ${entry.property.key.type} for ${Util.resourceIdToString(entry.property.key, this.objectLoader)} while constructing: ${Util.resourceToString(value)}`);
        }
        if (entry.property.value) {
          const subValue = await this.getArgumentValue(entry.properties.value, settings);
          return { key: entry.property.key.value, value: subValue };
        }
        // TODO: only throw an error if the parameter is required
        // return Promise.reject(
        // new Error('Parameter object entries must have values, but found: ' + JSON.stringify(entry, null, '  ')));
        return null;
      }));
      return entries.reduce((data: any, entry: any) => {
        if (entry) {
          if (settings.serializations) {
            entry.key = `'${entry.key}'`;
          }
          data[entry.key] = entry.value;
        }
        return data;
      }, {});
    }
    if (value.property.elements) {
      // The parameter is a dynamic array
      const elements = await Promise.all(value.properties.elements.map(async(entry: Resource) => {
        if (!entry.property.value) {
          throw new Error(`Parameter array elements must have values, but found: ${Util.resourceToString(entry)}`);
        } else {
          return await this.getArgumentValue(entry.property.value, settings);
        }
      }));
      let ret: any[] = [];
      for (const element of elements) {
        if (Array.isArray(element)) {
          ret = ret.concat(element);
        } else {
          ret.push(element);
        }
      }
      return ret;
    }
    if (value.type === 'NamedNode' || value.type === 'BlankNode') {
      if (value.property.value) {
        return await this.getArgumentValue(value.properties.value, settings);
      }
      if (settings.shallow) {
        return {};
      }
      if (value.property.lazy && value.property.lazy.value === 'true') {
        return () => this.instancePool.instantiate(value, settings);
      }
      return await this.instancePool.instantiate(value, settings);
    }
    if (value.type === 'Literal') {
      // ValueRaw can be set in Util.captureType
      // TODO: improve this, so that the hacked valueRaw is not needed
      const rawValue: any = 'valueRaw' in value.term ? (<any> value.term).valueRaw : value.value;
      if (value.property.lazy && value.property.lazy.value === 'true') {
        if (settings.serializations && typeof value.value === 'string') {
          return `new function() { return Promise.resolve('${rawValue}'); }`;
        }
        return () => Promise.resolve(rawValue);
      }
      if (settings.serializations && typeof rawValue === 'string') {
        return `'${rawValue}'`;
      }
      return rawValue;
    }
    throw new Error(`An invalid argument value was found:${Util.resourceToString(value)}`);
  }

  /**
   * Create an array of constructor arguments based on the configured config.
   * @param settings The settings for creating the instance.
   * @returns New instantiations of the provided arguments.
   */
  public async createArguments(settings: ICreationSettingsInner): Promise<any[]> {
    if (this.config.property.arguments) {
      if (!this.config.property.arguments.list) {
        throw new Error(`Detected invalid arguments for component "${Util.resourceIdToString(this.config, this.objectLoader)}": arguments are not an RDF list.`);
      }
      return await Promise.all(this.config.property.arguments.list
        .map((resource: Resource) => resource ? this.getArgumentValue(resource, settings) : undefined));
    }
    return [];
  }

  /**
   * Require the given module iff the module is the current main module.
   * This is done by looking for the nearest package.json.
   * @param moduleState The module state.
   * @param requireName The module name that should be required.
   * @returns {any} The require() result
   */
  public requireCurrentRunningModuleIfCurrent(moduleState: IModuleState, requireName: string): void {
    const pckg = moduleState.packageJsons[moduleState.mainModulePath];
    if (pckg) {
      if (requireName === pckg.name) {
        const mainPath: string = Path.join(moduleState.mainModulePath, pckg.main);
        return require(mainPath);
      }
    }
  }

  /**
   * Get the path to the main module's main entrypoint.
   * @param moduleState The module state.
   * @return {string} The index module path of the current running module (`"main"` entry in package.json).
   */
  protected getCurrentRunningModuleMain(moduleState: IModuleState): string {
    const pckg = moduleState.packageJsons[moduleState.mainModulePath];
    return Path.join(moduleState.mainModulePath, pckg.main);
  }

  /**
   * Instantiate the current config.
   * @param settings The settings for creating the instance.
   * @returns A new instance of the component.
   */
  public async createInstance(settings: ICreationSettingsInner): Promise<any> {
    const serializations: string[] | undefined = settings.serializations;
    let requireName: string = this.config.property.requireName.value;
    requireName = this.overrideRequireNames[requireName] || requireName;
    let object: any = null;
    let resultingRequirePath: string | undefined;
    try {
      object = this.requireCurrentRunningModuleIfCurrent(
        settings.moduleState,
        this.config.property.requireName.value,
      );
      if (!object) {
        throw new Error('Component is not the main module');
      } else if (serializations) {
        resultingRequirePath = `.${Path.sep
        }${Path.relative(settings.moduleState.mainModulePath, this.getCurrentRunningModuleMain(settings.moduleState))}`;
      }
    } catch {
      if (serializations) {
        resultingRequirePath = requireName;
      }
      // Always require relative from main module, because Components.js will in most cases just be dependency.
      object = (<Module>require.main).require(requireName.startsWith('.') ?
        Path.join(process.cwd(), requireName) :
        requireName);
    }

    let serialization = serializations ? `require('${(<string> resultingRequirePath).replace(/\\/gu, '/')}')` : null;

    let subObject;
    if (this.config.property.requireElement) {
      const requireElementPath = this.config.property.requireElement.value.split('.');
      if (serializations) {
        serialization += `.${this.config.property.requireElement.value}`;
      }
      try {
        subObject = requireElementPath.reduce((acc: any, requireElement: string) => acc[requireElement], object);
      } catch {
        throw new Error(`Failed to get module element ${Util.resourceIdToString(this.config.property.requireElement, this.objectLoader)} from module ${requireName}`);
      }
    } else {
      subObject = object;
    }
    if (!subObject) {
      throw new Error(`Failed to get module element ${Util.resourceIdToString(this.config.property.requireElement, this.objectLoader)} from module ${requireName}`);
    }
    object = subObject;
    if (!this.config.property.requireNoConstructor ||
      this.config.property.requireNoConstructor.value !== 'true') {
      if (this.constructable) {
        if (!(object instanceof Function)) {
          throw new Error(`ConstructableComponent is not a function: ${Util.resourceToString(object)
          }\n${Util.resourceToString(this.config)}`);
        }
        const args: any[] = await this.createArguments(settings);
        if (serializations) {
          serialization = `new (${serialization})(${args.map(arg => JSON.stringify(arg, null, '  ').replace(/(^|[^\\])"/gu, '$1')).join(',')})`;
        } else {
          object = new (Function.prototype.bind.apply(object, <[any, ...any]> [{}].concat(args)))();
        }
      }
    }
    if (serializations) {
      const serializationVariableName = Util.uriToVariableName(
        (this.config.property.originalInstance || this.config).value,
      );
      serialization = `const ${serializationVariableName} = ${serialization};`;
      serializations.push(serialization);
      serialization = serializationVariableName;
    }
    return serializations ? serialization : object;
  }
}
