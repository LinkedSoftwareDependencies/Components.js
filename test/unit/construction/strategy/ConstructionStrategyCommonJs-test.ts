import * as Path from 'path';
import type { IConstructionSettings } from '../../../../lib/construction/IConstructionSettings';
import { ConstructionStrategyCommonJs } from '../../../../lib/construction/strategy/ConstructionStrategyCommonJs';
import type { IModuleState } from '../../../../lib/ModuleStateBuilder';

class MyClass {
  public readonly arg1: string;
  public readonly arg2: string;
  public readonly arg3: string;

  public constructor(arg1: string, arg2: string, arg3: string) {
    this.arg1 = arg1;
    this.arg2 = arg2;
    this.arg3 = arg3;
  }
}

describe('ConstructionStrategyCommonJs', () => {
  let requireMain: any;
  let requireOther: any;
  let requireFile: any;

  let req: NodeJS.Require;
  let moduleState: IModuleState;
  let constructionStrategy: ConstructionStrategyCommonJs;
  let settings: IConstructionSettings;
  beforeEach(async() => {
    requireMain = {
      a: {
        b: true,
      },
      MyClass,
    };
    requireOther = {
      c: {
        d: true,
      },
    };
    requireFile = 'myfile';

    req = <any> ((path: string) => {
      if (path.includes('INVALID')) {
        throw new Error('Invalid require');
      }
      if (path === 'mainmodulepath/main.js') {
        return requireMain;
      }
      if (path === 'mainmodulepath/unknown.js') {
        return;
      }
      return true;
    });
    req.main = <any> {
      require(path: string) {
        if (path === 'othermodule') {
          return requireOther;
        }
        if (Path.join(process.cwd(), 'myfile.js')) {
          return requireFile;
        }
        throw new Error(`Main require not found for ${path}`);
      },
    };
    moduleState = {
      componentModules: {},
      contexts: {},
      importPaths: {},
      mainModulePath: 'mainmodulepath',
      nodeModuleImportPaths: [],
      nodeModulePaths: [],
      packageJsons: {
        mainmodulepath: {
          name: 'currentmodule',
          main: 'main.js',
        },
      },
    };
    constructionStrategy = new ConstructionStrategyCommonJs({ req });
    settings = {};
  });

  describe('createInstance', () => {
    it('without requireElement and constructor in the current module', () => {
      expect(constructionStrategy.createInstance({
        settings,
        moduleState,
        requireName: 'currentmodule',
        requireElement: undefined,
        callConstructor: false,
        args: [],
        instanceId: 'myinstance',
      })).toBe(requireMain);
    });

    it('without requireElement and constructor in the current module with defined require names', () => {
      constructionStrategy = new ConstructionStrategyCommonJs({ req, overrideRequireNames: {}});
      expect(constructionStrategy.createInstance({
        settings,
        moduleState,
        requireName: 'currentmodule',
        requireElement: undefined,
        callConstructor: false,
        args: [],
        instanceId: 'myinstance',
      })).toBe(requireMain);
    });

    it('without requireElement and constructor in the current module overridden require name', () => {
      constructionStrategy = new ConstructionStrategyCommonJs({
        req,
        overrideRequireNames: { mainalias: 'currentmodule' },
      });
      expect(constructionStrategy.createInstance({
        settings,
        moduleState,
        requireName: 'mainalias',
        requireElement: undefined,
        callConstructor: false,
        args: [],
        instanceId: 'myinstance',
      })).toBe(requireMain);
    });

    it('with requireElement of length 1 and without constructor in the current module', () => {
      expect(constructionStrategy.createInstance({
        settings,
        moduleState,
        requireName: 'currentmodule',
        requireElement: 'a',
        callConstructor: false,
        args: [],
        instanceId: 'myinstance',
      })).toBe(requireMain.a);
    });

    it('with requireElement of length 2 and without constructor in the current module', () => {
      expect(constructionStrategy.createInstance({
        settings,
        moduleState,
        requireName: 'currentmodule',
        requireElement: 'a.b',
        callConstructor: false,
        args: [],
        instanceId: 'myinstance',
      })).toBe(requireMain.a.b);
    });

    it('with invalid initial requireElement and without constructor in the current module', () => {
      expect(() => constructionStrategy.createInstance({
        settings,
        moduleState,
        requireName: 'currentmodule',
        requireElement: 'X.b',
        callConstructor: false,
        args: [],
        instanceId: 'myinstance',
      })).toThrow(new Error('Failed to get module element X.b from module currentmodule'));
    });

    it('with invalid trailing requireElement and without constructor in the current module', () => {
      expect(() => constructionStrategy.createInstance({
        settings,
        moduleState,
        requireName: 'currentmodule',
        requireElement: 'a.X',
        callConstructor: false,
        args: [],
        instanceId: 'myinstance',
      })).toThrow(new Error('Failed to get module element a.X from module currentmodule'));
    });

    it('without requireElement and constructor in another module with undefined req.main should throw', () => {
      req.main = undefined;
      expect(() => constructionStrategy.createInstance({
        settings,
        moduleState,
        requireName: 'othermodule',
        requireElement: undefined,
        callConstructor: false,
        args: [],
        instanceId: 'myinstance',
      })).toThrow(new Error(`Corrupt Node.js state: Could not find a main module.`));
    });

    it('with requireElement to class and without constructor in the current module', () => {
      expect(constructionStrategy.createInstance({
        settings,
        moduleState,
        requireName: 'currentmodule',
        requireElement: 'MyClass',
        callConstructor: false,
        args: [],
        instanceId: 'myinstance',
      })).toBe(requireMain.MyClass);
    });

    it('with requireElement to non-class and with constructor in the current module should thrown', () => {
      expect(() => constructionStrategy.createInstance({
        settings,
        moduleState,
        requireName: 'currentmodule',
        requireElement: 'a',
        callConstructor: true,
        args: [],
        instanceId: 'myinstance',
      })).toThrow(new Error('Attempted to construct a from module currentmodule that does not have a constructor'));
    });

    it('with requireElement to class and with constructor in the current module', () => {
      const instance = constructionStrategy.createInstance({
        settings,
        moduleState,
        requireName: 'currentmodule',
        requireElement: 'MyClass',
        callConstructor: true,
        args: [],
        instanceId: 'myinstance',
      });
      expect(instance).toBeInstanceOf(MyClass);
      expect(instance.arg1).toBeUndefined();
      expect(instance.arg2).toBeUndefined();
      expect(instance.arg3).toBeUndefined();
    });

    it('with requireElement to class and with constructor and args in the current module', () => {
      const instance = constructionStrategy.createInstance({
        settings,
        moduleState,
        requireName: 'currentmodule',
        requireElement: 'MyClass',
        callConstructor: true,
        args: [ 'a', 'b', 'c' ],
        instanceId: 'myinstance',
      });
      expect(instance).toBeInstanceOf(MyClass);
      expect(instance.arg1).toEqual('a');
      expect(instance.arg2).toEqual('b');
      expect(instance.arg3).toEqual('c');
    });

    it('without requireElement and without constructor in another module', () => {
      expect(constructionStrategy.createInstance({
        settings,
        moduleState,
        requireName: 'othermodule',
        requireElement: undefined,
        callConstructor: false,
        args: [],
        instanceId: 'myinstance',
      })).toBe(requireOther);
    });

    it('with requireElement and without constructor in another module', () => {
      expect(constructionStrategy.createInstance({
        settings,
        moduleState,
        requireName: 'othermodule',
        requireElement: 'c.d',
        callConstructor: false,
        args: [],
        instanceId: 'myinstance',
      })).toBe(requireOther.c.d);
    });

    it('without requireElement and without constructor in a relative file', () => {
      expect(constructionStrategy.createInstance({
        settings,
        moduleState,
        requireName: './myfile.js',
        requireElement: undefined,
        callConstructor: false,
        args: [],
        instanceId: 'myinstance',
      })).toBe(requireFile);
    });
  });

  describe('requireCurrentRunningModuleIfCurrent', () => {
    it('for the current module should require its main entry', () => {
      expect(constructionStrategy.requireCurrentRunningModuleIfCurrent(moduleState, 'currentmodule'))
        .toBe(requireMain);
    });

    it('for an unknown package should throw', () => {
      expect(() => constructionStrategy.requireCurrentRunningModuleIfCurrent(moduleState, 'unknownmodule'))
        .toThrow(new Error('Component is not the main module'));
    });

    it('for a main module path pointing to unknown package should throw', () => {
      moduleState = {
        componentModules: {},
        contexts: {},
        importPaths: {},
        mainModulePath: 'mainmodulepath',
        nodeModuleImportPaths: [],
        nodeModulePaths: [],
        packageJsons: {
          differentmodulepath: {
            name: 'differentmodule',
            main: 'main.js',
          },
        },
      };
      expect(() => constructionStrategy.requireCurrentRunningModuleIfCurrent(moduleState, 'currentmodule'))
        .toThrow(new Error('Component is not the main module'));
    });

    it('for a different package should throw', () => {
      moduleState = {
        componentModules: {},
        contexts: {},
        importPaths: {},
        mainModulePath: 'differentmodulepath',
        nodeModuleImportPaths: [],
        nodeModulePaths: [],
        packageJsons: {
          differentmodulepath: {
            name: 'differentmodule',
            main: 'main.js',
          },
        },
      };
      expect(() => constructionStrategy.requireCurrentRunningModuleIfCurrent(moduleState, 'currentmodule'))
        .toThrow(new Error('Component is not the main module'));
    });

    it('for an invalid main should throw', () => {
      moduleState = {
        componentModules: {},
        contexts: {},
        importPaths: {},
        mainModulePath: 'mainmodulepath',
        nodeModuleImportPaths: [],
        nodeModulePaths: [],
        packageJsons: {
          mainmodulepath: {
            name: 'currentmodule',
            main: 'unknown.js',
          },
        },
      };
      expect(() => constructionStrategy.requireCurrentRunningModuleIfCurrent(moduleState, 'currentmodule'))
        .toThrow(new Error('Component is not the main module'));
    });
  });

  describe('createHash', () => {
    it('for no entries', () => {
      expect(constructionStrategy.createHash({
        settings,
        entries: [],
      })).toEqual({});
    });

    it('for defined entries', () => {
      expect(constructionStrategy.createHash({
        settings,
        entries: [
          { key: 'a', value: '1' },
          { key: 'b', value: '2' },
          { key: 'c', value: '3' },
        ],
      })).toEqual({
        a: '1',
        b: '2',
        c: '3',
      });
    });

    it('for defined and undefined entries', () => {
      expect(constructionStrategy.createHash({
        settings,
        entries: [
          { key: 'a', value: '1' },
          undefined,
          { key: 'c', value: '3' },
        ],
      })).toEqual({
        a: '1',
        c: '3',
      });
    });
  });

  describe('createArray', () => {
    it('for no elements', () => {
      expect(constructionStrategy.createArray({
        settings,
        elements: [],
      })).toEqual([]);
    });

    it('for elements', () => {
      expect(constructionStrategy.createArray({
        settings,
        elements: [ 'a', 'b' ],
      })).toEqual([ 'a', 'b' ]);
    });
  });

  describe('createLazySupplier', () => {
    it('for a lazy supplier', async() => {
      const supplier = () => Promise.resolve('a');
      expect(await constructionStrategy.createLazySupplier({
        settings,
        supplier,
      })).toBe(supplier);
    });
  });

  describe('createPrimitive', () => {
    it('for a string', () => {
      expect(constructionStrategy.createPrimitive({
        settings,
        value: 'abc',
      })).toEqual('abc');
    });

    it('for a number', () => {
      expect(constructionStrategy.createPrimitive({
        settings,
        value: 123,
      })).toEqual(123);
    });
  });

  describe('getVariableValue', () => {
    it('for no variables should throw', () => {
      expect(() => constructionStrategy.getVariableValue({
        settings,
        variableName: 'varA',
      })).toThrow(new Error(`Undefined variable: varA`));
    });

    it('for an undefined variable should throw', () => {
      settings.variables = {
        varB: 123,
      };
      expect(() => constructionStrategy.getVariableValue({
        settings,
        variableName: 'varA',
      })).toThrow(new Error(`Undefined variable: varA`));
    });

    it('for a defined variable', () => {
      settings.variables = {
        varA: 123,
      };
      expect(constructionStrategy.getVariableValue({
        settings,
        variableName: 'varA',
      })).toEqual(123);
    });
  });

  describe('createUndefined', () => {
    it('returns undefined', () => {
      expect(constructionStrategy.createUndefined()).toBeUndefined();
    });
  });
});
