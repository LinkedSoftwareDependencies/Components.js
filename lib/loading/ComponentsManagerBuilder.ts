import * as fs from 'fs';
import type { Resource } from 'rdf-object';
import { RdfObjectLoader } from 'rdf-object';
import type { Logger } from 'winston';
import { createLogger, format, transports } from 'winston';
import { ComponentsManager } from '../ComponentsManager';
import { ConfigConstructorPool } from '../construction/ConfigConstructorPool';
import type { IConfigConstructorPool } from '../construction/IConfigConstructorPool';
import { ConstructionStrategyCommonJs } from '../construction/strategy/ConstructionStrategyCommonJs';
import type { IConstructionStrategy } from '../construction/strategy/IConstructionStrategy';
import { ConfigPreprocessorComponent } from '../preprocess/ConfigPreprocessorComponent';
import { ConfigPreprocessorComponentMapped } from '../preprocess/ConfigPreprocessorComponentMapped';
import { ParameterHandler } from '../preprocess/ParameterHandler';
import type { LogLevel } from '../util/LogLevel';
import { ComponentRegistry } from './ComponentRegistry';
import { ComponentRegistryFinalizer } from './ComponentRegistryFinalizer';
import { ConfigRegistry } from './ConfigRegistry';
import { ModuleStateBuilder } from './ModuleStateBuilder';
import type { IModuleState } from './ModuleStateBuilder';

/**
 * Builds {@link ComponentsManager}'s based on given options.
 */
export class ComponentsManagerBuilder<Instance = any> {
  private readonly mainModulePath: string;
  private readonly componentLoader: (registry: ComponentRegistry) => Promise<void>;
  private readonly configLoader: (registry: ConfigRegistry) => Promise<void>;
  private readonly constructionStrategy: IConstructionStrategy<Instance>;
  private readonly dumpErrorState: boolean;
  private readonly logger: Logger;
  private readonly moduleState?: IModuleState;

  public constructor(options: IComponentsManagerBuilderOptions<Instance>) {
    this.mainModulePath = options.mainModulePath;
    this.componentLoader = options.moduleLoader || (async registry => registry.registerAvailableModules());
    this.configLoader = options.configLoader || (async() => {
      // Do nothing
    });
    this.constructionStrategy = options.constructionStrategy || new ConstructionStrategyCommonJs({ req: require });
    this.dumpErrorState = Boolean(options.dumpErrorState);
    this.logger = ComponentsManagerBuilder.createLogger(options.logLevel);
    this.moduleState = options.moduleState;
  }

  public static createLogger(logLevel: LogLevel = 'warn'): Logger {
    return createLogger({
      level: logLevel,
      format: format.combine(
        format.label({ label: 'Components.js' }),
        format.colorize(),
        format.timestamp(),
        format.printf(({ level: levelInner, message, label: labelInner, timestamp }: Record<string, any>): string =>
          `${timestamp} [${labelInner}] ${levelInner}: ${message}`),
      ),
      transports: [ new transports.Console({
        stderrLevels: [ 'error', 'warn', 'info', 'verbose', 'debug', 'silly' ],
      }) ],
    });
  }

  /**
   * @return A new instance of {@link ComponentsManager}.
   */
  public async build(): Promise<ComponentsManager<Instance>> {
    // Initialize module state
    let moduleState: IModuleState;
    if (this.moduleState) {
      moduleState = this.moduleState;
    } else {
      this.logger.info(`Initiating component discovery from ${this.mainModulePath}`);
      moduleState = await new ModuleStateBuilder(this.logger)
        .buildModuleState(require, this.mainModulePath);
      this.logger.info(`Discovered ${Object.keys(moduleState.componentModules).length} component packages within ${moduleState.nodeModulePaths.length} packages`);
    }

    // Initialize object loader with built-in context
    const objectLoader: RdfObjectLoader = new RdfObjectLoader({
      context: JSON.parse(fs.readFileSync(`${__dirname}/../../components/context.jsonld`, 'utf8')),
    });

    // Load modules
    this.logger.info(`Initiating component loading`);
    const componentResources: Record<string, Resource> = {};
    const componentRegistry = new ComponentRegistry({
      moduleState,
      objectLoader,
      logger: this.logger,
      componentResources,
    });
    await this.componentLoader(componentRegistry);
    const componentFinalizer = new ComponentRegistryFinalizer({
      objectLoader,
      logger: this.logger,
      componentResources,
      componentRegistry,
    });
    componentFinalizer.finalize();
    this.logger.info(`Loaded ${Object.keys(componentResources).length} components`);

    // Load configs
    this.logger.info(`Initiating config loading`);
    const configRegistry = new ConfigRegistry({
      moduleState,
      objectLoader,
      logger: this.logger,
    });
    await this.configLoader(configRegistry);
    this.logger.info(`Loaded configs`);

    // Build constructor pool
    const runTypeConfigs = {};
    const parameterHandler = new ParameterHandler({ objectLoader });
    const configConstructorPool: IConfigConstructorPool<Instance> = new ConfigConstructorPool({
      objectLoader,
      configPreprocessors: [
        new ConfigPreprocessorComponentMapped({
          objectLoader,
          runTypeConfigs,
          componentResources,
          parameterHandler,
          logger: this.logger,
        }),
        new ConfigPreprocessorComponent({
          objectLoader,
          componentResources,
          runTypeConfigs,
          parameterHandler,
          logger: this.logger,
        }),
      ],
      constructionStrategy: this.constructionStrategy,
      moduleState,
    });

    return new ComponentsManager<Instance>({
      moduleState,
      objectLoader,
      componentResources,
      dumpErrorState: this.dumpErrorState,
      configConstructorPool,
      configRegistry,
      logger: this.logger,
    });
  }
}

export interface IComponentsManagerBuilderOptions<Instance> {
  /* ----- REQUIRED FIELDS ----- */
  /**
   * Absolute path to the package root from which module resolution should start.
   */
  mainModulePath: string;

  /* ----- OPTIONAL FIELDS ----- */
  /**
   * Callback for registering components and modules.
   * Defaults to an invocation of {@link ComponentRegistry.registerAvailableModules}.
   * @param registry A registry that accept component and module registrations.
   */
  moduleLoader?: (registry: ComponentRegistry) => Promise<void>;
  /**
   * Callback for registering configurations.
   * Defaults to no config registrations.
   * @param registry A registry that accepts configuration registrations.
   */
  configLoader?: (registry: ConfigRegistry) => Promise<void>;
  /**
   * A strategy for constructing instances.
   * Defaults to {@link ConstructionStrategyCommonJs}.
   */
  constructionStrategy?: IConstructionStrategy<Instance>;
  /**
   * If the error state should be dumped into `componentsjs-error-state.json`
   * after failed instantiations.
   * Defaults to `false`.
   */
  dumpErrorState?: boolean;
  /**
   * The logging level.
   * Defaults to `'warn'`.
   */
  logLevel?: LogLevel;
  /**
   * The module state.
   * Defaults to a newly created instances on the {@link mainModulePath}.
   */
  moduleState?: IModuleState;
}
