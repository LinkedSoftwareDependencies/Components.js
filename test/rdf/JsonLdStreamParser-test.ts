import { JsonLdStreamParser } from '../../lib/rdf/JsonLdStreamParser';
import * as fs from 'fs';

describe('JsonLdStreamParser', function () {
  describe('parsing a JSON-LD file', function () {
    let triples: any[] = [];
    beforeEach(function (done) {
      let tripleStream = new JsonLdStreamParser;
      fs.createReadStream(__dirname + '/../assets/triples.jsonld')
        .pipe(tripleStream);

      tripleStream.on('data', (triple) => triples.push(triple));
      tripleStream.on('end', done);
    });

    it('should return 2 triples', function () {
      expect(triples.length).toEqual(2);
      expect(triples).toContainEqual({
        subject: 'http://example.org/config',
        predicate: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
        object: 'http://example.org/HelloSomethingModule#SayHelloComponent'
      });
      expect(triples).toContainEqual({
        subject: 'http://example.org/config',
        predicate: 'http://example.org/hello#say',
        object: '"World"'
      });
    });
  });
});
