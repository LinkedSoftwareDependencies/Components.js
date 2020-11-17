import type { Resource, RdfObjectLoader } from 'rdf-object';
import Util = require('../Util');
import type { IComponentFactoryOptionsNamed } from './ComponentFactoryOptions';
import { UnnamedComponentFactory } from './UnnamedComponentFactory';

/**
 * Factory for component definitions with semantic arguments and without constructor mappings.
 */
export class UnmappedNamedComponentFactory extends UnnamedComponentFactory {
  public constructor(options: IComponentFactoryOptionsNamed) {
    super({
      ...options,
      config: UnmappedNamedComponentFactory.makeUnnamedDefinitionConstructor(
        options.moduleDefinition,
        options.componentDefinition,
        options.objectLoader,
      )(options.config),
    });
  }

  /**
     * Create an unnamed component definition resource constructor.
     * The component definition's parameters will be delegated to the component constructor.
     * @param moduleDefinition The module definition with parameter definitions.
     * @param componentDefinition The component definition with parameter instances.
     * @param objectLoader The current RDF object loader.
     * @returns {(params:any)=>Resource} A function that takes a parameter object for mapping parameter names to values
     *                                   like { 'http://example.org/param0': Resource.newString('abc') }
     *                                   and returns an unnamed component definition resource.
     */
  public static makeUnnamedDefinitionConstructor(
    moduleDefinition: Resource,
    componentDefinition: Resource,
    objectLoader: RdfObjectLoader,
  ): ((params: Resource) => Resource) {
    return (params: Resource) => {
      const param0 = objectLoader.createCompactedResource({
        // Hack to make UnnamedComponentFactory.getArgumentValue go into fields branch
        hasFields: '"true"',
      });
      for (const fieldData of componentDefinition.properties.parameters) {
        const field = objectLoader.createCompactedResource({});
        field.property.key = objectLoader.createCompactedResource(`"${fieldData.term.value}"`);
        for (const value of Util.applyParameterValues(componentDefinition, fieldData, params, objectLoader)) {
          field.properties.value.push(value);
        }
        param0.properties.fields.push(field);
      }

      const args = objectLoader.createCompactedResource({});
      args.list = [ param0 ];

      const constructor = objectLoader.createCompactedResource({});
      constructor.property.requireName = moduleDefinition.property.requireName ||
        componentDefinition.property.requireName;
      constructor.property.requireElement = componentDefinition.property.requireElement;
      constructor.property.arguments = args;

      return constructor;
    };
  }
}
