const definePrefix = (prefix: string) => (suffix: string) => `${prefix}${suffix}`;

export const PREFIX_OO = definePrefix('https://linkedsoftwaredependencies.org/vocabularies/object-oriented#');
export const IRIS_OO = {
  Module: PREFIX_OO('Module'),
  Class: PREFIX_OO('Class'),
  AbstractClass: PREFIX_OO('AbstractClass'),
  ComponentInstance: PREFIX_OO('ComponentInstance'),
  component: PREFIX_OO('component'),
  componentPath: PREFIX_OO('componentPath'),
  Override: PREFIX_OO('Override'),
  overrideInstance: PREFIX_OO('overrideInstance'),
  overrideParameters: PREFIX_OO('overrideParameters'),
  parameter: PREFIX_OO('parameter'),
};

export const PREFIX_OM = definePrefix('https://linkedsoftwaredependencies.org/vocabularies/object-mapping#');

export const PREFIX_RDF = definePrefix('http://www.w3.org/1999/02/22-rdf-syntax-ns#');
export const IRIS_RDF = {
  subject: PREFIX_RDF('subject'),
  object: PREFIX_RDF('object'),
  type: PREFIX_RDF('type'),
  JSON: PREFIX_RDF('JSON'),
};

export const PREFIX_RDFS = definePrefix('http://www.w3.org/2000/01/rdf-schema#');
export const IRIS_RDFS = {
  seeAlso: PREFIX_RDFS('seeAlso'),
};

export const PREFIX_XSD = definePrefix('http://www.w3.org/2001/XMLSchema#');
export const IRIS_XSD = {
  string: PREFIX_XSD('string'),
  boolean: PREFIX_XSD('boolean'),
  integer: PREFIX_XSD('integer'),
  number: PREFIX_XSD('number'),
  int: PREFIX_XSD('int'),
  byte: PREFIX_XSD('byte'),
  long: PREFIX_XSD('long'),
  float: PREFIX_XSD('float'),
  decimal: PREFIX_XSD('decimal'),
  double: PREFIX_XSD('double'),
};

export const PREFIX_DOAP = definePrefix('http://usefulinc.com/ns/doap#');
export const IRIS_DOAP = {
  name: PREFIX_DOAP('name'),
};

export const PREFIX_OWL = definePrefix('http://www.w3.org/2002/07/owl#');
export const IRIS_OWL = {
  Restriction: PREFIX_OWL('Restriction'),
};
