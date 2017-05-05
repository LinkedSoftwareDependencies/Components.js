# Components.js

_A semantic dependency injection framework_

## Terminology
A **module** is equivalent to a **Node module** and can contain several **components**.

A **module definition** is a declarative semantic definition of a **module**.
It defines the module name and lists its components.

A **component** is either an **object factory** or an **object instance** that can be respectively invoked or called declaratively.

A **component definition** is a declarative semantic definition of a **component**.
It defines the location in the module and the possible parameters.

A **component configuration** is a declarative invocation of a **component**.
It is a subtype of a component and can assign values for the parameters that are defined by the component.

## Module Definition

Example:
```
ex:HelloWorldModule a lsdc:Module;
    npm:requireName "helloworld";
    hasComponent ex:HelloWorldModule#SayHelloComponent.
```

## Component Definition

A `lsdc:Component` has two possible subtypes: `lsdc:ComponentConstructable` or `lsdc:ComponentInstance`.
`lsdc:ComponentConstructable` accepts arguments and constructs instances.
`lsdc:ComponentInstance` already is an instance.

### Component Definition: Unmapped

Parameter values will directly be sent to the constructor.

Example:
```
ex:HelloWorldModule#SayHelloComponent a lsdc:ComponentConstructable;
    npm:requireElement "Hello";
    hasParameter hello:say;
    hasParameter hello:world.
```

In this case the `Hello` component will always receive a single object as argument like:
```
{
    'http://example.org/hello/say': 'Hello',
    'http://example.org/hello/world': 'World'
}
```

### Component Definition: Mapped

Parameter values will first be mapped to a configured parameter structure before being sent to the constructor.

Example:
```
ex:HelloWorldModule#SayHelloComponent a lsdc:ComponentConstructable;
    npm:requireElement "Hello";
    hasParameter hello:say;
    hasParameter hello:world;
    constructorMapping (
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

Each argument can be an `lsdc:Object` as follows:
```
ex:HelloWorldModule#SayHelloComponent a lsdc:ComponentConstructable;
    npm:requireElement "Hello";
    hasParameter hello:say;
    hasParameter hello:world;
    constructorMapping (
        [
            a lsdc:Object;
            lsdc:hasField [
                rdfs:label "say",
                rdf:value hello:say.                
            ];
            lsdc:hasField [
                rdfs:label "world",
                rdf:value hello:world.                
            ];
        ],
        [
            rdf:value hello:world.
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

## Component Configuration

If a component definition exists, parameter predicates are defined and should be used.
If no such definition exists, all required information must be provided in the configuration.

### Component Configuration: Named

When a component definition exists, parameter predicates can be used to fill in the parameters.

Example:
```
ex:myHelloWorld a HelloWorldModule#SayHelloComponent;
    hello:say "Hello";
    hello:world "World".
```

### Component Configuration: Unnamed

When a component definition does not exists, parameters can be filled in manually using the `lsdc:arguments` predicate.
The NPM module name and the component element path must be provided as well.

Example:
```
ex:myHelloWorld a HelloWorldModule#SayHelloComponent;
    npm:requireName "helloworld",
    npm:requireElement "Hello",
    lsdc:arguments (
        [
            rdf:value "SAY".
        ],
        [
            rdf:value "WORLD".
        ]
    ).
```

Each argument can be an `lsdc:Object` as follows:
```
ex:myHelloWorld a HelloWorldModule#SayHelloComponent;
    npm:requireName "helloworld",
    npm:requireElement "Hello",
    lsdc:arguments (
        [
            a lsdc:Object;
            lsdc:hasField [
                rdfs:label "say",
                rdf:value "SAY".                
            ];
            lsdc:hasField [
                rdfs:label "world",
                rdf:value "WORLD".                
            ];
        ],
        [
            rdf:value "WORLD".
        ]
    ).
```

## Constructing

Components can be constructed based on a triple stream or by manually passing parameters.

First, a stream containing modules and components must be registered to the Loader.
After that, either a component config URI with a config stream must be passed,
or a component URI with a set of manual parameters.

### from a triple stream
```javascript
const Loader = require('lsd-components').Loader;
const JsonLdStreamParser = require('lsd-components').JsonLdStreamParser;

let loader = new Loader();
let moduleStream = fs.createReadStream('module-hello-world.jsonld').pipe(new JsonLdStreamParser());
let configStream = fs.createReadStream('config-hello-world.jsonld').pipe(new JsonLdStreamParser());
loader.registerModuleResourcesStream(moduleStream)
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
    .then(() => loader.runManually('http://example.org/HelloWorldModule#SayHelloComponent, params))
    .then((helloWorld) => helloWorld.run());
```