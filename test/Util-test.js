require('should');
const Util = require("../lib/Util");

describe('Util', function () {

  describe('#captureType', function () {

    it('should capture strings', function () {
      Util.captureType({ value: 'aaa', termType: 'Literal' }, Util.PREFIXES['xsd'] + 'string')
        .should.deepEqual({ value: 'aaa', termType: 'Literal' });
      Util.captureType({ value: 'qqseqfqefefù$^', termType: 'Literal' }, Util.PREFIXES['xsd'] + 'string')
        .should.deepEqual({ value: 'qqseqfqefefù$^', termType: 'Literal' });
    });

    it('should capture booleans', function () {
      Util.captureType({ value: 'true', termType: 'Literal' }, Util.PREFIXES['xsd'] + 'boolean')
        .should.deepEqual({ value: true, termType: 'Literal' });
      Util.captureType({ value: 'false', termType: 'Literal' }, Util.PREFIXES['xsd'] + 'boolean')
        .should.deepEqual({ value: false, termType: 'Literal' });
    });
    it('should error on invalid booleans', function () {
      (() => Util.captureType({ value: '1', termType: 'Literal' }, Util.PREFIXES['xsd'] + 'boolean')).should.throw();
    });

    it('should capture integers', function () {
      Util.captureType({ value: '1', termType: 'Literal' }, Util.PREFIXES['xsd'] + 'integer')
        .should.deepEqual({ value: 1, termType: 'Literal' });
      Util.captureType({ value: '456789876', termType: 'Literal' }, Util.PREFIXES['xsd'] + 'integer')
        .should.deepEqual({ value: 456789876, termType: 'Literal' });
    });
    it('should error on invalid integers', function () {
      (() => Util.captureType({ value: 'a', termType: 'Literal' }, Util.PREFIXES['xsd'] + 'integer')).should.throw();
    });
    it('should error on invalid integers that are numbers', function () {
      (() => Util.captureType({ value: '1.12', termType: 'Literal' }, Util.PREFIXES['xsd'] + 'integer')).should.throw();
    });
    it('should capture numbers', function () {
      Util.captureType({ value: '1', termType: 'Literal' }, Util.PREFIXES['xsd'] + 'number')
        .should.deepEqual({ value: 1, termType: 'Literal' });
      Util.captureType({ value: '456789876', termType: 'Literal' }, Util.PREFIXES['xsd'] + 'number')
        .should.deepEqual({ value: 456789876, termType: 'Literal' });
    });
    it('should capture ints', function () {
      Util.captureType({ value: '1', termType: 'Literal' }, Util.PREFIXES['xsd'] + 'int')
        .should.deepEqual({ value: 1, termType: 'Literal' });
      Util.captureType({ value: '456789876', termType: 'Literal' }, Util.PREFIXES['xsd'] + 'int')
        .should.deepEqual({ value: 456789876, termType: 'Literal' });
    });
    it('should capture bytes', function () {
      Util.captureType({ value: '1', termType: 'Literal' }, Util.PREFIXES['xsd'] + 'byte')
        .should.deepEqual({ value: 1, termType: 'Literal' });
      Util.captureType({ value: '456789876', termType: 'Literal' }, Util.PREFIXES['xsd'] + 'byte')
        .should.deepEqual({ value: 456789876, termType: 'Literal' });
    });
    it('should capture longs', function () {
      Util.captureType({ value: '1', termType: 'Literal' }, Util.PREFIXES['xsd'] + 'long')
        .should.deepEqual({ value: 1, termType: 'Literal' });
      Util.captureType({ value: '456789876', termType: 'Literal' }, Util.PREFIXES['xsd'] + 'long')
        .should.deepEqual({ value: 456789876, termType: 'Literal' });
    });

    it('should capture floats', function () {
      Util.captureType({ value: '1', termType: 'Literal' }, Util.PREFIXES['xsd'] + 'float')
        .should.deepEqual({ value: 1, termType: 'Literal' });
      Util.captureType({ value: '256.36', termType: 'Literal' }, Util.PREFIXES['xsd'] + 'float')
        .should.deepEqual({ value: 256.36, termType: 'Literal' });
    });
    it('should error on invalid floats', function () {
      (() => Util.captureType({ value: 'a', termType: 'Literal' }, Util.PREFIXES['xsd'] + 'float')).should.throw();
    });
    it('should capture decimals', function () {
      Util.captureType({ value: '1', termType: 'Literal' }, Util.PREFIXES['xsd'] + 'decimal')
        .should.deepEqual({ value: 1, termType: 'Literal' });
      Util.captureType({ value: '256.36', termType: 'Literal' }, Util.PREFIXES['xsd'] + 'decimal')
        .should.deepEqual({ value: 256.36, termType: 'Literal' });
    });
    it('should capture doubles', function () {
      Util.captureType({ value: '1', termType: 'Literal' }, Util.PREFIXES['xsd'] + 'double')
        .should.deepEqual({ value: 1, termType: 'Literal' });
      Util.captureType({ value: '256.36', termType: 'Literal' }, Util.PREFIXES['xsd'] + 'double')
        .should.deepEqual({ value: 256.36, termType: 'Literal' });
    });

  });
});
