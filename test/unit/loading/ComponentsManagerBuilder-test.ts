import { RdfObjectLoader } from 'rdf-object';
import { createLogger } from 'winston';
import { ConfigConstructorPool } from '../../../lib/construction/ConfigConstructorPool';
import { ConstructionStrategyCommonJs } from '../../../lib/construction/strategy/ConstructionStrategyCommonJs';
import {
  ConstructionStrategyCommonJsString,
} from '../../../lib/construction/strategy/ConstructionStrategyCommonJsString';
import { ComponentsManagerBuilder } from '../../../lib/loading/ComponentsManagerBuilder';
import { ConfigRegistry } from '../../../lib/loading/ConfigRegistry';
import { ConfigPreprocessorComponent } from '../../../lib/preprocess/ConfigPreprocessorComponent';
import { ConfigPreprocessorComponentMapped } from '../../../lib/preprocess/ConfigPreprocessorComponentMapped';
import { ConfigPreprocessorOverride } from '../../../lib/preprocess/ConfigPreprocessorOverride';

const mainModulePath = __dirname;
jest.mock('winston', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    log: jest.fn(),
  })),
  format: {
    label: jest.fn(),
    colorize: jest.fn(),
    timestamp: jest.fn(),
    printf: jest.fn(cb => {
      cb({ level: 'L', message: 'M', label: 'L', timestamp: 'T' });
    }),
    combine: jest.fn(),
  },
  transports: {
    Console: jest.fn(),
  },
}));
const dummyModuleState = {
  mainModulePath,
  componentModules: {
    A: {
      1: `${__dirname}/../../assets/module.jsonld`,
    },
  },
  nodeModulePaths: [],
};
jest.mock('../../../lib/loading/ModuleStateBuilder', () => ({
  // eslint-disable-next-line object-shorthand
  ModuleStateBuilder: function() {
    return {
      buildModuleState: jest.fn(() => dummyModuleState),
    };
  },
}));

describe('ComponentsManagerBuilder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should build with default options', async() => {
    const componentsManagerBuilder = new ComponentsManagerBuilder({
      mainModulePath,
    });
    const mgr = await componentsManagerBuilder.build();

    expect(mgr).toBeTruthy();
    expect(mgr.moduleState).toBe(dummyModuleState);
    expect(mgr.objectLoader).toBeInstanceOf(RdfObjectLoader);
    expect(Object.keys(mgr.componentResources).length).toBe(2);
    expect(Object.keys(mgr.componentResources)
      .includes('http://example.org/HelloWorldModule#SayHelloComponent')).toBeTruthy();
    expect(Object.keys(mgr.componentResources)
      .includes('http://example.org/HelloWorldModule#SayHelloComponentNested')).toBeTruthy();
    expect(mgr.configRegistry).toBeInstanceOf(ConfigRegistry);
    expect(mgr.dumpErrorState).toBe(true);
    expect(mgr.configConstructorPool).toBeInstanceOf(ConfigConstructorPool);
    expect((<any> mgr.configConstructorPool).constructionStrategy).toBeInstanceOf(ConstructionStrategyCommonJs);
    expect((<any> mgr.configConstructorPool).configPreprocessors.length).toBe(3);
    expect((<any> mgr.configConstructorPool).configPreprocessors[0]).toBeInstanceOf(ConfigPreprocessorOverride);
    expect((<any> mgr.configConstructorPool).configPreprocessors[1]).toBeInstanceOf(ConfigPreprocessorComponentMapped);
    expect((<any> mgr.configConstructorPool).configPreprocessors[2]).toBeInstanceOf(ConfigPreprocessorComponent);
    expect(mgr.logger).toBeTruthy();
    expect(createLogger).toHaveBeenCalledWith({
      level: 'warn',
      transports: expect.anything(),
    });
  });

  it('should build with custom empty moduleLoader', async() => {
    const moduleLoader = jest.fn();
    const componentsManagerBuilder = new ComponentsManagerBuilder({
      mainModulePath,
      moduleLoader,
    });
    const mgr = await componentsManagerBuilder.build();

    expect(mgr).toBeTruthy();
    expect(mgr.moduleState).toBe(dummyModuleState);
    expect(mgr.objectLoader).toBeInstanceOf(RdfObjectLoader);
    expect(Object.keys(mgr.componentResources).length).toBe(0);
    expect(mgr.configRegistry).toBeInstanceOf(ConfigRegistry);
    expect(mgr.dumpErrorState).toBe(true);
    expect(mgr.configConstructorPool).toBeInstanceOf(ConfigConstructorPool);
    expect((<any> mgr.configConstructorPool).constructionStrategy).toBeInstanceOf(ConstructionStrategyCommonJs);
    expect((<any> mgr.configConstructorPool).configPreprocessors.length).toBe(3);
    expect((<any> mgr.configConstructorPool).configPreprocessors[0]).toBeInstanceOf(ConfigPreprocessorOverride);
    expect((<any> mgr.configConstructorPool).configPreprocessors[1]).toBeInstanceOf(ConfigPreprocessorComponentMapped);
    expect((<any> mgr.configConstructorPool).configPreprocessors[2]).toBeInstanceOf(ConfigPreprocessorComponent);
    expect(mgr.logger).toBeTruthy();
    expect(createLogger).toHaveBeenCalledWith({
      level: 'warn',
      transports: expect.anything(),
    });
  });

  it('should build with custom non-empty moduleLoader', async() => {
    const moduleLoader = jest.fn(async registry => {
      await registry.registerModule(`${__dirname}/../../assets/module.jsonld`);
    });
    const componentsManagerBuilder = new ComponentsManagerBuilder({
      mainModulePath,
      moduleLoader,
    });
    const mgr = await componentsManagerBuilder.build();

    expect(mgr).toBeTruthy();
    expect(mgr.moduleState).toBe(dummyModuleState);
    expect(mgr.objectLoader).toBeInstanceOf(RdfObjectLoader);
    expect(Object.keys(mgr.componentResources).length).toBe(2);
    expect(Object.keys(mgr.componentResources)
      .includes('http://example.org/HelloWorldModule#SayHelloComponent')).toBeTruthy();
    expect(Object.keys(mgr.componentResources)
      .includes('http://example.org/HelloWorldModule#SayHelloComponentNested')).toBeTruthy();
    expect(mgr.configRegistry).toBeInstanceOf(ConfigRegistry);
    expect(mgr.dumpErrorState).toBe(true);
    expect(mgr.configConstructorPool).toBeInstanceOf(ConfigConstructorPool);
    expect((<any> mgr.configConstructorPool).constructionStrategy).toBeInstanceOf(ConstructionStrategyCommonJs);
    expect((<any> mgr.configConstructorPool).configPreprocessors.length).toBe(3);
    expect((<any> mgr.configConstructorPool).configPreprocessors[0]).toBeInstanceOf(ConfigPreprocessorOverride);
    expect((<any> mgr.configConstructorPool).configPreprocessors[1]).toBeInstanceOf(ConfigPreprocessorComponentMapped);
    expect((<any> mgr.configConstructorPool).configPreprocessors[2]).toBeInstanceOf(ConfigPreprocessorComponent);
    expect(mgr.logger).toBeTruthy();
    expect(createLogger).toHaveBeenCalledWith({
      level: 'warn',
      transports: expect.anything(),
    });
  });

  it('should build with custom configLoader', async() => {
    const configLoader = jest.fn(async configRegistry => {
      await configRegistry.register(`${__dirname}/../../assets/config.jsonld`);
    });
    const componentsManagerBuilder = new ComponentsManagerBuilder({
      mainModulePath,
      configLoader,
    });
    const mgr = await componentsManagerBuilder.build();

    expect(mgr).toBeTruthy();
    expect(mgr.moduleState).toBe(dummyModuleState);
    expect(mgr.objectLoader).toBeInstanceOf(RdfObjectLoader);
    expect(Object.keys(mgr.componentResources).length).toBe(2);
    expect(mgr.configRegistry).toBeInstanceOf(ConfigRegistry);
    expect(Object.keys(mgr.objectLoader.resources)
      .includes('http://example.org/myconfig')).toBeTruthy();
    expect(mgr.dumpErrorState).toBe(true);
    expect(mgr.configConstructorPool).toBeInstanceOf(ConfigConstructorPool);
    expect((<any> mgr.configConstructorPool).constructionStrategy).toBeInstanceOf(ConstructionStrategyCommonJs);
    expect((<any> mgr.configConstructorPool).configPreprocessors.length).toBe(3);
    expect((<any> mgr.configConstructorPool).configPreprocessors[0]).toBeInstanceOf(ConfigPreprocessorOverride);
    expect((<any> mgr.configConstructorPool).configPreprocessors[1]).toBeInstanceOf(ConfigPreprocessorComponentMapped);
    expect((<any> mgr.configConstructorPool).configPreprocessors[2]).toBeInstanceOf(ConfigPreprocessorComponent);
    expect(mgr.logger).toBeTruthy();
    expect(createLogger).toHaveBeenCalledWith({
      level: 'warn',
      transports: expect.anything(),
    });
  });

  it('should build with custom constructionStrategy', async() => {
    const constructionStrategy = new ConstructionStrategyCommonJsString({ req: require });
    const componentsManagerBuilder = new ComponentsManagerBuilder({
      mainModulePath,
      constructionStrategy,
    });
    const mgr = await componentsManagerBuilder.build();

    expect(mgr).toBeTruthy();
    expect(mgr.moduleState).toBe(dummyModuleState);
    expect(mgr.objectLoader).toBeInstanceOf(RdfObjectLoader);
    expect(Object.keys(mgr.componentResources).length).toBe(2);
    expect(mgr.configRegistry).toBeInstanceOf(ConfigRegistry);
    expect(mgr.dumpErrorState).toBe(true);
    expect(mgr.configConstructorPool).toBeInstanceOf(ConfigConstructorPool);
    expect((<any> mgr.configConstructorPool).constructionStrategy).toBe(constructionStrategy);
    expect((<any> mgr.configConstructorPool).configPreprocessors.length).toBe(3);
    expect((<any> mgr.configConstructorPool).configPreprocessors[0]).toBeInstanceOf(ConfigPreprocessorOverride);
    expect((<any> mgr.configConstructorPool).configPreprocessors[1]).toBeInstanceOf(ConfigPreprocessorComponentMapped);
    expect((<any> mgr.configConstructorPool).configPreprocessors[2]).toBeInstanceOf(ConfigPreprocessorComponent);
    expect(mgr.logger).toBeTruthy();
    expect(createLogger).toHaveBeenCalledWith({
      level: 'warn',
      transports: expect.anything(),
    });
  });

  it('should build with true dumpErrorState', async() => {
    const componentsManagerBuilder = new ComponentsManagerBuilder({
      mainModulePath,
      dumpErrorState: true,
    });
    const mgr = await componentsManagerBuilder.build();

    expect(mgr).toBeTruthy();
    expect(mgr.moduleState).toBe(dummyModuleState);
    expect(mgr.objectLoader).toBeInstanceOf(RdfObjectLoader);
    expect(Object.keys(mgr.componentResources).length).toBe(2);
    expect(mgr.configRegistry).toBeInstanceOf(ConfigRegistry);
    expect(mgr.dumpErrorState).toBe(true);
    expect(mgr.configConstructorPool).toBeInstanceOf(ConfigConstructorPool);
    expect((<any> mgr.configConstructorPool).constructionStrategy).toBeInstanceOf(ConstructionStrategyCommonJs);
    expect((<any> mgr.configConstructorPool).configPreprocessors.length).toBe(3);
    expect((<any> mgr.configConstructorPool).configPreprocessors[0]).toBeInstanceOf(ConfigPreprocessorOverride);
    expect((<any> mgr.configConstructorPool).configPreprocessors[1]).toBeInstanceOf(ConfigPreprocessorComponentMapped);
    expect((<any> mgr.configConstructorPool).configPreprocessors[2]).toBeInstanceOf(ConfigPreprocessorComponent);
    expect(mgr.logger).toBeTruthy();
    expect(createLogger).toHaveBeenCalledWith({
      level: 'warn',
      transports: expect.anything(),
    });
  });

  it('should build with false dumpErrorState', async() => {
    const componentsManagerBuilder = new ComponentsManagerBuilder({
      mainModulePath,
      dumpErrorState: false,
    });
    const mgr = await componentsManagerBuilder.build();

    expect(mgr).toBeTruthy();
    expect(mgr.moduleState).toBe(dummyModuleState);
    expect(mgr.objectLoader).toBeInstanceOf(RdfObjectLoader);
    expect(Object.keys(mgr.componentResources).length).toBe(2);
    expect(mgr.configRegistry).toBeInstanceOf(ConfigRegistry);
    expect(mgr.dumpErrorState).toBe(false);
    expect(mgr.configConstructorPool).toBeInstanceOf(ConfigConstructorPool);
    expect((<any> mgr.configConstructorPool).constructionStrategy).toBeInstanceOf(ConstructionStrategyCommonJs);
    expect((<any> mgr.configConstructorPool).configPreprocessors.length).toBe(3);
    expect((<any> mgr.configConstructorPool).configPreprocessors[0]).toBeInstanceOf(ConfigPreprocessorOverride);
    expect((<any> mgr.configConstructorPool).configPreprocessors[1]).toBeInstanceOf(ConfigPreprocessorComponentMapped);
    expect((<any> mgr.configConstructorPool).configPreprocessors[2]).toBeInstanceOf(ConfigPreprocessorComponent);
    expect(mgr.logger).toBeTruthy();
    expect(createLogger).toHaveBeenCalledWith({
      level: 'warn',
      transports: expect.anything(),
    });
  });

  it('should build with custom logLevel', async() => {
    const componentsManagerBuilder = new ComponentsManagerBuilder({
      mainModulePath,
      logLevel: 'info',
    });
    const mgr = await componentsManagerBuilder.build();

    expect(mgr).toBeTruthy();
    expect(mgr.moduleState).toBe(dummyModuleState);
    expect(mgr.objectLoader).toBeInstanceOf(RdfObjectLoader);
    expect(Object.keys(mgr.componentResources).length).toBe(2);
    expect(mgr.configRegistry).toBeInstanceOf(ConfigRegistry);
    expect(mgr.dumpErrorState).toBe(true);
    expect(mgr.configConstructorPool).toBeInstanceOf(ConfigConstructorPool);
    expect((<any> mgr.configConstructorPool).constructionStrategy).toBeInstanceOf(ConstructionStrategyCommonJs);
    expect((<any> mgr.configConstructorPool).configPreprocessors.length).toBe(3);
    expect((<any> mgr.configConstructorPool).configPreprocessors[0]).toBeInstanceOf(ConfigPreprocessorOverride);
    expect((<any> mgr.configConstructorPool).configPreprocessors[1]).toBeInstanceOf(ConfigPreprocessorComponentMapped);
    expect((<any> mgr.configConstructorPool).configPreprocessors[2]).toBeInstanceOf(ConfigPreprocessorComponent);
    expect(mgr.logger).toBeTruthy();
    expect(createLogger).toBeCalledTimes(1);
    expect(createLogger).toHaveBeenCalledWith({
      level: 'info',
      transports: expect.anything(),
    });
  });

  it('should build with custom moduleState', async() => {
    const customModuleState = <any> {
      mainModulePath,
      componentModules: {
        B: {
          1: `${__dirname}/../../assets/module.jsonld`,
        },
      },
      nodeModulePaths: [],
    };
    const componentsManagerBuilder = new ComponentsManagerBuilder({
      mainModulePath,
      moduleState: customModuleState,
    });
    const mgr = await componentsManagerBuilder.build();

    expect(mgr).toBeTruthy();
    expect(mgr.moduleState).toBe(customModuleState);
    expect(mgr.objectLoader).toBeInstanceOf(RdfObjectLoader);
    expect(Object.keys(mgr.componentResources).length).toBe(2);
    expect(mgr.configRegistry).toBeInstanceOf(ConfigRegistry);
    expect(mgr.dumpErrorState).toBe(true);
    expect(mgr.configConstructorPool).toBeInstanceOf(ConfigConstructorPool);
    expect((<any> mgr.configConstructorPool).constructionStrategy).toBeInstanceOf(ConstructionStrategyCommonJs);
    expect((<any> mgr.configConstructorPool).configPreprocessors.length).toBe(3);
    expect((<any> mgr.configConstructorPool).configPreprocessors[0]).toBeInstanceOf(ConfigPreprocessorOverride);
    expect((<any> mgr.configConstructorPool).configPreprocessors[1]).toBeInstanceOf(ConfigPreprocessorComponentMapped);
    expect((<any> mgr.configConstructorPool).configPreprocessors[2]).toBeInstanceOf(ConfigPreprocessorComponent);
    expect(mgr.logger).toBeTruthy();
    expect(createLogger).toBeCalledTimes(1);
    expect(createLogger).toHaveBeenCalledWith({
      level: 'warn',
      transports: expect.anything(),
    });
  });

  it('should build with false typeChecking', async() => {
    const componentsManagerBuilder = new ComponentsManagerBuilder({
      mainModulePath,
      typeChecking: false,
    });
    const mgr = await componentsManagerBuilder.build();

    expect(mgr).toBeTruthy();
    expect(mgr.moduleState).toBe(dummyModuleState);
    expect(mgr.objectLoader).toBeInstanceOf(RdfObjectLoader);
    expect(Object.keys(mgr.componentResources).length).toBe(2);
    expect(mgr.configRegistry).toBeInstanceOf(ConfigRegistry);
    expect(mgr.dumpErrorState).toBe(true);
    expect(mgr.configConstructorPool).toBeInstanceOf(ConfigConstructorPool);
    expect((<any> mgr.configConstructorPool).constructionStrategy).toBeInstanceOf(ConstructionStrategyCommonJs);
    expect((<any> mgr.configConstructorPool).configPreprocessors.length).toBe(3);
    expect((<any> mgr.configConstructorPool).configPreprocessors[0]).toBeInstanceOf(ConfigPreprocessorOverride);
    expect((<any> mgr.configConstructorPool).configPreprocessors[1]).toBeInstanceOf(ConfigPreprocessorComponentMapped);
    expect((<any> mgr.configConstructorPool).configPreprocessors[2]).toBeInstanceOf(ConfigPreprocessorComponent);
    expect(mgr.logger).toBeTruthy();
    expect(createLogger).toBeCalledTimes(1);
    expect(createLogger).toHaveBeenCalledWith({
      level: 'warn',
      transports: expect.anything(),
    });
  });
});
