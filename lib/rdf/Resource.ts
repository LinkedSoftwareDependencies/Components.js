import N3 = require('n3');
import Util = require("../Util");
import NodeUtil = require('util');

/**
 * A resource class.
 * Fields can be added at runtime, which will always be arrays.
 */
export class Resource {
    readonly value: string;
    readonly termType: string;

    constructor(value: string, fields?: any) {
        this.value = N3.Util.isLiteral(value) ? N3.Util.getLiteralValue(value) : value;
        this.termType = N3.Util.isLiteral(value) ? 'Literal' : (N3.Util.isBlank(value) ? 'BlankNode' : 'NamedNode');
        if (fields) {
            let keys: string[] = Object.keys(fields);
            for (let i = 0; i < keys.length; i++) {
                (<any> this)[keys[i]] = fields[keys[i]];
            }
        }
    }

    static newString(value: string) {
        return Resource.newTyped(value, 'string');
    }

    static newBoolean(value: boolean) {
        return Resource.newTyped(value, 'boolean');
    }

    static newTyped(value: any, type: string) {
        return new Resource('"' + value + '"^^' + Util.PREFIXES['xsd'] + 'type');
    }

    hasType(typeUri: string): boolean {
        let resource: any = this;
        if (typeUri === this.value) {
            return true;
        }
        if (resource.types || resource.classes) {
            return (resource.types || []).concat(resource.classes || [])
                .reduce((acc: boolean, type: Resource) => acc || type.hasType(typeUri), false);
        }
        return false;
    }

    toString(): string {
        return NodeUtil.inspect(this);
    }
}
