import { Reva } from '.';

describe('Reva', () => {
  describe('.validate()', () => {
    describe('valid requests', () => {
      it('should validate queryParameters (coerce types)', () => {
        const reva = new Reva();
        const result = reva.validate({
          operation: {
            parameters: [
              {
                in: 'query',
                name: 'foo',
                required: true,
                schema: { type: 'string' },
              },
              {
                in: 'query',
                name: 'bar',
                required: true,
                schema: { type: 'number' },
              },
            ],
          },
          request: {
            queryParameters: {
              foo: 'foo',
              bar: '5',
            },
          },
        });
        expect(result.ok).toBe(true);
      });

      it('should validate headers (case-insensitive + content schema)', () => {
        const reva = new Reva();
        const result = reva.validate({
          operation: {
            parameters: [
              {
                in: 'header',
                name: 'X-My-Header',
                required: true,
                schema: { type: 'number' },
              },
              {
                in: 'header',
                name: 'X-JSON-Header',
                required: true,
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      required: ['foo'],
                      additionalProperties: false,
                      properties: { foo: { type: 'boolean' } },
                    },
                  },
                },
              },
            ],
          },
          request: {
            headers: {
              'x-my-header': '53032',
              'x-json-header': '{"foo":true}',
            },
          },
        });
        expect(result.ok).toBe(true);
      });

      it('should validate pathParameters', () => {
        const reva = new Reva();
        const result = reva.validate({
          operation: {
            parameters: [
              {
                in: 'path',
                name: 'id',
                required: true,
                schema: { type: 'number' },
              },
            ],
          },
          request: {
            pathParameters: { id: '123' },
          },
        });

        expect(result.ok).toBe(true);
      });

      it('should validate body', () => {
        const reva = new Reva();
        const result = reva.validate({
          operation: {
            requestBody: {
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['foo', 'id'],
                    additionalProperties: false,
                    properties: {
                      foo: { type: 'boolean' },
                      bar: { type: 'string' },
                      id: { type: 'string', readOnly: true },
                    },
                  },
                },
              },
            },
          },
          request: {
            body: {
              foo: true,
              bar: 'value',
            },
          },
        });

        expect(result.ok).toBe(true);
      });

      it('should validate a full request', () => {
        const reva = new Reva();
        const result = reva.validate({
          operation: {
            parameters: [
              {
                in: 'path',
                name: 'id',
                required: true,
                schema: { type: 'number' },
              },
              {
                in: 'header',
                name: 'X-My-Header',
                required: true,
                schema: { type: 'number' },
              },
              {
                in: 'cookie',
                name: 'Key',
                required: true,
                schema: { type: 'boolean' },
              },
              {
                in: 'query',
                name: 'search',
                required: true,
                schema: { type: 'string' },
              },
            ],
            requestBody: {
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['foo', 'id'],
                    additionalProperties: false,
                    properties: {
                      foo: { type: 'boolean' },
                      bar: { type: 'string' },
                      id: { type: 'string', readOnly: true },
                    },
                  },
                },
              },
            },
          },
          request: {
            headers: {
              'x-my-header': '323',
              cookie: 'Key=true',
            },
            pathParameters: { id: '123' },
            queryParameters: { search: 'foo' },
            body: {
              foo: true,
              bar: 'value',
            },
          },
        });

        expect(result.ok).toBe(true);
      });

      it('should handle wildcard Content-Type', () => {
        const reva = new Reva();
        const result = reva.validate({
          operation: {
            requestBody: {
              content: {
                '*/*': {
                  schema: {
                    type: 'object',
                    properties: {
                      foo: {
                        type: 'string',
                      },
                    },
                  },
                },
              },
            },
          },
          request: {
            headers: {
              'Content-Type': 'anything',
            },
            body: {},
          },
        });

        expect(result.ok).toBe(true);
      });
    });

    describe('invalid requests', () => {
      it('should handle missing required parameters', () => {
        const reva = new Reva();
        const result = reva.validate({
          operation: {
            parameters: [
              {
                in: 'query',
                name: 'foo',
                required: true,
                schema: { type: 'string' },
              },
              {
                in: 'header',
                name: 'X-Foo',
                required: true,
                schema: { type: 'string' },
              },
              {
                in: 'cookie',
                name: 'Foo',
                required: true,
                schema: { type: 'string' },
              },
              {
                in: 'path',
                name: 'id',
                required: true,
                schema: { type: 'string' },
              },
            ],
          },
          request: {
            headers: {},
            body: {},
            pathParameters: {},
            queryParameters: {},
          },
        });

        expect(result.ok).toBe(false);
        expect(result).toMatchSnapshot();
      });

      it('should handle additional parameters (query & path)', () => {
        const reva = new Reva();
        const result = reva.validate({
          operation: {
            parameters: [
              {
                in: 'query',
                name: 'foo',
                required: false,
                schema: { type: 'string' },
              },
              {
                in: 'header',
                name: 'X-Foo',
                required: false,
                schema: { type: 'string' },
              },
              {
                in: 'cookie',
                name: 'Foo',
                required: false,
                schema: { type: 'string' },
              },
              {
                in: 'path',
                name: 'id',
                required: true,
                schema: { type: 'string' },
              },
            ],
          },
          request: {
            headers: {
              other: '2',
              Cookie: 'Other=2',
            },
            body: {},
            pathParameters: {
              id: '123',
              other: '2',
            },
            queryParameters: {
              other: '2',
            },
          },
        });

        expect(result.ok).toBe(false);
        expect(result).toMatchSnapshot();
      });

      it('should handle unsupported Content-Type', () => {
        const reva = new Reva();
        const result = reva.validate({
          operation: {
            requestBody: {
              content: {
                'x-www-form-urlencoded': {
                  schema: {
                    type: 'object',
                    properties: {
                      foo: {
                        type: 'string',
                      },
                    },
                  },
                },
              },
            },
          },
          request: {
            headers: {
              'Content-Type': 'application/json',
            },
            body: {},
          },
        });

        expect(result.ok).toBe(false);
        expect(result).toMatchSnapshot();
      });

      it('should handle invalid body', () => {
        const reva = new Reva();
        const result = reva.validate({
          operation: {
            requestBody: {
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['foo'],
                    additionalProperties: false,
                    properties: {
                      foo: {
                        type: 'string',
                      },
                    },
                  },
                },
              },
            },
          },
          request: {
            headers: {
              'Content-Type': 'application/json',
            },
            body: {
              bar: 'value',
            },
          },
        });

        expect(result.ok).toBe(false);
        expect(result).toMatchSnapshot();
      });
    });

    describe('options', () => {
      describe('partialBody', () => {
        it('should allow missing required properties', () => {
          const reva = new Reva({ partialBody: true });
          const result = reva.validate({
            operation: {
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      required: ['foo'],
                      properties: {
                        foo: {
                          type: 'string',
                        },
                        bar: {
                          type: 'string',
                        },
                      },
                    },
                  },
                },
              },
            },
            request: {
              headers: {
                'Content-Type': 'application/json',
              },
              body: { bar: 'value' },
            },
          });

          expect(result.ok).toBe(true);
        });
      });

      describe('allowAdditionalParameters', () => {
        describe('true', () => {
          it('should allow additional parameters (all types)', () => {
            const reva = new Reva();
            const result = reva.validate({
              options: { allowAdditionalParameters: true },
              operation: {
                parameters: [
                  {
                    in: 'path',
                    name: 'id',
                    required: true,
                    schema: { type: 'number' },
                  },
                  {
                    in: 'header',
                    name: 'X-My-Header',
                    required: false,
                    schema: { type: 'number' },
                  },
                  {
                    in: 'cookie',
                    name: 'Key',
                    required: false,
                    schema: { type: 'boolean' },
                  },
                  {
                    in: 'query',
                    name: 'search',
                    required: false,
                    schema: { type: 'string' },
                  },
                ],
              },
              request: {
                headers: {
                  'Content-Type': 'application/json',
                  Foo: 'bar',
                  Cookie: 'Foo=bar',
                },
                pathParameters: {
                  id: '123',
                  other: '2',
                },
                queryParameters: {
                  other: '2',
                },
                body: { bar: 'value' },
              },
            });

            expect(result.ok).toBe(true);
          });
        });

        describe('list of parameter types', () => {
          it('should allow additional parameters of those types', () => {
            const reva = new Reva({
              allowAdditionalParameters: ['cookie', 'header', 'query'],
            });
            const result = reva.validate({
              operation: {
                parameters: [
                  {
                    in: 'path',
                    name: 'id',
                    required: true,
                    schema: { type: 'number' },
                  },
                  {
                    in: 'header',
                    name: 'X-My-Header',
                    required: false,
                    schema: { type: 'number' },
                  },
                  {
                    in: 'cookie',
                    name: 'Key',
                    required: false,
                    schema: { type: 'boolean' },
                  },
                  {
                    in: 'query',
                    name: 'search',
                    required: false,
                    schema: { type: 'string' },
                  },
                ],
              },
              request: {
                headers: {
                  'Content-Type': 'application/json',
                  Foo: 'bar',
                  Cookie: 'Foo=bar',
                },
                pathParameters: {
                  id: '123',
                  other: '2',
                },
                queryParameters: {
                  other: '2',
                },
                body: { bar: 'value' },
              },
            });

            expect(result.ok).toBe(false);
            expect(result).toMatchSnapshot();
          });
        });
      });

      describe('groupedParameters', () => {
        // Usecase: sometimes parameters of different types are combined into a parameters object, for example GraphQL
        it('should group parameters for validation', () => {
          const reva = new Reva();
          const result = reva.validate({
            options: { groupedParameters: ['query', 'path'] },
            operation: {
              parameters: [
                {
                  in: 'path',
                  name: 'id',
                  required: true,
                  schema: { type: 'number' },
                },
                {
                  in: 'header',
                  name: 'X-My-Header',
                  required: false,
                  schema: { type: 'number' },
                },
                {
                  in: 'cookie',
                  name: 'Key',
                  required: false,
                  schema: { type: 'boolean' },
                },
                {
                  in: 'query',
                  name: 'search',
                  required: true,
                  schema: { type: 'string' },
                },
              ],
            },
            request: {
              headers: {
                'Content-Type': 'application/json',
                Foo: 'bar',
                Cookie: 'Foo=bar',
              },
              queryParameters: {
                id: '123',
                search: 'foo',
                blah: 'foo',
              },
              body: { bar: 'value' },
            },
          });
          expect(result.ok).toBe(false);
          expect(result).toMatchSnapshot();
        });
      });
    });
  });
});
