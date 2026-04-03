/* eslint-disable no-console, unicorn/no-process-exit */

// Monkey patch in the window object so we can test the script in Node
// @ts-expect-error
import { RdfObjectLoader } from 'rdf-object';
import { RdfParser, ComponentsManagerBuilder } from '../..';

globalThis.window = globalThis;
const arrayifyStream = require('stream-to-array');
const streamifyString = require('streamify-string');

try {
  if (!(ComponentsManagerBuilder.createObjectLoader() instanceof RdfObjectLoader)) {
    throw new TypeError('Object Loader is not an instance of RdfObjectLoader');
  }

  const parse = new RdfParser();

  arrayifyStream(
    parse.parse(
      streamifyString('<s> <p> <o> .'),
      {
        path: './data.ttl',
      },
    ),
  ).catch((error: Error) => {
    console.error(error);
    process.exit(1);
  });
} catch (error: any) {
  console.error(error);
  process.exit(1);
}
/* eslint-enable no-console, unicorn/no-process-exit */
