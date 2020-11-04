import type { Resource } from 'rdf-object';
import type { Loader } from '../Loader';
import Util = require('../Util');
import type { IComponentFactory, ICreationSettings } from './IComponentFactory';

/**
 * Factory for component definitions of any type.
 */
export class ComponentFactory implements IComponentFactory {
  protected readonly moduleDefinition: Resource | undefined;
  protected readonly componentDefinition: Resource | undefined;
  protected readonly config: Resource;
  protected readonly overrideRequireNames: Record<string, string>;
  protected readonly componentRunner: Loader;

  public constructor(
    moduleDefinition: Resource | undefined,
    componentDefinition: Resource | undefined,
    config: Resource,
    overrideRequireNames: Record<string, string>,
    componentRunner: Loader,
  ) {
    this.moduleDefinition = moduleDefinition;
    this.componentDefinition = componentDefinition;
    this.config = config;
    this.overrideRequireNames = overrideRequireNames;
    this.componentRunner = componentRunner;
  }

  public _getComponentFactory(): IComponentFactory {
    if (this.moduleDefinition &&
      this.componentDefinition &&
      !this.config.property.requireName &&
      !this.config.property.requireElement) {
      const constructable = !this.componentDefinition.isA(Util.DF.namedNode(`${Util.PREFIXES.oo}ComponentInstance`));
      if (!this.componentDefinition.property.constructorArguments) {
        // No constructor arguments, pass arguments manually
        return new (require('./UnmappedNamedComponentFactory').UnmappedNamedComponentFactory)(
          this.moduleDefinition,
          this.componentDefinition,
          this.config,
          constructable,
          this.overrideRequireNames,
          this.componentRunner,
        );
      }

      // Available constructor arguments, map arguments to them
      return new (require('./MappedNamedComponentFactory').MappedNamedComponentFactory)(
        this.moduleDefinition,
        this.componentDefinition,
        this.config,
        constructable,
        this.overrideRequireNames,
        this.componentRunner,
      );
    }

    // No component, construct based on requireName and requireElement
    return new (require('./UnnamedComponentFactory').UnnamedComponentFactory)(this.config,
      !this.config.isA(Util.DF.namedNode(`${Util.PREFIXES.oo}ComponentInstance`)),
      this.overrideRequireNames,
      this.componentRunner);
  }

  public makeArguments(settings?: ICreationSettings): Promise<any[]> {
    return this._getComponentFactory().makeArguments(settings);
  }

  public create(settings?: ICreationSettings): Promise<any> {
    return this._getComponentFactory().create(settings);
  }
}
