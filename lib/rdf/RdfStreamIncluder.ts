import {PassThrough} from "stream";
import N3 = require("n3");
import Constants = require("../Constants");
import {Stream} from "stream";

/**
 * A RdfStreamIncluder takes a triple stream and detects owl:includes to automatically include other files.
 */
export class RdfStreamIncluder extends PassThrough {

    _runningImporters: number = 1;
    _constants: any;
    _fromPath: string;
    _followImports: boolean;

    constructor(constants: any, fromPath: string, followImports: boolean) {
        super({ objectMode: true });
        (<any> this)._readableState.objectMode = true;
        this._constants = constants;
        this._fromPath = fromPath;
        this._followImports = followImports;
    }

    push(data: any, encoding?: string): boolean {
        if (this._followImports && data && data.predicate === this._constants.PREFIXES['owl'] + 'imports') {
            this._runningImporters++;
            this._constants.getContentsFromUrlOrPath(N3.Util.getLiteralValue(data.object), this._fromPath)
                .then((rawStream: Stream) => {
                    let data: Stream = this._constants.parseRdf(rawStream, this._fromPath, true);
                    data.on('data', (subData: any) => this.push(subData))
                        .on('error', (e: any) => this.emit('error', e))
                        .on('end', () => this.push(null));
                }).catch((e: any) => this.emit('error', e));
        }
        if (!data) {
            if (!--this._runningImporters) {
                super.push(null);
            }
        } else {
            return super.push(data);
        }
    }
}