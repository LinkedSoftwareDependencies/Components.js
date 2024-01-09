import { DataFactory } from 'rdf-data-factory';
import type { RdfObjectLoader, Resource } from 'rdf-object';
import { OverrideListInsertBefore } from '../../../../lib/preprocess/overridesteps/OverrideListInsertBefore';
import { setupObjectLoader } from './OverrideTestUtil';

const DF = new DataFactory();

describe('OverrideListInsertBefore', (): void => {
  let objectLoader: RdfObjectLoader;
  let config: Resource;
  const stepHandler = new OverrideListInsertBefore();

  beforeEach(async() => {
    objectLoader = await setupObjectLoader();

    config = objectLoader.createCompactedResource({
      '@id': 'ex:myComponentInstance',
      types: 'ex:Component',
      'ex:param1': '"value1"',
      'ex:paramList': {
        list: [ '"list1"', '"list2"', '"list3"', '"list4"' ],
      },
    });
  });

  it('can only handle OverrideListInsertBefore steps.', async(): Promise<void> => {
    let step = objectLoader.createCompactedResource({ types: 'oo:OverrideListInsertBefore' });
    expect(stepHandler.canHandle(config, step)).toBe(true);

    step = objectLoader.createCompactedResource({ types: 'oo:OverrideUnknown' });
    expect(stepHandler.canHandle(config, step)).toBe(false);
  });

  it('can insert in lists after a specific element.', () => {
    const step = objectLoader.createCompactedResource({
      types: 'oo:OverrideListInsertBefore',
      overrideParameter: { '@id': 'ex:paramList' },
      overrideTarget: '"list2"',
      overrideValue: '"newList"',
    });

    expect(stepHandler.canHandle(config, step)).toBe(true);
    expect(stepHandler.handle(config, step)).toBe(config);

    expect(config.properties['ex:param1'][0].value).toBe('value1');
    expect(config.properties['ex:paramList'][0].list?.map(res => res.term))
      .toEqual([
        DF.literal('list1'),
        DF.literal('newList'),
        DF.literal('list2'),
        DF.literal('list3'),
        DF.literal('list4'),
      ]);
  });

  it('can insert multiple values after a specific element.', () => {
    const step = objectLoader.createCompactedResource({
      types: 'oo:OverrideListInsertBefore',
      overrideParameter: { '@id': 'ex:paramList' },
      overrideTarget: '"list4"',
      overrideValue: { list: [ '"newList"', '"newList2"' ]},
    });

    expect(stepHandler.canHandle(config, step)).toBe(true);
    expect(stepHandler.handle(config, step)).toBe(config);

    expect(config.properties['ex:param1'][0].value).toBe('value1');
    expect(config.properties['ex:paramList'][0].list?.map(res => res.term))
      .toEqual([
        DF.literal('list1'),
        DF.literal('list2'),
        DF.literal('list3'),
        DF.literal('newList'),
        DF.literal('newList2'),
        DF.literal('list4'),
      ]);
  });
});
