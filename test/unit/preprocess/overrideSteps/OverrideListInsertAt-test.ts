import { DataFactory } from 'rdf-data-factory';
import type { RdfObjectLoader, Resource } from 'rdf-object';
import { OverrideListInsertAt } from '../../../../lib/preprocess/overridesteps/OverrideListInsertAt';
import { setupObjectLoader } from './OverrideTestUtil';

const DF = new DataFactory();

describe('OverrideListInsertAt', (): void => {
  let objectLoader: RdfObjectLoader;
  let config: Resource;
  const stepHandler = new OverrideListInsertAt();

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

  it('can only handle OverrideListInsertAt steps.', async(): Promise<void> => {
    let step = objectLoader.createCompactedResource({ types: 'oo:OverrideListInsertAt' });
    expect(stepHandler.canHandle(config, step)).toBe(true);

    step = objectLoader.createCompactedResource({ types: 'oo:OverrideUnknown' });
    expect(stepHandler.canHandle(config, step)).toBe(false);
  });

  it('can insert in lists at a specified index.', () => {
    const step = objectLoader.createCompactedResource({
      types: 'oo:OverrideListInsertAt',
      overrideParameter: { '@id': 'ex:paramList' },
      overrideTarget: '"0"',
      overrideValue: '"newList"',
    });

    expect(stepHandler.canHandle(config, step)).toBe(true);
    expect(stepHandler.handle(config, step)).toBe(config);

    expect(config.properties['ex:param1'][0].value).toBe('value1');
    expect(config.properties['ex:paramList'][0].list?.map(res => res.term))
      .toEqual([
        DF.literal('newList'),
        DF.literal('list1'),
        DF.literal('list2'),
        DF.literal('list3'),
        DF.literal('list4'),
      ]);
  });

  it('can insert multiple values at a specified index.', () => {
    const step = objectLoader.createCompactedResource({
      types: 'oo:OverrideListInsertAt',
      overrideParameter: { '@id': 'ex:paramList' },
      overrideTarget: '"1"',
      overrideValue: { list: [ '"newList"', '"newList2"' ]},
    });

    expect(stepHandler.canHandle(config, step)).toBe(true);
    expect(stepHandler.handle(config, step)).toBe(config);

    expect(config.properties['ex:param1'][0].value).toBe('value1');
    expect(config.properties['ex:paramList'][0].list?.map(res => res.term))
      .toEqual([
        DF.literal('list1'),
        DF.literal('newList'),
        DF.literal('newList2'),
        DF.literal('list2'),
        DF.literal('list3'),
        DF.literal('list4'),
      ]);
  });

  it('supports a negative index.', async(): Promise<void> => {
    const step = objectLoader.createCompactedResource({
      types: 'oo:OverrideListInsertAt',
      overrideParameter: { '@id': 'ex:paramList' },
      overrideTarget: '"-1"',
      overrideValue: '"newList"',
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
        DF.literal('list4'),
      ]);
  });

  it('supports a negative zero index to insert at the end of the list.', async(): Promise<void> => {
    const step = objectLoader.createCompactedResource({
      types: 'oo:OverrideListInsertAt',
      overrideParameter: { '@id': 'ex:paramList' },
      overrideTarget: '"-0"',
      overrideValue: '"newList"',
    });

    expect(stepHandler.canHandle(config, step)).toBe(true);
    expect(stepHandler.handle(config, step)).toBe(config);

    expect(config.properties['ex:param1'][0].value).toBe('value1');
    expect(config.properties['ex:paramList'][0].list?.map(res => res.term))
      .toEqual([
        DF.literal('list1'),
        DF.literal('list2'),
        DF.literal('list3'),
        DF.literal('list4'),
        DF.literal('newList'),
      ]);
  });

  it('adds elements to the end of the list if the index is too large.', async(): Promise<void> => {
    const step = objectLoader.createCompactedResource({
      types: 'oo:OverrideListInsertAt',
      overrideParameter: { '@id': 'ex:paramList' },
      overrideTarget: '"5"',
      overrideValue: '"newList"',
    });

    expect(stepHandler.canHandle(config, step)).toBe(true);
    expect(stepHandler.handle(config, step)).toBe(config);

    expect(config.properties['ex:param1'][0].value).toBe('value1');
    expect(config.properties['ex:paramList'][0].list?.map(res => res.term))
      .toEqual([
        DF.literal('list1'),
        DF.literal('list2'),
        DF.literal('list3'),
        DF.literal('list4'),
        DF.literal('newList'),
      ]);
  });

  it('errors on invalid index values.', async(): Promise<void> => {
    const step = objectLoader.createCompactedResource({
      types: 'oo:OverrideListInsertAt',
      overrideParameter: { '@id': 'ex:paramList' },
      overrideTarget: '"5a"',
      overrideValue: '"newList"',
    });

    expect(stepHandler.canHandle(config, step)).toBe(true);
    expect(() => stepHandler.handle(config, step))
      .toThrow('Invalid index in Override step OverrideListInsertAt for parameter ex:paramList: 5a');
  });
});
