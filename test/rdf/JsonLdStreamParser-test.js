require('should');
const JsonLdStreamParser = require("../../lib/rdf/JsonLdStreamParser").JsonLdStreamParser;
const fs = require("fs");

describe('JsonLdStreamParser', function () {
  describe('parsing a JSON-LD file', function () {
    let triples = [];
    beforeEach(function (done) {
      let tripleStream = new JsonLdStreamParser;
      fs.createReadStream(__dirname + '/../assets/triples.jsonld')
        .pipe(tripleStream);

      tripleStream.on('data', (triple) => triples.push(triple));
      tripleStream.on('end', done);
    });

    it('should return 2 triples', function () {
      triples.length.should.equal(2);
      triples.should.have.containEql({
        subject: 'http://example.org/config',
        predicate: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
        object: 'http://example.org/HelloSomethingModule#SayHelloComponent'
      });
      triples.should.have.containEql({
        subject: 'http://example.org/config',
        predicate: 'http://example.org/hello#say',
        object: '"World"'
      });
    });
  });
});
