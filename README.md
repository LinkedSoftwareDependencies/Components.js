## Running an application
```javascript
const Application = require('lsd-components').Application;

new Application('http://example.org/configs/my-config.json')
    .run('http://example.org/components#component1', 'param0', 'param1');
```