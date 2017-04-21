## Running an application
```javascript
const Application = require('lsd-components').Application;

new Application('http://example.org/configs/config-hello-world.jsonld', [
        'http://example.org/configs/config-hello-something.jsonld'
    ]).run();
```