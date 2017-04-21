import {Writable} from "stream";
import N3 = require('n3');
import {Resource} from "./Resource";
import Triple = N3.Triple;

/**
 * An RdfClassLoader is a writable stream that accepts triple streams and loads resources in-memory.
 * Class and property URI's can be bound to names.
 */
export class RdfClassLoader extends Writable {

    _classes: {[id: string]: any} = {};
    _properties: {[id: string]: string} = {};

    /**
     * Mapping from resource URI to resource instance.
     */
    resources: {[id: string]: Resource} = {};
    /**
     * Mapping from resource type name to an array of resource instances.
     */
    typedResources: {[id: string]: Resource[]} = {};

    constructor() {
        super({ objectMode: true });
    }

    /**
     * Bind the given class name to the given URI.
     * @param className The class name.
     * @param uri The class URI.
     */
    bindClass(className: string, uri: string) {
        this._classes[uri] = className;
    }

    /**
     * Bind the given property field name to the given URI.
     * @param fieldName The field name.
     * @param uri The predicate URI.
     */
    bindProperty(fieldName: string, uri: string) {
        this._properties[uri] = fieldName;
    }

    _getOrMakeResource(uri: string): Resource {
        let instance: Resource = this.resources[uri];
        if (!instance) {
            instance = this.resources[uri] = new Resource(N3.Util.isLiteral(uri) ? N3.Util.getLiteralValue(uri) : uri);
        }
        return instance;
    }

    _write(triple: Triple, encoding: any, done: any) {
        // Store fields for the configured predicates
        let fieldName: string = this._properties[triple.predicate];
        if (fieldName) {
            let subjectInstance: any = this._getOrMakeResource(triple.subject);
            let objectInstance: any = this._getOrMakeResource(triple.object);
            if (!subjectInstance[fieldName]) {
                subjectInstance[fieldName] = [];
            }
            subjectInstance[fieldName].push(objectInstance);
        }

        // Store types for the configured classes
        if (triple.predicate === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type') {
            let subjectInstance: Resource = this._getOrMakeResource(triple.subject);
            let typeName: string = this._classes[triple.object];
            if (typeName) {
                if (!this.typedResources[typeName]) {
                    this.typedResources[typeName] = [];
                }
                this.typedResources[typeName].push(subjectInstance);
            }
        }

        done();
    }
}