import {Readable} from "stream";
let jsonld: any = require("jsonld");

/**
 * A JsonLdStreamer converts an object to a triple stream.
 */
export class JsonLdStreamer extends Readable {

    _data: any;

    constructor(data: any) {
        super({ objectMode: true });
        this._data = data;
        this._pushAll();
    }

    _pushAll() {
        jsonld.toRDF(this._data, (error: any, triples: any) => {
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
                this.push(null);
            }
        });
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