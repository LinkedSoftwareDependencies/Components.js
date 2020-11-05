import * as Path from 'path';
import type { Resource } from 'rdf-object';
import { Loader } from '../Loader';
import * as Util from '../Util';
import type { IComponentFactory, ICreationSettings } from './IComponentFactory';
import Dict = NodeJS.Dict;
import Module = NodeJS.Module;

/**
 * Factory for component definitions with explicit arguments.
 */
export class UnnamedComponentFactory implements IComponentFactory {
  protected readonly componentDefinition: Resource;
  protected readonly constructable: boolean;
  protected readonly overrideRequireNames: Dict<string>;
  protected readonly loader: Loader;

  public constructor(
    componentDefinition: Resource,
    constructable: boolean,
    overrideRequireNames: Record<string, string>,
    loader: Loader,
  ) {
    this.componentDefinition = componentDefinition;
    this.constructable = constructable;
    this.overrideRequireNames = overrideRequireNames || {};
    this.loader = loader || new Loader();

    // Validate params
    this.validateParam(this.componentDefinition, 'requireName', 'Literal');
    this.validateParam(this.componentDefinition, 'requireElement', 'Literal', true);
    this.validateParam(this.componentDefinition, 'requireNoConstructor', 'Literal', true);
  }

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

  public static async getArgumentValue(
    value: Resource | Resource[],
    loader: Loader,
    settings: ICreationSettings = {},
  ): Promise<any> {
    if (Array.isArray(value)) {
      // Unwrap unique values out of the array
      if (value[0].property.unique && value[0].property.unique.value === 'true') {
        return UnnamedComponentFactory.getArgumentValue(value[0], loader, settings);
      }
      // Otherwise, keep the array form
      return await Promise.all(value
        .map(element => UnnamedComponentFactory.getArgumentValue(element, loader, settings)));
    }
    // HasFields is a hack for making UnmappedNamedComponentFactory work
    if (value.property.fields || value.property.hasFields) {
      // The parameter is an object
      const entries = await Promise.all(value.properties.fields.map(async(entry: Resource) => {
        if (!entry.property.key) {
          throw new Error(`Parameter object entries must have keys, but found: ${Util.resourceToString(entry)}`);
        }
        if (entry.property.key.type !== 'Literal') {
          throw new Error(`Parameter object keys must be literals, but found type ${entry.property.key.type} for ${Util.resourceIdToString(entry.property.key, loader.objectLoader)} while constructing: ${Util.resourceToString(value)}`);
        }
        if (entry.property.value) {
          const subValue = await UnnamedComponentFactory
            .getArgumentValue(entry.properties.value, loader, settings);
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
          return await UnnamedComponentFactory.getArgumentValue(entry.property.value, loader, settings);
        }
      }));
      let ret: any[] = [];
      elements.forEach(element => {
        if (Array.isArray(element)) {
          ret = ret.concat(element);
        } else {
          ret.push(element);
        }
      });
      return ret;
    }
    if (value.type === 'NamedNode' || value.type === 'BlankNode') {
      if (value.property.value) {
        return await UnnamedComponentFactory.getArgumentValue(value.properties.value, loader, settings);
      }
      if (settings.shallow) {
        return {};
      }
      if (value.property.lazy && value.property.lazy.value === 'true') {
        return () => loader.instantiate(value, settings);
      }
      return await loader.instantiate(value, settings);
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
   * @param settings The settings for creating the instance.
   * @returns New instantiations of the provided arguments.
   */
  public async makeArguments(settings?: ICreationSettings): Promise<any[]> {
    if (this.componentDefinition.property.arguments) {
      if (!this.componentDefinition.property.arguments.list) {
        throw new Error(`Detected invalid arguments for component "${Util.resourceIdToString(this.componentDefinition, this.loader.objectLoader)}": arguments are not an RDF list.`);
      }
      return await Promise.all(this.componentDefinition.property.arguments.list
        .map((resource: Resource) => resource ?
          UnnamedComponentFactory.getArgumentValue(resource, this.loader, settings) :
          undefined));
    }
    return [];
  }

  /**
   * Require a package if the module that was invoked has the given module name.
   * This is done by looking for the nearest package.json.
   * @param requireName The module name that should be required.
   * @returns {any} The require() result
   */
  public requireCurrentRunningModuleIfCurrent(requireName: string): void {
    const path: string = Util.getMainModulePath();
    const pckg: any = Util.getPackageJson(Path.join(path, 'package.json'));
    if (pckg) {
      if (requireName === pckg.name) {
        const mainPath: string = Path.join(path, pckg.main);
        return require(mainPath);
      }
    }
  }

  /**
   * @return {string} The index module path of the current running module.
   * @private
   */
  protected _getCurrentRunningModuleMain(): string {
    const path: string = Util.getMainModulePath();
    const pckg: any = Util.getPackageJson(Path.join(path, 'package.json'));
    return Path.join(path, pckg.main);
  }

  /**
   * @param settings The settings for creating the instance.
   * @returns A new instance of the component.
   */
  public async create(settings?: ICreationSettings): Promise<any> {
    settings = settings || {};
    const serializations: string[] | undefined = settings.serializations;
    let requireName: string = this.componentDefinition.property.requireName.value;
    requireName = this.overrideRequireNames[requireName] || requireName;
    let object: any = null;
    let resultingRequirePath: string | undefined;
    try {
      object = this.requireCurrentRunningModuleIfCurrent(this.componentDefinition.property.requireName.value);
      if (!object) {
        throw new Error('Component is not the main module');
      } else if (serializations) {
        resultingRequirePath = `.${Path.sep
        }${Path.relative(Util.getMainModulePath(), this._getCurrentRunningModuleMain())}`;
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
    if (this.componentDefinition.property.requireElement) {
      const requireElementPath = this.componentDefinition.property.requireElement.value.split('.');
      if (serializations) {
        serialization += `.${this.componentDefinition.property.requireElement.value}`;
      }
      try {
        subObject = requireElementPath.reduce((acc: any, requireElement: string) => acc[requireElement], object);
      } catch {
        throw new Error(`Failed to get module element ${Util.resourceIdToString(this.componentDefinition.property.requireElement, this.loader.objectLoader)} from module ${requireName}`);
      }
    } else {
      subObject = object;
    }
    if (!subObject) {
      throw new Error(`Failed to get module element ${Util.resourceIdToString(this.componentDefinition.property.requireElement, this.loader.objectLoader)} from module ${requireName}`);
    }
    object = subObject;
    if (!this.componentDefinition.property.requireNoConstructor ||
      this.componentDefinition.property.requireNoConstructor.value !== 'true') {
      if (this.constructable) {
        if (!(object instanceof Function)) {
          throw new Error(`ConstructableComponent is not a function: ${Util.resourceToString(object)
          }\n${Util.resourceToString(this.componentDefinition)}`);
        }
        const args: any[] = await this.makeArguments(settings);
        if (serializations) {
          serialization = `new (${serialization})(${args.map(arg => JSON.stringify(arg, null, '  ').replace(/(^|[^\\])"/gu, '$1')).join(',')})`;
        } else {
          object = new (Function.prototype.bind.apply(object, <[any, ...any]> [{}].concat(args)))();
        }
      }
    }
    if (serializations) {
      const serializationVariableName = Util.uriToVariableName(this.componentDefinition.value);
      serialization = `const ${serializationVariableName} = ${serialization};`;
      serializations.push(serialization);
      serialization = serializationVariableName;
    }
    return serializations ? serialization : object;
  }
}
