import {Transform, PassThrough} from "stream";
import N3 = require("n3");
import {Stream} from "stream";
import {JsonLdStreamer} from "./JsonLdStreamer";
import {JsonLdStreamParser} from "./JsonLdStreamParser";
import NodeUtil = require('util');

/**
 * A RdfStreamParser takes a text stream (N3 or JSON-LD) as input and parses it to a triple stream.
 */
export class RdfStreamParser extends PassThrough {

    _n3Parser: N3.N3Parser;
    _jsonParser: JsonLdStreamParser;

    constructor(contexts?: {[id: string]: string}) {
        super({ decodeStrings: true });
        (<any> this)._readableState.objectMode = true;

        this._n3Parser = new N3.StreamParser(<any> { blankNodePrefix: 'n3b' });
        this._jsonParser = new JsonLdStreamParser(contexts);
    }

    pipeFrom(target: Stream): Stream {
        target.on('error', (e: any) => this.emit('error', e));

        var stream1 = target.pipe(new PassThrough());
        var stream2 = target.pipe(new PassThrough());

        stream1.pipe(<any> this._n3Parser)
            .on('error', errorHandler)
            .on('data', (data: any) => this.push(data))
            .on('end', () => this.push(null), this.emit('end'));
        stream2.pipe(<any> this._jsonParser)
            .on('error', (e: any) => errorHandler(e))
            .on('data', (data: any) => this.push(data))
            .on('end', () => this.push(null), this.emit('end'));

        let errors: Array<any> = [];
        let self: any = this;
        function errorHandler(e: any) {
            errors.push(e);
            if (errors.length === 2) {
                self.emit('error', new Error('No valid parser was found, both N3 and JSON-LD failed:\n' + NodeUtil.inspect(errors)));
            }
        }

        return this;
    }
}