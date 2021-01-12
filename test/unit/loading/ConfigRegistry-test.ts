import * as fs from 'fs';
import { RdfObjectLoader } from 'rdf-object';
import type { Logger } from 'winston';
import { ConfigRegistry } from '../../../lib/loading/ConfigRegistry';
import type { IModuleState } from '../../../lib/loading/ModuleStateBuilder';

describe('ConfigRegistry', () => {
  let moduleState: IModuleState;
  let objectLoader: RdfObjectLoader;
  let logger: Logger;
  let configRegistry: ConfigRegistry;
  beforeEach(() => {
    moduleState = <any>{
      mainModulePath: __dirname,
      componentModules: {},
    };
    objectLoader = new RdfObjectLoader({
      context: JSON.parse(fs.readFileSync(`${__dirname}/../../../components/context.jsonld`, 'utf8')),
    });
    logger = <any>{
      warn: jest.fn(),
    };
    configRegistry = new ConfigRegistry({
      moduleState,
      objectLoader,
      logger,
    });
  });

  describe('register', () => {
    it('should handle a valid module file', async() => {
      await configRegistry.register(`${__dirname}/../../assets/config-hello-world.jsonld`);
      expect(Object.keys(objectLoader.resources)
        .includes('http://example.org/myconfig')).toBeTruthy();
    });

    it('should throw on an invalid module file', async() => {
      await expect(configRegistry.register(`not-exists.jsonld`)).rejects.toThrow();
    });
  });

  describe('registerCustom', () => {
    it('should register a custom config of a given type', async() => {
      await configRegistry.registerCustom('ex:id', 'ex:myType', {
        'ex:paramA': 'A',
        'ex:paramB': 'B',
      });
      expect(objectLoader.resources[Object.keys(objectLoader.resources)[0]].toJSON()).toMatchObject({
        '@id': 'ex:id',
        properties: {
          'ex:paramA': [
            '"A"',
          ],
          'ex:paramB': [
            '"B"',
          ],
          'http://www.w3.org/1999/02/22-rdf-syntax-ns#type': [
            'ex:myType',
          ],
        },
      });
    });
  });
});
