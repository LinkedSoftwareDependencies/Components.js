import { DataFactory } from 'rdf-data-factory';
import type { RdfObjectLoader, Resource } from 'rdf-object';
import { OverrideParameters } from '../../../../lib/preprocess/overridesteps/OverrideParameters';
import { setupObjectLoader } from './OverrideTestUtil';

const DF = new DataFactory();

describe('OverrideParameters', (): void => {
  let objectLoader: RdfObjectLoader;
  let config: Resource;
  const stepHandler = new OverrideParameters();

  beforeEach(async() => {
    objectLoader = await setupObjectLoader();

    config = objectLoader.createCompactedResource({
      '@id': 'ex:myComponentInstance',
      types: 'ex:Component',
      'ex:param1': '"value1"',
      'ex:param2': '"value2"',
    });
  });

  it('can only handle OverrideParameters steps.', async(): Promise<void> => {
    let step = objectLoader.createCompactedResource({ types: 'oo:OverrideParameters' });
    expect(stepHandler.canHandle(config, step)).toBe(true);

    step = objectLoader.createCompactedResource({ types: 'oo:OverrideUnknown' });
    expect(stepHandler.canHandle(config, step)).toBe(false);
  });

  it('can override parameters.', async(): Promise<void> => {
    const step = objectLoader.createCompactedResource({
      types: 'oo:OverrideParameters',
      overrideValue: {
        'ex:param1': '"updatedValue"',
      },
    });

    expect(stepHandler.canHandle(config, step)).toBe(true);
    expect(stepHandler.handle(config, step)).toBe(config);

    expect(config.properties['ex:param1'][0].term).toEqual(DF.literal('updatedValue'));
    expect(config.properties['ex:param2'][0].term).toEqual(DF.literal('value2'));
  });

  it('can replace the type of an object.', async(): Promise<void> => {
    const step = objectLoader.createCompactedResource({
      types: 'oo:OverrideParameters',
      overrideValue: {
        '@type': 'ex:ExtraType',
        'ex:param3': '"hello"',
      },
    });

    expect(stepHandler.canHandle(config, step)).toBe(true);
    expect(stepHandler.handle(config, step)).toBe(config);

    expect(config.properties['ex:param3'][0].term).toEqual(DF.literal('hello'));
    expect(config.properties['ex:param1']).toHaveLength(0);
    expect(config.properties['ex:param2']).toHaveLength(0);
  });
});
