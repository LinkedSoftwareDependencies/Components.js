import * as fs from 'fs';
import { RdfObjectLoader } from 'rdf-object';

/**
 * Creates an object loader and creates the definition of a dummy class.
 */
export async function setupObjectLoader(): Promise<RdfObjectLoader> {
  const objectLoader = new RdfObjectLoader({
    uniqueLiterals: true,
    context: JSON.parse(fs.readFileSync(`${__dirname}/../../../../components/context.jsonld`, 'utf8')),
  });
  await objectLoader.context;

  objectLoader.createCompactedResource({
    '@id': 'ex:Component',
    module: 'ex:Module',
    parameters: [
      { '@id': 'ex:param1' },
      { '@id': 'ex:param2' },
      { '@id': 'ex:paramList' },
      { '@id': 'ex:paramMap' },
    ],
    constructorArguments: {
      list: [{
        fields: {
          list: [{
            collectEntries: { list: [ 'ex:paramMap' ]},
            key: 'ex:paramMap_key',
            value: 'ex:paramMap_value',
          }],
        },
      }],
    },
  });
  objectLoader.createCompactedResource({
    '@id': 'ex:ExtraType',
    module: 'ex:Module',
  });

  return objectLoader;
}
