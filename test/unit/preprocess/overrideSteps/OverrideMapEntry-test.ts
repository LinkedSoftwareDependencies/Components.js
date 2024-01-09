import type { Term } from '@rdfjs/types';
import { DataFactory } from 'rdf-data-factory';
import type { Resource, RdfObjectLoader } from 'rdf-object';
import { OverrideMapEntry } from '../../../../lib/preprocess/overridesteps/OverrideMapEntry';
import { setupObjectLoader } from './OverrideTestUtil';

const DF = new DataFactory();

describe('OverrideMapEntry', (): void => {
  let objectLoader: RdfObjectLoader;
  let config: Resource;
  const stepHandler = new OverrideMapEntry();

  beforeEach(async() => {
    objectLoader = await setupObjectLoader();

    config = objectLoader.createCompactedResource({
      '@id': 'ex:myComponentInstance',
      types: 'ex:Component',
      'ex:param1': '"value1"',
      'ex:paramMap': {
        list: [
          {
            'ex:paramMap_key': '"key"',
            'ex:paramMap_value': '"value"',
          },
          {
            'ex:paramMap_key': '"key2"',
            'ex:paramMap_value': '"value2"',
          },
        ],
      },
    });
  });

  it('can only handle OverrideMapEntry steps.', async(): Promise<void> => {
    let step = objectLoader.createCompactedResource({ types: 'oo:OverrideMapEntry' });
    expect(stepHandler.canHandle(config, step)).toBe(true);

    step = objectLoader.createCompactedResource({ types: 'oo:OverrideUnknown' });
    expect(stepHandler.canHandle(config, step)).toBe(false);
  });

  it('can replace the value of a key in a key/value object.', async(): Promise<void> => {
    const step = objectLoader.createCompactedResource({
      types: 'oo:OverrideMapEntry',
      overrideParameter: { '@id': 'ex:paramMap' },
      overrideTarget: '"key"',
      overrideValue: '"newValue"',
    });

    expect(stepHandler.canHandle(config, step)).toBe(true);
    expect(stepHandler.handle(config, step)).toBe(config);

    expect(config.property['ex:param1'].value).toBe('value1');
    const entryList = config.property['ex:paramMap'].list;
    const entries = entryList?.map((entry): { key: Term; value: Term } => ({
      key: entry.property['ex:paramMap_key'].term,
      value: entry.property['ex:paramMap_value'].term,
    }));
    expect(entries).toEqual([
      { key: DF.literal('key'), value: DF.literal('newValue') },
      { key: DF.literal('key2'), value: DF.literal('value2') },
    ]);
  });

  it('can remove an entry in a key/value object.', async(): Promise<void> => {
    const step = objectLoader.createCompactedResource({
      types: 'oo:OverrideMapEntry',
      overrideParameter: { '@id': 'ex:paramMap' },
      overrideTarget: '"key"',
    });

    expect(stepHandler.canHandle(config, step)).toBe(true);
    expect(stepHandler.handle(config, step)).toBe(config);

    expect(config.property['ex:param1'].value).toBe('value1');
    const entryList = config.property['ex:paramMap'].list;
    const entries = entryList?.map((entry): { key: Term; value: Term } => ({
      key: entry.property['ex:paramMap_key'].term,
      value: entry.property['ex:paramMap_value'].term,
    }));
    expect(entries).toEqual([
      { key: DF.literal('key2'), value: DF.literal('value2') },
    ]);
  });

  it('throws an error if the predicate does not point to a key/value map.', async(): Promise<void> => {
    const step = objectLoader.createCompactedResource({
      types: 'oo:OverrideMapEntry',
      overrideParameter: { '@id': 'ex:paramList' },
      overrideTarget: '"key"',
    });

    expect(stepHandler.canHandle(config, step)).toBe(true);
    expect(() => stepHandler.handle(config, step)).toThrow('Unable to find key/value URIs for parameter ex:paramList');
  });

  it('throw an error if no key/value entry could be found with the given key.', async(): Promise<void> => {
    const step = objectLoader.createCompactedResource({
      types: 'oo:OverrideMapEntry',
      overrideParameter: { '@id': 'ex:paramMap' },
      overrideTarget: '"wrongKey"',
    });

    expect(stepHandler.canHandle(config, step)).toBe(true);
    expect(() => stepHandler.handle(config, step)).toThrow('Unable to find key/value entry with key wrongKey');
  });

  it('errors if constructor fields could not be found.', async(): Promise<void> => {
    const component = objectLoader.getOrMakeResource(DF.namedNode('ex:Component'));
    delete component.property.constructorArguments.list![0].property.fields.list;

    const step = objectLoader.createCompactedResource({
      types: 'oo:OverrideMapEntry',
      overrideParameter: { '@id': 'ex:paramMap' },
      overrideTarget: '"key"',
    });

    expect(stepHandler.canHandle(config, step)).toBe(true);
    expect(() => stepHandler.handle(config, step)).toThrow('Unable to find key/value URIs for parameter ex:paramMap');
  });

  it('errors if constructor arguments could not be found.', async(): Promise<void> => {
    const component = objectLoader.getOrMakeResource(DF.namedNode('ex:Component'));
    delete component.property.constructorArguments.list;

    const step = objectLoader.createCompactedResource({
      types: 'oo:OverrideMapEntry',
      overrideParameter: { '@id': 'ex:paramMap' },
      overrideTarget: '"key"',
    });

    expect(stepHandler.canHandle(config, step)).toBe(true);
    expect(() => stepHandler.handle(config, step)).toThrow('Unable to find key/value URIs for parameter ex:paramMap');
  });
});
