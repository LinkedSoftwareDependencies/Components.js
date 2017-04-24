import {IComponentFactory} from "./IComponentFactory";
import {Resource} from "../rdf/Resource";
import {UnnamedComponentFactory} from "./UnnamedComponentFactory";
import {UnmappedNamedComponentFactory} from "./UnmappedNamedComponentFactory";
import {MappedNamedComponentFactory} from "./MappedNamedComponentFactory";
import Constants = require("../Constants");

/**
 * Factory for component definitions of any type.
 */
export class ComponentFactory implements IComponentFactory {

    _moduleDefinition: any;
    _componentDefinition: any;
    _config: any;

    constructor(moduleDefinition: Resource, componentDefinition: Resource, config: Resource) {
        this._moduleDefinition = moduleDefinition;
        this._componentDefinition = componentDefinition;
        this._config = config;
    }

    _getComponentFactory(): IComponentFactory {
        if (!this._config.requireName && !this._config.requireElement) {
            let constructable: boolean = !this._componentDefinition.types
                || this._componentDefinition.types.indexOf(Constants.PREFIXES['lsdc'] + 'ComponentInstance') < 0;
            if (!this._componentDefinition.constructorMapping) {
                return new UnmappedNamedComponentFactory(
                    this._moduleDefinition, this._componentDefinition, this._componentDefinition, constructable
                );
            } else {
                return new MappedNamedComponentFactory(
                    this._moduleDefinition, this._componentDefinition, this._componentDefinition, constructable
                );
            }
        } else {
            return new UnnamedComponentFactory(this._config,
                this._config.types.indexOf(Constants.PREFIXES['lsdc'] + 'ComponentInstance') < 0);
        }
    }

    create(): any {
        return this._getComponentFactory().create();
    }

}