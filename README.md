[![npm (scoped)](https://img.shields.io/npm/v/@apideck/reva?color=brightgreen)](https://npmjs.com/@apideck/reva) [![npm](https://img.shields.io/npm/dm/@apideck/reva)](https://npmjs.com/@apideck/reva) [![GitHub Workflow Status](https://img.shields.io/github/workflow/status/apideck-libraries/reva/CI)](https://github.com/apideck-libraries/reva/actions/workflows/main.yml?query=branch%3Amain++)

# @apideck/reva 🕵

> Server-side **re**quest **va**lidator for Node.js based on OpenAPI

- Supports all OpenAPI parameters
- Based on [AJV](https://github.com/ajv-validator/ajv)
- Readable and helpful errors (by [@apideck/better-ajv-errors](https://github.com/apideck-libraries/better-ajv-errors))
- High quality TypeScript definitions included
- Minimal footprint: 42 kB including AJV (gzip + minified)

## Install

```bash
$ yarn add @apideck/reva
```

or

```bash
$ npm i @apideck/reva
```

## Usage

Create a Reva instance and call the `validate` method with your [OpenAPI operation](https://spec.openapis.org/oas/v3.1.0#operation-object) and your request data.

```ts
import { Reva } from '@apideck/reva';

const reva = new Reva();

const result = reva.validate({
  operation, // OpenAPI operation
  request: {
    headers: { 'X-My-Header': 'value', Cookie: 'Key=Value' },
    pathParameters: { id: 'ed55e7a3' },
    queryParameters: { search: 'foo' },
    body: {},
  },
});

if (result.ok) {
  // Valid request!
} else {
  // Invalid request, result.errors contains validation errors
  console.log(result.errors);
}
```

## API

### Reva

Reva is the main **Re**quest **va**lidation class. You can optionally pass options to the constructor.

#### new Reva(options?: RevaOptions)

**Parameters**

- `options: RevaOptions`
  - `allowAdditionalParameters?: true | OpenApiParameterType[]` Allow additional parameters to be passed that are not defined in the OpenAPI operation. Use `true` to allow all parameter types to have additional parameters. Default value: `['header', 'cookie']`
  - `partialBody?: boolean` Ignore required properties on the requestBody. This option is useful for update endpoints where a subset of required properties is allowed. Default value: `false`
  - `groupedParameters?: OpenApiParameterType[]` Validate multiple OpenAPI parameter types as one schema. This is useful for APIs where parameters (`query`,`path`, etc) are combined into a single `parameters` object. Default value: `[]`

#### reva.validate(options: RevaValidateOptions)

Validate requests based on OpenAPI. Parameter validation uses [type coercion](https://ajv.js.org/coercion.html), request body validation does not. When a Content-Type header is passed, it has to match a Content-Type defined in the OpenAPI operation. Default Content-Type is `application/json`.

**Parameters**

- `options: RevaValidateOptions`
  - `operation: OpenApiOperation` Your OpenAPI operation object to validate against
  - `request: RevaRequest` The request data to validate. All properties are optional
    - `queryParameters?: Record<string, unknown>` Query parameters to validate
    - `headers?: Record<string, unknown>` Headers to validate
    - `pathParameters?: Record<string, unknown>` Path parameters to validate
    - `body?: unknown` Request body to validate
  - `options?: RevaOptions` Override options set in the Reva constructor

**Return Value**

- `Result<ValidationError>`
  - `ok: boolean` Indicates if the request is valid or not
  - `errors?: ValidationError[]` Array of formatted errors. Only populated when `Result.ok` is `false`
    - `message: string` Formatted error message
    - `suggestion?: string` Optional suggestion based on provided data and schema
    - `path: string` Object path where the error occurred (example: `.foo.bar.0.quz`)
    - `context: { errorType: DefinedError['keyword']; [additionalContext: string]: unknown }` `errorType` is `error.keyword` proxied from `ajv`. `errorType` can be used as a key for i18n if needed. There might be additional properties on context, based on the type of error.
