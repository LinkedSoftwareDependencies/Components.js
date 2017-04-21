import {Writable} from "stream";
import N3 = require('n3');
import {Resource} from "./Resource";
import Triple = N3.Triple;
import Constants = require("../Constants");

/**
 * An RdfClassLoader is a writable stream that accepts triple streams and loads resources in-memory.
 * Class and property URI's can be bound to names.
 */
export class RdfClassLoader extends Writable {

    _options: {[id: string]: any} = {};
    _classes: {[id: string]: any} = {};
    _properties: {[id: string]: string} = {};
    _uniqueProperties: {[id: string]: boolean} = {};

    /**
     * Mapping from resource URI to resource instance.
     */
    resources: {[id: string]: Resource} = {};
    /**
     * Mapping from resource type name to an array of resource instances.
     */
    typedResources: {[id: string]: Resource[]} = {};

    constructor(options?: any) {
        super({ objectMode: true });

        this._options = options || { normalizeLists: true };

        if (this._options.normalizeLists) {
            this.bindProperty('__listFirst', Constants.PREFIXES['rdf'] + 'first');
            this.bindProperty('__listRest', Constants.PREFIXES['rdf'] + 'rest');
            this.on('finish', () => {
                // Normalize lists
                let keys: string[] = Object.keys(this.resources);
                let listNodes: string[] = [];
                for (let i = keys.length - 1; i >= 0; i--) {
                    let element: any = this.resources[keys[i]];
                    if (element.__listFirst && element.__listRest) {
                        listNodes.push(keys[i]);
                        element.list = element.__listRest[0]['value'] === Constants.PREFIXES['rdf'] + 'nil' ? [element.__listFirst[0]] : [element.__listFirst[0]].concat(element.__listRest[0]['list']);
                        delete element.__listFirst;
                        delete element.__listRest;
                        delete this.resources[keys[i]];
                    }
                }
                delete this.resources[Constants.PREFIXES['rdf'] + 'nil'];
            });
        }
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
     * @param unique If the property should be unique.
     */
    bindProperty(fieldName: string, uri: string, unique?: boolean) {
        this._properties[uri] = fieldName;
        if (unique) {
            this.setUniqueProperty(fieldName);
        }
    }

    /**
     * Indicate that the given property is unique for a resource.
     * @param fieldName The field name of the property.
     */
    setUniqueProperty(fieldName: string) {
        this._uniqueProperties[fieldName] = true;
    }

    _getOrMakeResource(value: string): Resource {
        let instance: Resource = this.resources[value];
        if (!instance) {
            instance = this.resources[value] = new Resource(value);
        }
        return instance;
    }

    _write(triple: Triple, encoding: any, done: any) {
        // Store fields for the configured predicates
        let fieldName: string = this._properties[triple.predicate];
        if (fieldName) {
            let subjectInstance: any = this._getOrMakeResource(triple.subject);
            let objectInstance: any = this._getOrMakeResource(triple.object);
            if (!this._uniqueProperties[fieldName]) {
                if (!subjectInstance[fieldName]) {
                    subjectInstance[fieldName] = [];
                }
                subjectInstance[fieldName].push(objectInstance);
            } else {
                if (subjectInstance[fieldName]) {
                    this.emit('error', new Error('Predicate ' + triple.predicate + ' with field ' + fieldName
                        + ' was indicated as unique, while the objects ' + subjectInstance[fieldName].value
                        + ' and ' + objectInstance.value + ' were found.'));
                } else {
                    subjectInstance[fieldName] = objectInstance;
                }
            }
        }

        // Store types for the configured classes
        if (triple.predicate === Constants.PREFIXES['rdf'] + 'type') {
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