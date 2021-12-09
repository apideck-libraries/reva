[![npm (scoped)](https://img.shields.io/npm/v/@apideck/reva?color=brightgreen)](https://npmjs.com/@apideck/reva) [![npm](https://img.shields.io/npm/dm/@apideck/reva)](https://npmjs.com/@apideck/reva) [![GitHub Workflow Status](https://img.shields.io/github/workflow/status/apideck-libraries/reva/CI)](https://github.com/apideck-libraries/reva/actions/workflows/main.yml?query=branch%3Amain++)

# @apideck/reva 👮‍♀️

> Validate requests based on OpenAPI

## Install

```bash
$ yarn add @apideck/reva
```

or

```bash
$ npm i @apideck/reva
```

## Usage

```ts
import { Reva } from '@apideck/reva';

const reva = new Reva();

const result = reva.validate({
  operation, // OpenAPI operation
  request: {
    headers,
    pathParameters,
    queryParameters,
    body,
  },
});

if (result.ok) {
  // Valid request!
} else {
  // Invalid request, result.errors contains human-readable validation errors
  console.log(result.errors);
}
```

## API

### Reva

TODO
