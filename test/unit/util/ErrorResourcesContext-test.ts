import * as fs from 'fs';
import { RdfObjectLoader } from 'rdf-object/lib/RdfObjectLoader';
import { ErrorResourcesContext } from '../../../lib/util/ErrorResourcesContext';

describe('ErrorResourcesContext', () => {
  let objectLoader: RdfObjectLoader;

  beforeEach(async() => {
    objectLoader = new RdfObjectLoader({
      context: JSON.parse(fs.readFileSync(`${__dirname}/../../../components/context.jsonld`, 'utf8')),
    });
    await objectLoader.context;
  });

  it('with empty context', async() => {
    const error = new ErrorResourcesContext('message', {});
    expect(error.name).toEqual('ErrorResourcesContext');
    expect(error.message).toEqual(`message`);
    expect(error.exportContext()).toEqual({});
  });

  it('with non-empty context', async() => {
    const ctx = {
      a: objectLoader.createCompactedResource({}),
      b: objectLoader.createCompactedResource({
        x: '"X"',
      }),
      c: 'C',
      d: objectLoader.createCompactedResource({
        list: [
          '"1"',
          '"2"',
        ],
      }),
      e: [
        objectLoader.createCompactedResource({}),
        objectLoader.createCompactedResource({}),
      ],
      f: undefined,
    };
    const error = new ErrorResourcesContext('message', ctx);
    expect(error.name).toEqual('ErrorResourcesContext');
    expect(error.message).toBeTruthy();
    expect(error.context).toBe(ctx);
  });

  describe('contextToJson', () => {
    it('for a filled context', () => {
      expect(ErrorResourcesContext.contextToJson({
        a: '1',
        b: [ objectLoader.createCompactedResource('"2"') ],
        c: objectLoader.createCompactedResource('"3"'),
        d: undefined,
        e: { description: 'descr', context: { a: 'b' }},
        f: { a: '1' },
      })).toEqual({
        a: '1',
        b: [ '"2"' ],
        c: '"3"',
        d: undefined,
        e: { description: 'descr', context: { a: 'b' }},
        f: { a: '1' },
      });
    });
  });

  describe('resourceToJson', () => {
    it('for an undefined resource', () => {
      // eslint-disable-next-line unicorn/no-useless-undefined
      expect(ErrorResourcesContext.resourceToJson(undefined)).toEqual(undefined);
    });

    it('for a defined resource', () => {
      expect(ErrorResourcesContext.resourceToJson(objectLoader.createCompactedResource({
        '@id': 'ex:a',
        value: '"A"',
      }))).toEqual({
        '@id': 'ex:a',
        properties: {
          'https://linkedsoftwaredependencies.org/vocabularies/object-mapping#fieldValue': [
            '"A"',
          ],
        },
      });
    });
  });

  describe('conflictToJson', () => {
    it('for no inner causes', () => {
      expect(ErrorResourcesContext.conflictToJson({
        description: 'cause',
        context: {
          a: 'A',
          b: 'B',
        },
      })).toEqual({
        context: {
          a: 'A',
          b: 'B',
        },
        description: 'cause',
      });
    });

    it('for inner causes', () => {
      expect(ErrorResourcesContext.conflictToJson({
        description: 'cause',
        context: {
          a: 'A',
          b: 'B',
        },
        causes: [
          {
            description: 'causeinner1',
            context: {
              a: 'A',
              b: 'B',
            },
          },
          {
            description: 'causeinner2',
            context: {
              a: 'A',
              b: 'B',
            },
          },
        ],
      })).toEqual({
        causes: [
          {
            context: {
              a: 'A',
              b: 'B',
            },
            description: 'causeinner1',
          },
        ],
        description: 'cause',
      });
    });
  });
});
