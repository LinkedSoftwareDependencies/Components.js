import { DataFactory } from 'rdf-data-factory';
import type { RdfObjectLoader, Resource } from 'rdf-object';
import { OverrideListRemove } from '../../../../lib/preprocess/overridesteps/OverrideListRemove';
import { setupObjectLoader } from './OverrideTestUtil';

const DF = new DataFactory();

describe('OverrideListRemove', (): void => {
  let objectLoader: RdfObjectLoader;
  let config: Resource;
  const stepHandler = new OverrideListRemove();

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

  it('can only handle OverrideListRemove steps.', async(): Promise<void> => {
    let step = objectLoader.createCompactedResource({ types: 'oo:OverrideListRemove' });
    expect(stepHandler.canHandle(config, step)).toBe(true);

    step = objectLoader.createCompactedResource({ types: 'oo:OverrideUnknown' });
    expect(stepHandler.canHandle(config, step)).toBe(false);
  });

  it('can remove a specific element.', () => {
    const step = objectLoader.createCompactedResource({
      types: 'oo:OverrideListRemove',
      overrideParameter: { '@id': 'ex:paramList' },
      overrideTarget: '"list2"',
    });

    expect(stepHandler.canHandle(config, step)).toBe(true);
    expect(stepHandler.handle(config, step)).toBe(config);

    expect(config.properties['ex:param1'][0].value).toBe('value1');
    expect(config.properties['ex:paramList'][0].list?.map(res => res.term))
      .toEqual([
        DF.literal('list1'),
        DF.literal('list3'),
        DF.literal('list4'),
      ]);
  });

  it('can remove multiple elements.', () => {
    const step = objectLoader.createCompactedResource({
      types: 'oo:OverrideListRemove',
      overrideParameter: { '@id': 'ex:paramList' },
      overrideTarget: { list: [ '"list2"', '"list4"' ]},
    });

    expect(stepHandler.canHandle(config, step)).toBe(true);
    expect(stepHandler.handle(config, step)).toBe(config);

    expect(config.properties['ex:param1'][0].value).toBe('value1');
    expect(config.properties['ex:paramList'][0].list?.map(res => res.term))
      .toEqual([
        DF.literal('list1'),
        DF.literal('list3'),
      ]);
  });
});
