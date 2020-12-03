import type { IConstructionSettings } from '../../../../lib/construction/IConstructionSettings';
import {
  ConstructionStrategyCommonJsString,
} from '../../../../lib/construction/strategy/ConstructionStrategyCommonJsString';
import type { IModuleState } from '../../../../lib/ModuleStateBuilder';

describe('ConstructionStrategyCommonJsString', () => {
  let requireMain: any;

  let req: NodeJS.Require;
  let moduleState: IModuleState;
  let constructionStrategy: ConstructionStrategyCommonJsString;
  let settings: IConstructionSettings;
  beforeEach(async() => {
    requireMain = {
      a: {
        b: true,
      },
    };

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
    constructionStrategy = new ConstructionStrategyCommonJsString({ req });
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
      })).toEqual(`myinstance`);
      expect(constructionStrategy.lines).toEqual([
        `const myinstance = require('./main.js');`,
      ]);
    });

    it('without requireElement and constructor in the current module with defined require names', () => {
      constructionStrategy = new ConstructionStrategyCommonJsString({ req, overrideRequireNames: {}});
      expect(constructionStrategy.createInstance({
        settings,
        moduleState,
        requireName: 'currentmodule',
        requireElement: undefined,
        callConstructor: false,
        args: [],
        instanceId: 'myinstance',
      })).toEqual(`myinstance`);
      expect(constructionStrategy.lines).toEqual([
        `const myinstance = require('./main.js');`,
      ]);
    });

    it('without requireElement and constructor in the current module overridden require name', () => {
      constructionStrategy = new ConstructionStrategyCommonJsString({
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
      })).toEqual(`myinstance`);
      expect(constructionStrategy.lines).toEqual([
        `const myinstance = require('./main.js');`,
      ]);
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
      })).toEqual(`myinstance`);
      expect(constructionStrategy.lines).toEqual([
        `const myinstance = require('./main.js').a;`,
      ]);
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
      })).toEqual(`myinstance`);
      expect(constructionStrategy.lines).toEqual([
        `const myinstance = require('./main.js').a.b;`,
      ]);
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
      })).toEqual(`myinstance`);
      expect(constructionStrategy.lines).toEqual([
        `const myinstance = require('./main.js').MyClass;`,
      ]);
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
      expect(instance).toEqual(`myinstance`);
      expect(constructionStrategy.lines).toEqual([
        `const myinstance = new (require('./main.js').MyClass)();`,
      ]);
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
      expect(instance).toEqual(`myinstance`);
      expect(constructionStrategy.lines).toEqual([
        `const myinstance = new (require('./main.js').MyClass)(a, b, c);`,
      ]);
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
      })).toEqual(`myinstance`);
      expect(constructionStrategy.lines).toEqual([
        `const myinstance = require('othermodule');`,
      ]);
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
      })).toEqual(`myinstance`);
      expect(constructionStrategy.lines).toEqual([
        `const myinstance = require('othermodule').c.d;`,
      ]);
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
      })).toEqual(`myinstance`);
      expect(constructionStrategy.lines).toEqual([
        `const myinstance = require('./myfile.js');`,
      ]);
    });
  });

  describe('createHash', () => {
    it('for no entries', () => {
      expect(constructionStrategy.createHash({
        settings,
        entries: [],
      })).toEqual(`{}`);
    });

    it('for defined entries', () => {
      expect(constructionStrategy.createHash({
        settings,
        entries: [
          { key: 'a', value: '1' },
          { key: 'b', value: '2' },
          { key: 'c', value: '3' },
        ],
      })).toEqual(`{
  'a': 1,
  'b': 2,
  'c': 3
}`);
    });

    it('for defined and undefined entries', () => {
      expect(constructionStrategy.createHash({
        settings,
        entries: [
          { key: 'a', value: '1' },
          undefined,
          { key: 'c', value: '3' },
        ],
      })).toEqual(`{
  'a': 1,
  'c': 3
}`);
    });

    it('for defined entries with array values', () => {
      expect(constructionStrategy.createHash({
        settings,
        entries: [
          { key: 'a', value: '[\n  a,\n  b\n]' },
        ],
      })).toEqual(`{
  'a': [
  a,
  b
]
}`);
    });
  });

  describe('createArray', () => {
    it('for no elements', () => {
      expect(constructionStrategy.createArray({
        settings,
        elements: [],
      })).toEqual(`[]`);
    });

    it('for elements', () => {
      expect(constructionStrategy.createArray({
        settings,
        elements: [ 'a', 'b' ],
      })).toEqual(`[
  a,
  b
]`);
    });

    it('for string elements', () => {
      expect(constructionStrategy.createArray({
        settings,
        elements: [ '"a"', '"b"' ],
      })).toEqual(`[
  "a",
  "b"
]`);
    });
  });

  describe('createLazySupplier', () => {
    it('for a lazy supplier', async() => {
      const supplier = () => Promise.resolve('a');
      expect(await constructionStrategy.createLazySupplier({
        settings,
        supplier,
      })).toEqual('new function() { return Promise.resolve(a); }');
    });
  });

  describe('createPrimitive', () => {
    it('for a string', () => {
      expect(constructionStrategy.createPrimitive({
        settings,
        value: 'abc',
      })).toEqual(`'abc'`);
    });

    it('for a number', () => {
      expect(constructionStrategy.createPrimitive({
        settings,
        value: 123,
      })).toEqual(`123`);
    });
  });

  describe('getVariableValue', () => {
    it('should throw when asFunction is false', () => {
      expect(() => constructionStrategy.getVariableValue({
        settings,
        variableName: 'varA',
      })).toThrow(new Error(`Detected a variable during config compilation: varA. Variables are not supported, but require the -f flag to expose the compiled config as function.`));
    });

    it('when asFunction is true', () => {
      constructionStrategy = new ConstructionStrategyCommonJsString({ req, asFunction: true });
      expect(constructionStrategy.getVariableValue({
        settings,
        variableName: 'varA',
      })).toEqual(`getVariableValue('varA')`);
    });
  });

  describe('createUndefined', () => {
    it('returns undefined', () => {
      expect(constructionStrategy.createUndefined()).toEqual('undefined');
    });
  });

  describe('uriToVariableName', () => {
    it('should replace #', () => {
      expect(ConstructionStrategyCommonJsString.uriToVariableName('abc#xyz')).toEqual('abc_xyz');
    });

    it('should replace .', () => {
      expect(ConstructionStrategyCommonJsString.uriToVariableName('abc.xyz')).toEqual('abc_xyz');
    });

    it('should replace /', () => {
      expect(ConstructionStrategyCommonJsString.uriToVariableName('abc/xyz')).toEqual('abc_xyz');
    });

    it('should replace :', () => {
      expect(ConstructionStrategyCommonJsString.uriToVariableName('abc:xyz')).toEqual('abc_xyz');
    });

    it('should replace @', () => {
      expect(ConstructionStrategyCommonJsString.uriToVariableName('abc@xyz')).toEqual('abc_xyz');
    });

    it('should replace \\', () => {
      expect(ConstructionStrategyCommonJsString.uriToVariableName('abc\\xyz')).toEqual('abc_xyz');
    });

    it('should replace ^', () => {
      expect(ConstructionStrategyCommonJsString.uriToVariableName('abc^xyz')).toEqual('abc_xyz');
    });

    it('should replace -', () => {
      expect(ConstructionStrategyCommonJsString.uriToVariableName('abc-xyz')).toEqual('abc_xyz');
    });

    it('should handle a complex IRI', () => {
      expect(ConstructionStrategyCommonJsString.uriToVariableName(`https://linkedsoftwaredependencies.org/bundles/npm/%40comunica%2Factor-init-sparql/%5E1.0.0/config/config-default.json#thing`))
        .toEqual(`https___linkedsoftwaredependencies_org_bundles_npm_%40comunica%2Factor_init_sparql_%5E1_0_0_config_config_default_json_thing`);
    });
  });
});
