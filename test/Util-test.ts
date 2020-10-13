import Util = require('../lib/Util');

describe('Util', function () {

  describe('#captureType', function () {

    it('should capture strings', function () {
      expect(Util.captureType({ value: 'aaa', termType: 'Literal' }, { range: { value: Util.PREFIXES['xsd'] + 'string' }}))
        .toEqual({ value: 'aaa', termType: 'Literal' });
      expect(Util.captureType({ value: 'qqseqfqefefù$^', termType: 'Literal' }, { range: { value: Util.PREFIXES['xsd'] + 'string' }}))
        .toEqual({ value: 'qqseqfqefefù$^', termType: 'Literal' });
    });

    it('should capture booleans', function () {
      expect(Util.captureType({ value: 'true', termType: 'Literal' }, { range: { value: Util.PREFIXES['xsd'] + 'boolean' }}))
        .toEqual({ value: true, termType: 'Literal' });
      expect(Util.captureType({ value: 'false', termType: 'Literal' }, { range: { value: Util.PREFIXES['xsd'] + 'boolean' }}))
        .toEqual({ value: false, termType: 'Literal' });
    });
    it('should error on invalid booleans', function () {
      expect(() => Util.captureType({ value: '1', termType: 'Literal' }, { range: { value: Util.PREFIXES['xsd'] + 'boolean' }, value: 'param' }))
        .toThrow(new Error('1 is not of type http://www.w3.org/2001/XMLSchema#boolean for parameter param'));
    });

    it('should capture integers', function () {
      expect(Util.captureType({ value: '1', termType: 'Literal' }, { range: { value: Util.PREFIXES['xsd'] + 'integer' }}))
        .toEqual({ value: 1, termType: 'Literal' });
      expect(Util.captureType({ value: '456789876', termType: 'Literal' }, { range: { value: Util.PREFIXES['xsd'] + 'integer' }}))
        .toEqual({ value: 456789876, termType: 'Literal' });
    });
    it('should error on invalid integers', function () {
      expect(() => Util.captureType({ value: 'a', termType: 'Literal' }, { range: { value: Util.PREFIXES['xsd'] + 'integer' }, value: 'param' }))
        .toThrow(new Error('a is not of type http://www.w3.org/2001/XMLSchema#integer for parameter param'));
    });
    it('should error on invalid integers that are numbers', function () {
      expect(() => Util.captureType({ value: '1.12', termType: 'Literal' }, { range: { value: Util.PREFIXES['xsd'] + 'integer' }, value: 'param' }))
        .toThrow(new Error('1.12 is not of type http://www.w3.org/2001/XMLSchema#integer for parameter param'));
    });
    it('should capture numbers', function () {
      expect(Util.captureType({ value: '1', termType: 'Literal' }, { range: { value: Util.PREFIXES['xsd'] + 'number' }}))
        .toEqual({ value: 1, termType: 'Literal' });
      expect(Util.captureType({ value: '456789876', termType: 'Literal' }, { range: { value: Util.PREFIXES['xsd'] + 'number' }}))
        .toEqual({ value: 456789876, termType: 'Literal' });
    });
    it('should capture ints', function () {
      expect(Util.captureType({ value: '1', termType: 'Literal' }, { range: { value: Util.PREFIXES['xsd'] + 'int' }}))
        .toEqual({ value: 1, termType: 'Literal' });
      expect(Util.captureType({ value: '456789876', termType: 'Literal' }, { range: { value: Util.PREFIXES['xsd'] + 'int' }}))
        .toEqual({ value: 456789876, termType: 'Literal' });
    });
    it('should capture bytes', function () {
      expect(Util.captureType({ value: '1', termType: 'Literal' }, { range: { value: Util.PREFIXES['xsd'] + 'byte' }}))
        .toEqual({ value: 1, termType: 'Literal' });
      expect(Util.captureType({ value: '456789876', termType: 'Literal' }, { range: { value: Util.PREFIXES['xsd'] + 'byte' }}))
        .toEqual({ value: 456789876, termType: 'Literal' });
    });
    it('should capture longs', function () {
      expect(Util.captureType({ value: '1', termType: 'Literal' }, { range: { value: Util.PREFIXES['xsd'] + 'long' }}))
        .toEqual({ value: 1, termType: 'Literal' });
      expect(Util.captureType({ value: '456789876', termType: 'Literal' }, { range: { value: Util.PREFIXES['xsd'] + 'long' }}))
        .toEqual({ value: 456789876, termType: 'Literal' });
    });

    it('should capture floats', function () {
      expect(Util.captureType({ value: '1', termType: 'Literal' }, { range: { value: Util.PREFIXES['xsd'] + 'float' }}))
        .toEqual({ value: 1, termType: 'Literal' });
      expect(Util.captureType({ value: '256.36', termType: 'Literal' }, { range: { value: Util.PREFIXES['xsd'] + 'float' }}))
        .toEqual({ value: 256.36, termType: 'Literal' });
    });
    it('should error on invalid floats', function () {
      expect(() => Util.captureType({ value: 'a', termType: 'Literal' }, { range: { value: Util.PREFIXES['xsd'] + 'float' }, value: 'param' }))
        .toThrow(new Error('a is not of type http://www.w3.org/2001/XMLSchema#float for parameter param'));
    });
    it('should capture decimals', function () {
      expect(Util.captureType({ value: '1', termType: 'Literal' }, { range: { value: Util.PREFIXES['xsd'] + 'decimal' }}))
        .toEqual({ value: 1, termType: 'Literal' });
      expect(Util.captureType({ value: '256.36', termType: 'Literal' }, { range: { value: Util.PREFIXES['xsd'] + 'decimal' }}))
        .toEqual({ value: 256.36, termType: 'Literal' });
    });
    it('should capture doubles', function () {
      expect(Util.captureType({ value: '1', termType: 'Literal' }, { range: { value: Util.PREFIXES['xsd'] + 'double' }}))
        .toEqual({ value: 1, termType: 'Literal' });
      expect(Util.captureType({ value: '256.36', termType: 'Literal' }, { range: { value: Util.PREFIXES['xsd'] + 'double' }}))
        .toEqual({ value: 256.36, termType: 'Literal' });
    });

  });
});
