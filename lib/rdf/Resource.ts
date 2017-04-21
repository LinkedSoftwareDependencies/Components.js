/**
 * A resource class.
 * Fields can be added at runtime, which will always be arrays.
 */
export class Resource {
    readonly uri: string;

    constructor(uri: string) {
        this.uri = uri;
    }
}