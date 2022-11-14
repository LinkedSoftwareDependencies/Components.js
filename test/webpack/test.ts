/* eslint-disable no-console, unicorn/no-process-exit, @typescript-eslint/no-implicit-any-catch */
import { RdfObjectLoader } from 'rdf-object';
import { RdfParser, ComponentsManagerBuilder } from '../..';
const arrayifyStream = require('stream-to-array');
const streamifyString = require('streamify-string');

try {
  if (!(ComponentsManagerBuilder.createObjectLoader() instanceof RdfObjectLoader)) {
    throw new Error('Object Loader is not an instance of RdfObjectLoader');
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
