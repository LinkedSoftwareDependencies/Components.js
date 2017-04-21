import N3 = require('n3');

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
}