import 'jest-rdf';
import { DataFactory } from 'rdf-data-factory';
import type { RdfObjectLoader, Resource } from 'rdf-object';
import {
  extractOverrideStepFields, findResourceIndex,
  getPropertyResourceList,
} from '../../../../lib/preprocess/overridesteps/OverrideUtil';
import { setupObjectLoader } from './OverrideTestUtil';

const DF = new DataFactory();

describe('OverrideUtil', (): void => {
  let objectLoader: RdfObjectLoader;

  beforeEach(async(): Promise<void> => {
    objectLoader = await setupObjectLoader();
  });

  describe('#extractOverrideStepFields', (): void => {
    it('extracts the necessary fields.', async(): Promise<void> => {
      const step = objectLoader.createCompactedResource({
        types: 'oo:OverrideListInsertAt',
        overrideParameter: { '@id': 'ex:paramList' },
        overrideValue: { list: [ '"newList"', '"newList2"' ]},
      });

      const result = extractOverrideStepFields(step, { parameters: 1, targets: 0, values: 2 });
      expect(result.parameters).toHaveLength(1);
      expect(result.parameters[0].term).toEqual(DF.namedNode('ex:paramList'));
      expect(result.targets).toHaveLength(0);
      expect(result.values).toHaveLength(2);
      expect(result.values[0].term).toEqual(DF.literal('newList'));
      expect(result.values[1].term).toEqual(DF.literal('newList2'));
    });

    it('errors if there are multiple field values without using a list.', async(): Promise<void> => {
      const step = objectLoader.createCompactedResource({
        types: 'oo:OverrideListInsertAt',
        overrideParameter: { '@id': 'ex:paramList' },
        overrideValue: [ '"newList"', '"newList2"' ],
      });

      expect(() => extractOverrideStepFields(step))
        .toThrow('Detected multiple values for overrideValue in Override step');
    });

    it('errors if one of the expected counts does not match the actual count.', async(): Promise<void> => {
      const step = objectLoader.createCompactedResource({
        types: 'oo:OverrideListInsertAt',
        overrideParameter: { '@id': 'ex:paramList' },
        overrideValue: { list: [ '"newList"', '"newList2"' ]},
      });

      expect(() => extractOverrideStepFields(step, { values: 3 }))
        .toThrow('Expected 3 entries for overrideValue but found 2 in Override step');
    });
  });

  describe('#getPropertyResourceList', (): void => {
    let parameter: Resource;

    beforeAll(async(): Promise<void> => {
      parameter = objectLoader.getOrMakeResource(DF.namedNode('ex:param1'));
    });

    it('combines all results in a single list.', async(): Promise<void> => {
      const config = objectLoader.createCompactedResource({
        '@id': 'ex:myComponentInstance',
        types: 'ex:Component',
        'ex:param1': [{ list: [ '"value1"' ]}, { list: [ '"value2"', '"value3"' ]}],
      });
      const list = getPropertyResourceList(config, parameter);
      expect(list).toHaveLength(3);
      expect(list.map(entry => entry.term)).toEqualRdfTermArray([
        DF.literal('value1'), DF.literal('value2'), DF.literal('value3'),
      ]);
    });

    it('returns an empty list if the parameter is empty.', async(): Promise<void> => {
      const config = objectLoader.createCompactedResource({
        '@id': 'ex:myComponentInstance',
        types: 'ex:Component',
      });
      const list = getPropertyResourceList(config, parameter);
      expect(list).toHaveLength(0);
    });

    it('errors if a non-list resource is found.', async(): Promise<void> => {
      const config = objectLoader.createCompactedResource({
        '@id': 'ex:myComponentInstance',
        types: 'ex:Component',
        'ex:param1': [{ list: [ '"value1"' ]}, [ '"value2"', '"value3"' ]],
      });
      expect(() => getPropertyResourceList(config, parameter)).toThrow(
        'Invalid target in Override step targeting ex:myComponentInstance: ex:param1 does not reference a list',
      );
    });

    it('assigns the list to the original resource so it can be updated there.', async(): Promise<void> => {
      const config = objectLoader.createCompactedResource({
        '@id': 'ex:myComponentInstance',
        types: 'ex:Component',
        'ex:param1': [{ list: [ '"value1"' ]}, { list: [ '"value2"', '"value3"' ]}],
      });

      getPropertyResourceList(config, parameter);
      const list = config.property['ex:param1'].list;
      expect(list).toBeDefined();
      expect(list).toHaveLength(3);
      expect(list!.map(entry => entry.term)).toEqualRdfTermArray([
        DF.literal('value1'), DF.literal('value2'), DF.literal('value3'),
      ]);

      list!.splice(1, 1);
      expect(list).toHaveLength(2);
      expect(list!.map(entry => entry.term)).toEqualRdfTermArray([
        DF.literal('value1'), DF.literal('value3'),
      ]);
    });
  });

  describe('#findResourceInList', (): void => {
    let list: Resource[];

    beforeAll(async(): Promise<void> => {
      list = [
        objectLoader.createCompactedResource('"value1"'),
        objectLoader.createCompactedResource('"value2"'),
      ];
    });

    it('finds the matching resource in a list.', async(): Promise<void> => {
      expect(findResourceIndex(list, objectLoader.createCompactedResource('"value2"'))).toBe(1);
    });

    it('errors if the resource can not be found.', async(): Promise<void> => {
      expect(() => findResourceIndex(list, objectLoader.createCompactedResource('"unknown"')))
        .toThrow('Unable to find unknown in targeted list while overriding.');
    });
  });
});
