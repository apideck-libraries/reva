import { Reva } from '.';

describe('Reva', () => {
  describe('.validate()', () => {
    describe('default behavior', () => {
      it('should handle valid requests', () => {
        const reva = new Reva();
        reva.validate({
          operation: { parameters: [{ in: 'query' }] },
          request: {},
        });
      });
    });
  });
});
