import {PassThrough} from "stream";
import N3 = require("n3");
import Path = require("path");
import Util = require("../Util");
import {Stream} from "stream";

/**
 * A RdfStreamIncluder takes a triple stream and detects owl:includes to automatically include other files.
 */
export class RdfStreamIncluder extends PassThrough {

    static RELATIVE_PATH_MATCHER: RegExp = /^"file:\/\/([^\/].*)".*$/;

    _runningImporters: number = 1;
    _constants: any;
    _fromPath: string;
    _followImports: boolean;
    _absolutizeRelativePaths: boolean;

    constructor(constants: any, fromPath: string, followImports: boolean, absolutizeRelativePaths: boolean) {
        super({ objectMode: true });
        (<any> this)._readableState.objectMode = true;
        this._constants = constants;
        this._fromPath = fromPath;
        this._followImports = followImports;
        this._absolutizeRelativePaths = absolutizeRelativePaths;
    }

    push(data: any, encoding?: string): boolean {
        if (data) {
            if (this._followImports && data.predicate === this._constants.PREFIXES['owl'] + 'imports') {
                this._runningImporters++;
                this._constants.getContentsFromUrlOrPath(N3.Util.getLiteralValue(data.object), this._fromPath)
                    .then((rawStream: Stream) => {
                        let data: Stream = this._constants.parseRdf(rawStream, null, this._fromPath, true,
                            this._absolutizeRelativePaths);
                        data.on('data', (subData: any) => this.push(subData))
                            .on('error', (e: any) => this.emit('error', e))
                            .on('end', () => this.push(null));
                    }).catch((e: any) => this.emit('error', e));
            }
            if (this._absolutizeRelativePaths) {
                data.subject = this._absolutize(data.subject);
                data.predicate = this._absolutize(data.predicate);
                data.object = this._absolutize(data.object);
            }
            return super.push(data);
        }
        else if (!--this._runningImporters) {
            super.push(null);
        }
    }

    _absolutize(uri: string): string {
        // Make relative paths absolute
        var match = RdfStreamIncluder.RELATIVE_PATH_MATCHER.exec(uri);
        if (match) {
            return '"file:///' + Path.join(this._fromPath, match[1]) + '"' + this._constants.PREFIXES['xsd'] + 'string';
        }
        return uri;
    }
}