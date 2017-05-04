import {Transform} from "stream";
let jsonld: any = require("jsonld");

/**
 * A JsonLdStreamParser takes a text stream as input and parses it to a triple stream.
 */
export class JsonLdStreamParser extends Transform {

    _data: string = "";

    constructor() {
        super({ decodeStrings: true });
        (<any> this)._readableState.objectMode = true;
    }

    _transform(chunk: any, encoding: any, done: any) {
        this._data += chunk;
        done();
    }

    _flush(done: any) {
        try {
            let parsed: any = JSON.parse(this._data);
            jsonld.toRDF(parsed, (error: any, triples: any) => {
                if (error) {
                    this.emit('error', error);
                } else {
                    for (var graphName in triples) {
                        triples[graphName].forEach((triple: any) => {
                            this.push({
                                subject: triple.subject.value,
                                predicate: triple.predicate.value,
                                object: this._convertEntity(triple.object)
                            });
                        });
                    }
                    done();
                }
            });
        } catch (e) {
            this.emit('error', e);
        }
    }

    // Converts a jsonld.js entity to the N3.js in-memory representation
    _convertEntity(entity: any) {
        // Return IRIs and blank nodes as-is
        if (entity.type !== 'literal')
            return entity.value;
        else {
            // Add a language tag to the literal if present
            if ('language' in entity)
                return '"' + entity.value + '"@' + entity.language;
            // Add a datatype to the literal if present
            if (entity.datatype !== 'http://www.w3.org/2001/XMLSchema#string')
                return '"' + entity.value + '"^^' + entity.datatype;
            // Otherwise, return the regular literal
            return '"' + entity.value + '"';
        }
    }
}