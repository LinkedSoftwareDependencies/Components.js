import 'jest-rdf';
import type { Term } from '@rdfjs/types';
import { DataFactory } from 'rdf-data-factory';
import type { RdfObjectLoader } from 'rdf-object';
import type { Logger } from 'winston';
import { ConfigPreprocessorOverride } from '../../../lib/preprocess/ConfigPreprocessorOverride';
import { IRIS_OO, PREFIX_OO } from '../../../lib/rdf/Iris';
import { setupObjectLoader } from './overrideSteps/OverrideTestUtil';

const DF = new DataFactory();

describe('ConfigPreprocessorOverride', () => {
  let objectLoader: RdfObjectLoader;
  let logger: Logger;
  let preprocessor: ConfigPreprocessorOverride;

  beforeEach(async() => {
    objectLoader = await setupObjectLoader();
    logger = <any> {
      warn: jest.fn(),
    };
    preprocessor = new ConfigPreprocessorOverride({
      objectLoader,
      componentResources: objectLoader.resources,
      logger,
    });
  });

  it('should not handle resources with no override', () => {
    const config = objectLoader.createCompactedResource({
      '@id': 'ex:myComponentInstance',
      types: 'ex:Component',
    });
    expect(preprocessor.canHandle(config)).toBeUndefined();
  });

  it('should handle resources with an override', () => {
    const config = objectLoader.createCompactedResource({
      '@id': 'ex:myComponentInstance',
      types: 'ex:Component',
    });
    const overrideInstance = objectLoader.createCompactedResource({
      '@id': 'ex:myOverride',
      types: 'oo:Override',
      overrideInstance: 'ex:myComponentInstance',
      overrideSteps: {
        '@type': 'OverrideParameters',
        overrideValue: {
          'ex:param1': '"hello"',
        },
      },
    });
    const overrideProperties =
      overrideInstance.property[IRIS_OO.overrideSteps].property[PREFIX_OO('overrideValue')].property;
    const override = preprocessor.canHandle(config);
    expect(override).toBeDefined();
    expect(override).toHaveLength(1);

    preprocessor.transform(config, override!);
    expect(config.property['ex:param1']).toBe(overrideProperties['ex:param1']);
  });

  it('should handle resources with an override in the simplified format', () => {
    const config = objectLoader.createCompactedResource({
      '@id': 'ex:myComponentInstance',
      types: 'ex:Component',
    });
    const overrideInstance = objectLoader.createCompactedResource({
      '@id': 'ex:myOverride',
      types: 'oo:Override',
      overrideInstance: 'ex:myComponentInstance',
      overrideParameters: {
        'ex:param1': '"hello"',
      },
    });
    const overrideProperties = overrideInstance.property[IRIS_OO.overrideParameters].property;
    const override = preprocessor.canHandle(config);
    expect(override).toBeDefined();
    expect(override).toHaveLength(1);

    preprocessor.transform(config, override!);
    expect(config.property['ex:param1']).toBe(overrideProperties['ex:param1']);
  });

  it('can perform multiple steps in a single override.', async(): Promise<void> => {
    // This tests all the step handlers in the ConfigPreprocessorOverride
    const config = objectLoader.createCompactedResource({
      '@id': 'ex:myComponentInstance',
      types: 'ex:Component',
      'ex:param1': '"value1"',
      'ex:param2': '"value2"',
      'ex:paramList': {
        list: [ '"list1"', '"list2"', '"list3"', '"list4"' ],
      },
      'ex:paramMap': {
        list: [
          {
            'ex:paramMap_key': '"key"',
            'ex:paramMap_value': '"value"',
          },
        ],
      },
    });

    objectLoader.createCompactedResource({
      '@id': 'ex:myOverride',
      types: 'oo:Override',
      overrideInstance: 'ex:myComponentInstance',
      overrideSteps: { list: [
        {
          '@type': 'OverrideParameters',
          overrideValue: {
            'ex:param1': '"newValue1"',
            'ex:paramList': { list: [ '"newList1"', '"newList2"', '"newList3"' ]},
          },
        },
        {
          '@type': 'OverrideListInsertAfter',
          overrideParameter: { '@id': 'ex:paramList' },
          overrideTarget: '"newList2"',
          overrideValue: '"addedAfter"',
        },
        {
          '@type': 'OverrideListInsertBefore',
          overrideParameter: { '@id': 'ex:paramList' },
          overrideTarget: '"addedAfter"',
          overrideValue: '"addedBefore"',
        },
        {
          '@type': 'OverrideListRemove',
          overrideParameter: { '@id': 'ex:paramList' },
          overrideTarget: '"newList1"',
        },
        {
          '@type': 'OverrideListInsertAt',
          overrideParameter: { '@id': 'ex:paramList' },
          overrideTarget: '2',
          overrideValue: { list: [ '"addedAt1"', '"addedAt2"' ]},
        },
        {
          '@type': 'OverrideMapEntry',
          overrideParameter: { '@id': 'ex:paramMap' },
          overrideTarget: '"key"',
          overrideValue: '"updatedValue"',
        },
      ]},
    });
    const override = preprocessor.canHandle(config)!;

    const { rawConfig, finishTransformation } = preprocessor.transform(config, override);
    expect(finishTransformation).toBe(false);
    expect(rawConfig).toBe(config);
    expect(rawConfig.properties['ex:param1'][0].term).toEqual(DF.literal('newValue1'));
    expect(rawConfig.properties['ex:param2'][0].term).toEqual(DF.literal('value2'));
    expect(config.properties['ex:paramList'][0].list?.map(res => res.term))
      .toEqual([
        DF.literal('newList2'),
        DF.literal('addedBefore'),
        DF.literal('addedAt1'),
        DF.literal('addedAt2'),
        DF.literal('addedAfter'),
        DF.literal('newList3'),
      ]);
    const entryList = config.property['ex:paramMap'].list;
    const entries = entryList?.map((entry): { key: Term; value: Term } => ({
      key: entry.property['ex:paramMap_key'].term,
      value: entry.property['ex:paramMap_value'].term,
    }));
    expect(entries).toEqual([
      { key: DF.literal('key'), value: DF.literal('updatedValue') },
    ]);
  });

  it('can chain overrides', () => {
    const config = objectLoader.createCompactedResource({
      '@id': 'ex:myComponentInstance',
      types: 'ex:Component',
      'ex:param1': '"value1"',
      'ex:param2': '"value2"',
    });
    objectLoader.createCompactedResource({
      '@id': 'ex:myOverride1',
      types: 'oo:Override',
      overrideInstance: 'ex:myComponentInstance',
      overrideParameters: {
        'ex:param1': '"value1-1"',
        'ex:param2': '"value2-1"',
      },
    });
    objectLoader.createCompactedResource({
      '@id': 'ex:myOverride2',
      types: 'oo:Override',
      overrideInstance: 'ex:myOverride1',
      overrideSteps: {
        '@type': 'OverrideParameters',
        overrideValue: {
          'ex:param1': '"value1-2"',
        },
      },
    });
    const override = preprocessor.canHandle(config)!;

    const { rawConfig, finishTransformation } = preprocessor.transform(config, override);
    expect(finishTransformation).toBe(false);
    expect(rawConfig).toBe(config);
    expect(rawConfig.properties['ex:param1'][0].term).toEqual(DF.literal('value1-2'));
    expect(rawConfig.properties['ex:param2'][0].term).toEqual(DF.literal('value2-1'));
  });

  it('caches the override steps', () => {
    const config = objectLoader.createCompactedResource({
      '@id': 'ex:myComponentInstance',
      types: 'ex:Component',
    });
    const overrideInstance1 = objectLoader.createCompactedResource({
      '@id': 'ex:myOverride1',
      types: 'oo:Override',
      overrideInstance: 'ex:myComponentInstance',
      overrideParameters: {
        'ex:param1': '"value1-1"',
      },
    });
    const override1Properties = overrideInstance1.property[IRIS_OO.overrideParameters].property;
    let override = preprocessor.canHandle(config);
    expect(override).not.toBeUndefined();
    expect(override).toHaveLength(1);

    objectLoader.createCompactedResource({
      '@id': 'ex:myOverride2',
      types: 'oo:Override',
      overrideInstance: 'ex:myOverride1',
      overrideParameters: {
        'ex:param1': '"value1-2"',
      },
    });
    // `ex:myOverride2` will not be applied due to cache
    override = preprocessor.canHandle(config);
    expect(override).not.toBeUndefined();
    expect(override).toHaveLength(1);
    preprocessor.transform(config, override!);
    expect(config.property['ex:param1']).toBe(override1Properties['ex:param1']);
    expect(config.property['ex:param1'].value).toBe('value1-1');
  });

  it('can reset the override cache', () => {
    const config = objectLoader.createCompactedResource({
      '@id': 'ex:myComponentInstance',
      types: 'ex:Component',
    });
    const overrideInstance1 = objectLoader.createCompactedResource({
      '@id': 'ex:myOverride1',
      types: 'oo:Override',
      overrideInstance: 'ex:myComponentInstance',
      overrideParameters: {
        'ex:param1': '"value1-1"',
      },
    });

    let override = preprocessor.canHandle(config);
    expect(override).not.toBeUndefined();
    expect(override).toHaveLength(1);

    const overrideInstance2 = objectLoader.createCompactedResource({
      '@id': 'ex:myOverride2',
      types: 'oo:Override',
      overrideInstance: 'ex:myOverride1',
      overrideParameters: {
        'ex:param1': '"value1-2"',
      },
    });
    const override2Properties = overrideInstance2.property[IRIS_OO.overrideParameters].property;
    // `ex:myOverride2` is applied if we reset
    preprocessor.reset();
    override = preprocessor.canHandle(config);
    expect(override).not.toBeUndefined();
    expect(override).toHaveLength(2);
    preprocessor.transform(config, override!);
    expect(config.property['ex:param1']).toBe(override2Properties['ex:param1']);
    expect(config.property['ex:param1'].value).toBe('value1-2');
  });

  it('logs a warning if if an Override has no target', () => {
    const config = objectLoader.createCompactedResource({
      '@id': 'ex:myComponentInstance',
      types: 'ex:Component',
    });
    objectLoader.createCompactedResource({
      '@id': 'ex:myOverride',
      types: 'oo:Override',
      overrideInstance: 'ex:myComponentInstance',
    });
    expect(preprocessor.canHandle(config)).toBeUndefined();
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenLastCalledWith(`No steps found for Override ex:myOverride. This Override will be ignored.`);
  });

  it('logs a warning if if an Override has no steps', () => {
    const config = objectLoader.createCompactedResource({
      '@id': 'ex:myComponentInstance',
      types: 'ex:Component',
    });
    objectLoader.createCompactedResource({
      '@id': 'ex:myOverride',
      types: 'oo:Override',
      overrideParameters: {
        'ex:param1': '"hello"',
      },
    });
    expect(preprocessor.canHandle(config)).toBeUndefined();
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenLastCalledWith(`Missing overrideInstance for ex:myOverride. This Override will be ignored.`);
  });

  it('errors if an Override has multiple targets', () => {
    const config = objectLoader.createCompactedResource({
      '@id': 'ex:myComponentInstance',
      types: 'ex:Component',
    });
    objectLoader.createCompactedResource({
      '@id': 'ex:myOverride',
      types: 'oo:Override',
      overrideInstance: [ 'ex:myComponentInstance', 'ex:myComponentInstance2' ],
      overrideParameters: {
        'ex:param1': '"hello"',
      },
    });
    expect(() => preprocessor.canHandle(config)).toThrow(`Detected multiple overrideInstance targets for ex:myOverride`);
  });

  it('errors if an Override has multiple steps without using a list', () => {
    const config = objectLoader.createCompactedResource({
      '@id': 'ex:myComponentInstance',
      types: 'ex:Component',
    });
    objectLoader.createCompactedResource({
      '@id': 'ex:myOverride',
      types: 'oo:Override',
      overrideInstance: 'ex:myComponentInstance',
      overrideSteps: [{}, {}],
    });
    expect(() => preprocessor.canHandle(config))
      .toThrow(`Detected multiple values for overrideSteps in Override ex:myOverride. RDF lists should be used for defining multiple values.`);
  });

  it('errors if a resource has multiple Overrides targeting it', () => {
    const config = objectLoader.createCompactedResource({
      '@id': 'ex:myComponentInstance',
      types: 'ex:Component',
    });
    objectLoader.createCompactedResource({
      '@id': 'ex:myOverride1',
      types: 'oo:Override',
      overrideInstance: 'ex:myComponentInstance',
      overrideParameters: {
        'ex:param1': '"hello"',
      },
    });
    objectLoader.createCompactedResource({
      '@id': 'ex:myOverride2',
      types: 'oo:Override',
      overrideInstance: 'ex:myComponentInstance',
      overrideParameters: {
        'ex:param1': '"hello"',
      },
    });
    expect(() => preprocessor.canHandle(config)).toThrow(`Found multiple Overrides targeting ex:myComponentInstance`);
  });

  it('errors if an override target has no type', () => {
    const config = objectLoader.createCompactedResource({
      '@id': 'ex:myComponentInstance',
    });
    objectLoader.createCompactedResource({
      '@id': 'ex:myOverride',
      types: 'oo:Override',
      overrideInstance: 'ex:myComponentInstance',
      overrideParameters: {
        'ex:param1': '"hello"',
      },
    });
    expect(() => preprocessor.canHandle(config)).toThrow(`Missing type for override target ex:myComponentInstance of Override ex:myOverride`);
  });

  it('errors if an override target has multiple types', () => {
    const config = objectLoader.createCompactedResource({
      '@id': 'ex:myComponentInstance',
      types: [ 'ex:Component', 'ex:ExtraType' ],
    });
    objectLoader.createCompactedResource({
      '@id': 'ex:myOverride',
      types: 'oo:Override',
      overrideInstance: 'ex:myComponentInstance',
      overrideParameters: {
        'ex:param1': '"hello"',
      },
    });
    expect(() => preprocessor.canHandle(config)).toThrow(`Found multiple types for override target ex:myComponentInstance of Override ex:myOverride`);
  });

  it('does not error if the multiple types are duplicates', () => {
    const config = objectLoader.createCompactedResource({
      '@id': 'ex:myComponentInstance',
      types: [ 'ex:Component', 'ex:Component' ],
    });
    const overrideInstance = objectLoader.createCompactedResource({
      '@id': 'ex:myOverride',
      types: 'oo:Override',
      overrideInstance: 'ex:myComponentInstance',
      overrideParameters: {
        'ex:param1': '"hello"',
      },
    });
    const overrideProperties = overrideInstance.property[IRIS_OO.overrideParameters].property;
    const override = preprocessor.canHandle(config);
    expect(override).not.toBeUndefined();
    expect(override).toHaveLength(1);
    expect(() => preprocessor.transform(config, override!)).not.toThrow();
    expect(config.property['ex:param1']).toBe(overrideProperties['ex:param1']);
  });

  it('errors if an Override has multiple overrideParameters objects', () => {
    const config = objectLoader.createCompactedResource({
      '@id': 'ex:myComponentInstance',
      types: 'ex:Component',
    });
    objectLoader.createCompactedResource({
      '@id': 'ex:myOverride',
      types: 'oo:Override',
      overrideInstance: 'ex:myComponentInstance',
      overrideParameters: [
        { 'ex:param1': '"hello"' },
        { 'ex:param1': '"bye"' },
      ],
    });
    expect(() => preprocessor.canHandle(config)).toThrow(`Detected multiple values for overrideParameters in Override ex:myOverride`);
  });

  it('errors if no override handler supports a specific step', () => {
    const config = objectLoader.createCompactedResource({
      '@id': 'ex:myComponentInstance',
      types: 'ex:Component',
    });
    objectLoader.createCompactedResource({
      '@id': 'ex:myOverride',
      types: 'oo:Override',
      overrideInstance: 'ex:myComponentInstance',
      overrideSteps: {
        '@type': 'UnknownOverride',
      },
    });
    const override = preprocessor.canHandle(config);
    expect(() => preprocessor.transform(config, override!)).toThrow(`Found no handler supporting an override step of type UnknownOverride`);
  });
});
