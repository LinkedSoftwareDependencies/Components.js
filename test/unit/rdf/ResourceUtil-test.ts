import * as fs from 'fs';
import type { Resource } from 'rdf-object';
import { RdfObjectLoader } from 'rdf-object';
import { uniqueTypes } from '../../../lib/rdf/ResourceUtil';

describe('ResourceUtil', () => {
  describe('uniqueTypes', () => {
    let objectLoader: RdfObjectLoader;
    let componentResources: Record<string, Resource>;

    beforeEach(async() => {
      objectLoader = new RdfObjectLoader({
        uniqueLiterals: true,
        context: JSON.parse(fs.readFileSync(`${__dirname}/../../../components/context.jsonld`, 'utf8')),
      });
      await objectLoader.context;

      componentResources = {
        'ex:Component': objectLoader.createCompactedResource({
          '@id': 'ex:Component',
          module: 'ex:Module',
          parameters: [
            { '@id': 'ex:param1' },
            { '@id': 'ex:param2' },
          ],
        }),
        'ex:ExtraType': objectLoader.createCompactedResource({
          '@id': 'ex:ExtraType',
          module: 'ex:Module',
        }),
      };
    });

    it('filters out duplicate types.', () => {
      const resource = objectLoader.createCompactedResource({
        '@id': 'ex:myComponentInstance',
        types: [ 'ex:Component', 'ex:ExtraType', 'ex:Component' ],
      });
      expect(uniqueTypes(resource, componentResources)).toEqual(
        [ componentResources['ex:Component'], componentResources['ex:ExtraType'] ],
      );
    });
  });
});
