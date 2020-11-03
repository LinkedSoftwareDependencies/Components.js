import {IComponentFactory, ICreationSettings} from "./IComponentFactory";
import { Resource } from "rdf-object";
import Util = require("../Util");
import {Loader} from "../Loader";

/**
 * Factory for component definitions of any type.
 */
export class ComponentFactory implements IComponentFactory {

    _moduleDefinition: Resource | undefined;
    _componentDefinition: Resource | undefined;
    _config: Resource;
    _overrideRequireNames: {[id: string]: string};
    _componentRunner: Loader;

    constructor(
      moduleDefinition: Resource | undefined,
      componentDefinition: Resource | undefined,
      config: Resource,
      overrideRequireNames: {[id: string]: string},
      componentRunner: Loader,
    ) {
        this._moduleDefinition = moduleDefinition;
        this._componentDefinition = componentDefinition;
        this._config = config;
        this._overrideRequireNames = overrideRequireNames;
        this._componentRunner = componentRunner;
    }

    _getComponentFactory(): IComponentFactory {
        if (this._moduleDefinition && this._componentDefinition && !this._config.property.requireName && !this._config.property.requireElement) {
            let constructable: boolean = !this._componentDefinition.isA(Util.DF.namedNode(Util.PREFIXES['oo'] + 'ComponentInstance'));
            if (!this._componentDefinition.property.constructorArguments) {
                return new (require('./UnmappedNamedComponentFactory').UnmappedNamedComponentFactory)(
                    this._moduleDefinition, this._componentDefinition, this._config, constructable,
                    this._overrideRequireNames, this._componentRunner
                );
            } else {
                return new (require('./MappedNamedComponentFactory').MappedNamedComponentFactory)(
                    this._moduleDefinition, this._componentDefinition, this._config, constructable,
                    this._overrideRequireNames, this._componentRunner
                );
            }
        } else {
            return new (require('./UnnamedComponentFactory').UnnamedComponentFactory)(this._config,
                !this._config.isA(Util.DF.namedNode(Util.PREFIXES['oo'] + 'ComponentInstance')),
                this._overrideRequireNames, this._componentRunner);
        }
    }

    makeArguments(settings?: ICreationSettings): Promise<any[]> {
        return this._getComponentFactory().makeArguments(settings);
    }

    create(settings?: ICreationSettings): Promise<any> {
        return this._getComponentFactory().create(settings);
    }

}
