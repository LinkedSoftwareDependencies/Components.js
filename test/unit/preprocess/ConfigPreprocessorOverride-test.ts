import 'jest-rdf';
import * as fs from 'fs';
import { DataFactory } from 'rdf-data-factory';
import type { Resource } from 'rdf-object';
import { RdfObjectLoader } from 'rdf-object';
import type { Logger } from 'winston';
import { ConfigPreprocessorOverride } from '../../../lib/preprocess/ConfigPreprocessorOverride';
import { IRIS_OO } from '../../../lib/rdf/Iris';

const DF = new DataFactory();

describe('ConfigPreprocessorOverride', () => {
  let objectLoader: RdfObjectLoader;
  let componentResources: Record<string, Resource>;
  let logger: Logger;
  let preprocessor: ConfigPreprocessorOverride;

  beforeEach(async() => {
    objectLoader = new RdfObjectLoader({
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
    logger = <any> {
      warn: jest.fn(),
    };
    preprocessor = new ConfigPreprocessorOverride({
      objectLoader,
      componentResources,
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
      overrideParameters: {
        'ex:param1': '"hello"',
      },
    });
    const overrideProperties = overrideInstance.properties[IRIS_OO.overrideParameters][0].properties;
    const override = preprocessor.canHandle(config);
    expect(override).not.toBeUndefined();
    expect(Object.keys(override!).length).toBe(1);
    expect(override!['ex:param1']).toBe(overrideProperties['ex:param1'][0]);
  });

  it('should only override the relevant parameters of a resource', () => {
    const config = objectLoader.createCompactedResource({
      '@id': 'ex:myComponentInstance',
      types: 'ex:Component',
      'ex:param1': '"value1"',
      'ex:param2': '"value2"',
    });
    const overrideInstance = objectLoader.createCompactedResource({
      '@id': 'ex:myOverride',
      types: 'oo:Override',
      overrideInstance: 'ex:myComponentInstance',
      overrideParameters: {
        'ex:param1': '"updatedValue"',
      },
    });
    const overrideProperties = overrideInstance.properties[IRIS_OO.overrideParameters][0].properties;
    const override = preprocessor.canHandle(config)!;
    const { rawConfig, finishTransformation } = preprocessor.transform(config, override);
    expect(finishTransformation).toBe(false);
    expect(rawConfig).toBe(config);
    expect(rawConfig.properties['ex:param1'][0]).toBe(overrideProperties['ex:param1'][0]);
    expect(rawConfig.properties['ex:param1'][0].value).toBe('updatedValue');
    expect(rawConfig.properties['ex:param2'][0].value).toBe('value2');
  });

  it('can chain overrides', () => {
    const config = objectLoader.createCompactedResource({
      '@id': 'ex:myComponentInstance',
      types: 'ex:Component',
      'ex:param1': '"value1"',
      'ex:param2': '"value2"',
    });
    const overrideInstance1 = objectLoader.createCompactedResource({
      '@id': 'ex:myOverride1',
      types: 'oo:Override',
      overrideInstance: 'ex:myComponentInstance',
      overrideParameters: {
        'ex:param1': '"value1-1"',
        'ex:param2': '"value2-1"',
      },
    });
    const overrideInstance2 = objectLoader.createCompactedResource({
      '@id': 'ex:myOverride2',
      types: 'oo:Override',
      overrideInstance: 'ex:myOverride1',
      overrideParameters: {
        'ex:param1': '"value1-2"',
      },
    });
    const override1Properties = overrideInstance1.properties[IRIS_OO.overrideParameters][0].properties;
    const override2Properties = overrideInstance2.properties[IRIS_OO.overrideParameters][0].properties;
    const override = preprocessor.canHandle(config)!;
    const { rawConfig, finishTransformation } = preprocessor.transform(config, override);
    expect(finishTransformation).toBe(false);
    expect(rawConfig).toBe(config);
    expect(rawConfig.properties['ex:param1'][0]).toBe(override2Properties['ex:param1'][0]);
    expect(rawConfig.properties['ex:param1'][0].value).toBe('value1-2');
    expect(rawConfig.properties['ex:param2'][0]).toBe(override1Properties['ex:param2'][0]);
    expect(rawConfig.properties['ex:param2'][0].value).toBe('value2-1');
  });

  it('caches the overrides', () => {
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
    const override1Properties = overrideInstance1.properties[IRIS_OO.overrideParameters][0].properties;
    let override = preprocessor.canHandle(config);
    expect(override).not.toBeUndefined();
    expect(Object.keys(override!).length).toBe(1);
    expect(override!['ex:param1']).toBe(override1Properties['ex:param1'][0]);

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
    expect(Object.keys(override!).length).toBe(1);
    expect(override!['ex:param1']).toBe(override1Properties['ex:param1'][0]);
    expect(override!['ex:param1'].value).toBe('value1-1');
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
    const override1Properties = overrideInstance1.properties[IRIS_OO.overrideParameters][0].properties;
    let override = preprocessor.canHandle(config);
    expect(override).not.toBeUndefined();
    expect(Object.keys(override!).length).toBe(1);
    expect(override!['ex:param1']).toBe(override1Properties['ex:param1'][0]);

    const overrideInstance2 = objectLoader.createCompactedResource({
      '@id': 'ex:myOverride2',
      types: 'oo:Override',
      overrideInstance: 'ex:myOverride1',
      overrideParameters: {
        'ex:param1': '"value1-2"',
      },
    });
    const override2Properties = overrideInstance2.properties[IRIS_OO.overrideParameters][0].properties;
    // `ex:myOverride2` is applied if we reset
    preprocessor.reset();
    override = preprocessor.canHandle(config);
    expect(override).not.toBeUndefined();
    expect(Object.keys(override!).length).toBe(1);
    expect(override!['ex:param1']).toBe(override2Properties['ex:param1'][0]);
    expect(override!['ex:param1'].value).toBe('value1-2');
  });

  it('logs a warning if if an Override has no target', () => {
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

  it('logs a warning if there is an Override with no specified parameters', () => {
    const config = objectLoader.createCompactedResource({
      '@id': 'ex:myComponentInstance',
      types: 'ex:Component',
    });
    objectLoader.createCompactedResource({
      '@id': 'ex:myOverride',
      types: 'oo:Override',
      overrideInstance: 'ex:myComponentInstance',
    });
    preprocessor.canHandle(config);
    expect(preprocessor.canHandle(config)).toBeUndefined();
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenLastCalledWith(`No overrideParameters found for ex:myOverride.`);
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
    const overrideProperties = overrideInstance.properties[IRIS_OO.overrideParameters][0].properties;
    const override = preprocessor.canHandle(config);
    expect(override).not.toBeUndefined();
    expect(Object.keys(override!).length).toBe(1);
    expect(override!['ex:param1']).toBe(overrideProperties['ex:param1'][0]);
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

  it('errors if an overrideParameters entry has multiple values', () => {
    const config = objectLoader.createCompactedResource({
      '@id': 'ex:myComponentInstance',
      types: 'ex:Component',
    });
    objectLoader.createCompactedResource({
      '@id': 'ex:myOverride',
      types: 'oo:Override',
      overrideInstance: 'ex:myComponentInstance',
      overrideParameters: {
        'ex:param1': [ '"hello"', '"bye"' ],
      },
    });
    expect(() => preprocessor.canHandle(config)).toThrow(`Detected multiple values for override parameter ex:param1 in Override ex:myOverride. RDF lists should be used for defining multiple values.`);
  });

  it('can replace the type of an object.', async(): Promise<void> => {
    const config = objectLoader.createCompactedResource({
      '@id': 'ex:myComponentInstance',
      types: 'ex:Component',
      'ex:param1': '"value1"',
      'ex:param2': '"value2"',
    });
    const overrideInstance = objectLoader.createCompactedResource({
      '@id': 'ex:myOverride',
      types: 'oo:Override',
      overrideInstance: 'ex:myComponentInstance',
      overrideParameters: {
        '@type': 'ex:ExtraType',
        'ex:param3': '"hello"',
      },
    });
    const overrideProperties = overrideInstance.properties[IRIS_OO.overrideParameters][0].properties;
    const override = preprocessor.canHandle(config)!;
    const { rawConfig, finishTransformation } = preprocessor.transform(config, override);
    expect(finishTransformation).toBe(false);
    expect(rawConfig).toBe(config);
    expect(rawConfig.properties['ex:param3'][0]).toBe(overrideProperties['ex:param3'][0]);
    expect(rawConfig.properties['ex:param1']).toHaveLength(0);
    expect(rawConfig.properties['ex:param2']).toHaveLength(0);
  });

  it('can chain type changes', () => {
    const config = objectLoader.createCompactedResource({
      '@id': 'ex:myComponentInstance',
      types: 'ex:Component',
      'ex:param1': '"value1"',
      'ex:param2': '"value2"',
    });
    const overrideInstance1 = objectLoader.createCompactedResource({
      '@id': 'ex:myOverride1',
      types: 'oo:Override',
      overrideInstance: 'ex:myComponentInstance',
      overrideParameters: {
        'ex:param1': '"value1-1"',
      },
    });
    const overrideInstance2 = objectLoader.createCompactedResource({
      '@id': 'ex:myOverride2',
      types: 'oo:Override',
      overrideInstance: 'ex:myOverride1',
      overrideParameters: {
        '@type': 'ex:ExtraType',
        'ex:param3': '"value3"',
        'ex:param4': '"value4"',
      },
    });
    const overrideInstance3 = objectLoader.createCompactedResource({
      '@id': 'ex:myOverride3',
      types: 'oo:Override',
      overrideInstance: 'ex:myOverride2',
      overrideParameters: {
        'ex:param4': '"value4-2"',
      },
    });
    const override2Properties = overrideInstance2.properties[IRIS_OO.overrideParameters][0].properties;
    const override3Properties = overrideInstance3.properties[IRIS_OO.overrideParameters][0].properties;
    const override = preprocessor.canHandle(config)!;
    const { rawConfig, finishTransformation } = preprocessor.transform(config, override);
    expect(finishTransformation).toBe(false);
    expect(rawConfig).toBe(config);
    expect(rawConfig.properties['ex:param1']).toHaveLength(0);
    expect(rawConfig.properties['ex:param2']).toHaveLength(0);
    expect(rawConfig.properties['ex:param3'][0]).toBe(override2Properties['ex:param3'][0]);
    expect(rawConfig.properties['ex:param3'][0].value).toBe('value3');
    expect(rawConfig.properties['ex:param4'][0]).toBe(override3Properties['ex:param4'][0]);
    expect(rawConfig.properties['ex:param4'][0].value).toBe('value4-2');
  });
});
