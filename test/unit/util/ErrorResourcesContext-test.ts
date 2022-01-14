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
    expect(error.message).toEqual(`message
`);
    expect(error.context).toEqual({});
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
});
