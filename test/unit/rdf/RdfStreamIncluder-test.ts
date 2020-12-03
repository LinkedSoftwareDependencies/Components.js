import { RdfStreamIncluder } from '../../../lib/rdf/RdfStreamIncluder';

describe('RdfStreamIncluder', () => {
  describe('isValidIri', () => {
    it('should be false on an empty string', () => {
      expect(RdfStreamIncluder.isValidIri('')).toBeFalsy();
    });

    it('should be false without colon', () => {
      expect(RdfStreamIncluder.isValidIri('abc')).toBeFalsy();
    });

    it('should be false with one colon without //', () => {
      expect(RdfStreamIncluder.isValidIri('a:a')).toBeFalsy();
    });

    it('should be false with one colon with further //', () => {
      expect(RdfStreamIncluder.isValidIri('a:a//a')).toBeFalsy();
    });

    it('should be true with one colon followed by immediate //', () => {
      expect(RdfStreamIncluder.isValidIri('a://a')).toBeTruthy();
    });

    it('should be true with more than one colon', () => {
      expect(RdfStreamIncluder.isValidIri('a:a:a')).toBeTruthy();
      expect(RdfStreamIncluder.isValidIri('a:a:a:a')).toBeTruthy();
    });
  });
});
