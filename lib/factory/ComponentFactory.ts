import type { ComponentFactoryOptions } from './ComponentFactoryOptions';
import type { IComponentFactory, ICreationSettingsInner } from './IComponentFactory';
import { MappedNamedComponentFactory } from './MappedNamedComponentFactory';
import { UnmappedNamedComponentFactory } from './UnmappedNamedComponentFactory';
import { UnnamedComponentFactory } from './UnnamedComponentFactory';

/**
 * Factory for component definitions of any type.
 */
export class ComponentFactory implements IComponentFactory {
  private readonly options: ComponentFactoryOptions;

  public constructor(options: ComponentFactoryOptions) {
    this.options = options;
  }

  /**
   * Create a component factory based on the component factory options.
   */
  public createComponentFactory(): IComponentFactory {
    if ('moduleDefinition' in this.options &&
      'componentDefinition' in this.options &&
      !this.options.config.property.requireName &&
      !this.options.config.property.requireElement) {
      if (!this.options.componentDefinition.property.constructorArguments) {
        // No constructor arguments, pass arguments manually
        return new UnmappedNamedComponentFactory(this.options);
      }

      // Available constructor arguments, map arguments to them
      return new MappedNamedComponentFactory(this.options);
    }

    // No component, construct based on requireName and requireElement
    return new UnnamedComponentFactory(this.options);
  }

  public createArguments(settings: ICreationSettingsInner): Promise<any[]> {
    return this.createComponentFactory().createArguments(settings);
  }

  public createInstance(settings: ICreationSettingsInner): Promise<any> {
    return this.createComponentFactory().createInstance(settings);
  }
}
