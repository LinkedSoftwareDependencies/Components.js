import * as fs from 'fs';
import { mocked } from 'jest-mock';
import type { Resource } from 'rdf-object';
import { RdfObjectLoader } from 'rdf-object';
import type { Logger } from 'winston';
import { ComponentsManager } from '../../../lib/ComponentsManager';
import type { IConfigConstructorPool } from '../../../lib/construction/IConfigConstructorPool';
import { ConfigRegistry } from '../../../lib/loading/ConfigRegistry';
import type { IModuleState } from '../../../lib/loading/ModuleStateBuilder';
import { ErrorResourcesContext } from '../../../lib/util/ErrorResourcesContext';

jest.mock('fs', () => ({
  __esModule: true, // this property makes it work
  ...jest.requireActual('fs')
}));
jest.spyOn(fs, 'writeFileSync');
mocked(fs.writeFileSync).mockReturnValue();
jest.mock('../../../lib/loading/ComponentsManagerBuilder', () => ({
  // eslint-disable-next-line object-shorthand
  ComponentsManagerBuilder: function(args: any) {
    return {
      build: jest.fn(() => ({
        type: 'INSTANCE',
        args,
      })),
    };
  },
}));

describe('ComponentsManager', () => {
  let mainModulePath: string;
  let moduleState: IModuleState;
  let objectLoader: RdfObjectLoader;
  let componentResources: Record<string, Resource>;
  let configRegistry: ConfigRegistry;
  let dumpErrorState: boolean;
  let configConstructorPool: IConfigConstructorPool<any>;
  let logger: Logger;
  let componentsManager: ComponentsManager<any>;
  beforeEach(() => {
    mainModulePath = __dirname;
    moduleState = <any> {
      mainModulePath,
      componentModules: {
        A: `${__dirname}/../../assets/module.jsonld`,
      },
      nodeModulePaths: [],
    };
    objectLoader = new RdfObjectLoader({
      uniqueLiterals: true,
      context: JSON.parse(fs.readFileSync(`${__dirname}/../../../components/context.jsonld`, 'utf8')),
    });
    componentResources = {};
    logger = <any> {
      warn: jest.fn(),
      error: jest.fn(),
    };
    configRegistry = new ConfigRegistry({
      moduleState,
      objectLoader,
      logger,
      skipContextValidation: false,
      remoteContextLookups: false,
    });
    dumpErrorState = false;
    configConstructorPool = <any> {
      instantiate: jest.fn(() => 'INSTANCE'),
      getInstanceRegistry: jest.fn(() => ({
        'http://example.org/myconfig': 'INSTANCE',
      })),
    };
    componentsManager = new ComponentsManager({
      moduleState,
      objectLoader,
      componentResources,
      configRegistry,
      dumpErrorState,
      configConstructorPool,
      logger,
    });
  });

  describe('build', () => {
    it('should pass options to the builder', async() => {
      expect(await ComponentsManager.build({ mainModulePath: 'MMP' }))
        .toEqual({
          type: 'INSTANCE',
          args: { mainModulePath: 'MMP' },
        });
    });
  });

  describe('instantiate', () => {
    it('should throw for a non-registered config', async() => {
      await expect(componentsManager.instantiate('ex:not:registered'))
        .rejects.toThrow('No config instance with IRI ex:not:registered has been registered');
      expect(fs.writeFileSync).not.toHaveBeenCalled();
    });

    it('should throw for a non-registered config and dump log', async() => {
      componentsManager = new ComponentsManager({
        moduleState,
        objectLoader,
        componentResources,
        configRegistry,
        dumpErrorState: true,
        configConstructorPool,
        logger,
      });
      await expect(componentsManager.instantiate('ex:not:registered'))
        .rejects.toThrow('No config instance with IRI ex:not:registered has been registered');
      expect(fs.writeFileSync).toHaveBeenCalledWith('componentsjs-error-state.json', JSON.stringify({
        componentTypes: [],
        moduleState: {
          mainModulePath,
          componentModules: {
            A: `${mainModulePath}/../../assets/module.jsonld`,
          },
          nodeModulePaths: [],
        },
      }, null, '  '), 'utf8');
      expect(logger.error).toHaveBeenCalledWith(`Detected fatal error. Generated 'componentsjs-error-state.json' with more information.`);
    });

    it('should instantiate an existing config without options', async() => {
      await componentsManager.configRegistry.register(`${__dirname}/../../assets/config.jsonld`);
      expect(await componentsManager.instantiate('http://example.org/myconfig')).toEqual('INSTANCE');
      expect(configConstructorPool.instantiate).toHaveBeenCalledWith(
        componentsManager.objectLoader.resources['http://example.org/myconfig'],
        {},
      );
    });

    it('should instantiate an existing config with options', async() => {
      await componentsManager.configRegistry.register(`${__dirname}/../../assets/config.jsonld`);
      expect(await componentsManager.instantiate('http://example.org/myconfig', { variables: { a: 1 }}))
        .toEqual('INSTANCE');
      expect(configConstructorPool.instantiate).toHaveBeenCalledWith(
        componentsManager.objectLoader.resources['http://example.org/myconfig'],
        { variables: { a: 1 }},
      );
    });
  });

  describe('getInstantiatedResources', () => {
    it('should return an array of instantiated Resources', async() => {
      await componentsManager.configRegistry.register(`${__dirname}/../../assets/config.jsonld`);
      expect(componentsManager.getInstantiatedResources()).toHaveLength(1);
    });
  });

  describe('generateErrorLog', () => {
    it('should export the context for an ErrorResourcesContext', () => {
      componentsManager = new ComponentsManager({
        moduleState,
        objectLoader,
        componentResources,
        configRegistry,
        dumpErrorState: true,
        configConstructorPool,
        logger,
      });
      (<any> componentsManager).generateErrorLog(new ErrorResourcesContext('test', { a: 'b' }));
      expect(fs.writeFileSync).toHaveBeenCalledWith('componentsjs-error-state.json', JSON.stringify({
        a: 'b',
        componentTypes: [],
        moduleState: {
          mainModulePath,
          componentModules: {
            A: `${mainModulePath}/../../assets/module.jsonld`,
          },
          nodeModulePaths: [],
        },
      }, null, '  '), 'utf8');
      expect(logger.error).toHaveBeenCalledWith(`Detected fatal error. Generated 'componentsjs-error-state.json' with more information.`);
    });
  });
});
