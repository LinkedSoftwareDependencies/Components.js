import {Writable} from "stream";
import N3 = require('n3');
import {Resource} from "./Resource";
import Triple = N3.Triple;
import Util = require("../Util");

/**
 * An RdfClassLoader is a writable stream that accepts triple streams and loads resources in-memory.
 * Class and property URI's can be bound to names.
 */
export class RdfClassLoader extends Writable {

    _options: {[id: string]: any} = {};
    _classes: {[id: string]: any} = {};
    _properties: {[id: string]: string} = {};
    _uniqueProperties: {[id: string]: boolean} = {};
    _captureAllProperties: boolean;
    _captureAllClasses: boolean;

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
        this._captureAllProperties = this._options.captureAllProperties || false;
        this._captureAllClasses = this._options.captureAllClasses || false;

        if (this._options['normalizeLists']) {
            this.bindProperty('__listFirst', Util.PREFIXES['rdf'] + 'first');
            this.bindProperty('__listRest', Util.PREFIXES['rdf'] + 'rest');
            this.on('finish', () => {
                // Normalize lists
                let keys: string[] = Object.keys(this.resources);
                let listNodes: string[] = [];
                for (let i = keys.length - 1; i >= 0; i--) {
                    let element: any = this.resources[keys[i]];
                    if (element.__listFirst && element.__listRest) {
                        listNodes.push(keys[i]);
                        element.list = element.__listRest[0]['value'] === Util.PREFIXES['rdf'] + 'nil' ? [element.__listFirst[0]] : [element.__listFirst[0]].concat(element.__listRest[0]['list']);
                        delete element.__listFirst;
                        delete element.__listRest;
                        delete this.resources[keys[i]];
                    } else {
                        // Also check properties with empty lists
                        for (const key in element) {
                            if (key !== 'value' && key !== 'termType') {
                                if (element[key].length > 0 && element[key][0].value === Util.PREFIXES['rdf'] + 'nil') {
                                    element[key][0].list = [];
                                }
                            }
                        }
                    }
                }
                delete this.resources[Util.PREFIXES['rdf'] + 'nil'];
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

    _pushPredicate(fieldName: string, triple: Triple) {
        let subjectInstance: any = this._getOrMakeResource(triple.subject);
        let objectInstance: any = this._getOrMakeResource(triple.object);
        if (!this._uniqueProperties[fieldName]) {
            if (!subjectInstance[fieldName]) {
                subjectInstance[fieldName] = [];
            }
            if (subjectInstance[fieldName].indexOf(objectInstance) < 0) {
                subjectInstance[fieldName].push(objectInstance);
            }
        } else {
            if (subjectInstance[fieldName]) {
                this.emit('error', new Error('Predicate ' + triple.predicate + ' with field ' + fieldName
                    + ' was indicated as unique, while the objects ' + subjectInstance[fieldName].value
                    + ' and ' + objectInstance.value + ' were found for subject ' + subjectInstance.value + '.'));
            } else {
                subjectInstance[fieldName] = objectInstance;
            }
        }
    }

    _write(triple: Triple, encoding: any, done: any) {
        // Store fields for the configured predicates
        let fieldName: string = this._properties[triple.predicate];
        if (this._captureAllProperties) {
            this._pushPredicate(triple.predicate, triple);
        }
        if (fieldName) {
            this._pushPredicate(fieldName, triple);
        }

        // Store types for the configured classes
        if (triple.predicate === Util.PREFIXES['rdf'] + 'type') {
            let subjectInstance: Resource = this._getOrMakeResource(triple.subject);
            let typeName: string = this._classes[triple.object];
            if (!typeName && this._captureAllClasses) {
                typeName = triple.object;
            }
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
