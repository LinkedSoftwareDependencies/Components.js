# Components.js

_A semantic dependency injection framework_

[![Build Status](https://travis-ci.org/LinkedSoftwareDependencies/Components.js.svg?branch=master)](https://travis-ci.org/LinkedSoftwareDependencies/Components.js)
[![npm version](https://badge.fury.io/js/lsd-components.svg)](https://www.npmjs.com/package/lsd-components)

## Installation

```bash
$ [sudo] npm install lsd-components
```

## Terminology
A **module** is equivalent to a **Node module** and can contain several **components**.

A **component** is either a **class** or an **instance** that can be respectively instantiated or retrieved.
A **class** can be instantiated by creating a new **instance** of that type with zero or more **parameter** values.
**Parameters** are defined by the class and its superclasses.

A **component configuration** is a declarative instantiation of
**components** into **instances** based on **parameters**.

## Workflow

This framework provides the following workflow for injecting components.

- Defining a Module
- Defining a Component
- Configuring a Component
- Invoking a Component configuration

## Prefixes

We use the following prefixes in the following examples:
```
@prefix oo: <https://linkedsoftwaredependencies.org/vocabularies/object-oriented#>.
@prefix om: <https://linkedsoftwaredependencies.org/vocabularies/object-mapping#>.
@prefix doap: <http://usefulinc.com/ns/doap#>.
```

## Defining a Module

Example:
```
:SomeModule a oo:Module;
    doap:name "helloworld";
    oo:component :SomeModule#Component1.
```

## Defining a Component

A component is either a **class** or an **instance**.
A **class** can be instantiated into an **instance** based on a set of parameters.
An **instance** can be used directly without instantiation.

### Defining a Component: Unmapped

Parameter values will directly be sent to the constructor.

Example:
```
:SomeModule#Component1 a oo:Class;
    oo:componentPath "Hello";
    oo:parameter hello:say;
    oo:parameter hello:world.
```

In this case the `Hello` component will always receive a single object as argument like:
```
{
    'http://example.org/hello/say': 'Hello',
    'http://example.org/hello/world': 'World'
}
```

### Defining a Component: Mapped

Parameter values will first be mapped to a configured parameter structure before being sent to the constructor.

Example:
```
:SomeModule#Component1 a oo:Class;
    oo:componentPath "Hello";
    oo:parameter hello:say;
    oo:parameter hello:world;
    oo:constructorArguments (
        [
            rdf:value hello:say.
        ],
        [
            rdf:value hello:world.
        ]
    ).
```
In this case the `Hello` component will receive two objects as arguments like:
```
[
    'Hello',
    'World'
]
```

Each argument can be an `om:ObjectMapping` as follows:
```
:SomeModule#Component1 a oo:Class;
    oo:componentPath "Hello";
    oo:parameter hello:say;
    oo:parameter hello:world;
    oo:constructorArguments (
        [
            om:field [
                om:fieldName "say",
                om:fieldValue hello:say.                
            ];
            om:field [
                om:fieldName "world",
                om:fieldValue hello:world.                
            ];
        ],
        [
            om:fieldValue hello:world.
        ]
    ).
```
In this case the `Hello` component will receive two object as arguments like:
```
[
    {
        'say': 'Hello',
        'world': 'World'
    },
    'World'
]
```

## Configuring a Component

If a component definition exists (the component is _named_), parameter predicates are defined and can be used.
If no such definition exists (the component is _unnamed_), the constructor arguments must be provided in the configuration.

### Configuring a Component: Named

When a component definition exists, parameter predicates can be used to fill in the parameters.

Example:
```
:myComponent a :SomeModule#Component1;
    hello:say "Hello";
    hello:world "World".
```

### Configuring a Component: Unnamed

When a component definition does not exists, constructor arguments can be filled in manually using the `oo:arguments` predicate.
The NPM module name and the component element path must be provided as well.

Example:
```
:myComponent a :SomeModule#Component1;
    doap:name "helloworld",
    oo:componentPath "Hello",
    oo:arguments (
        [
            om:fieldValue "SAY".
        ],
        [
            om:fieldValue "WORLD".
        ]
    ).
```

Each argument can be an `om:ObjectMapping` as follows:
```
:myComponent a :SomeModule#Component1;
    doap:name "helloworld",
    oo:componentPath "Hello",
    oo:arguments (
        [
            om:field [
                om:fieldName "say",
                om:fieldValue "SAY".                
            ];
            om:field [
                om:fieldName "world",
                om:fieldValue "WORLD".                
            ];
        ],
        [
            om:fieldValue "WORLD".
        ]
    ).
```

## Invoking a Component configuration

Components can be constructed in code based on an RDF document, triple stream or by manually passing parameters.

First, a stream containing modules and components must be registered to the Loader.
After that, either a component config URI with a config stream must be passed,
or a component URI with a set of manual parameters.

### from an RDF document
```javascript
const Loader = require('lsd-components').Loader;

let loader = new Loader();
loader.registerModuleResourcesUrl('module-hello-world.jsonld')
    .then(() => loader.instantiateFromUrl('http://example.org/myHelloWorld', 'config-hello-world.jsonld'))
    .then((helloWorld) => helloWorld.run());
```

### from a triple stream
```javascript
const Loader = require('lsd-components').Loader;
const JsonLdStreamParser = require('lsd-components').JsonLdStreamParser;

let loader = new Loader();
let moduleStream = fs.createReadStream('module-hello-world.jsonld').pipe(new JsonLdStreamParser());
let configStream = fs.createReadStream('config-hello-world.jsonld').pipe(new JsonLdStreamParser());
loader.registerModuleResourcesUrl('module-hello-world.jsonld')
    .then(() => loader.runConfigStream('http://example.org/myHelloWorld', configStream))
    .then((helloWorld) => helloWorld.run());
```

### manually
```javascript
const Loader = require('lsd-components').Loader;
const JsonLdStreamParser = require('lsd-components').JsonLdStreamParser;

let loader = new Loader();
let moduleStream = fs.createReadStream('module-hello-world.jsonld').pipe(new JsonLdStreamParser());
let params = {};
params['http://example.org/hello/hello'] = 'WORLD';
params['http://example.org/hello/say'] = 'BONJOUR';
params['http://example.org/hello/bla'] = 'BLA';
loader.registerModuleResourcesStream(moduleStream)
    .then(() => loader.runManually('http://example.org/HelloWorldModule#SayHelloComponent', params))
    .then((helloWorld) => helloWorld.run());
```

## License
Components.js is written by [Ruben Taelman](http://www.rubensworks.net/).

This code is copyrighted by [Ghent University – imec](http://idlab.ugent.be/)
and released under the [MIT license](http://opensource.org/licenses/MIT).
