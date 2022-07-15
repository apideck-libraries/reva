import Ajv, { Options as _AjvOptions } from 'ajv';
import type { OpenAPIV3 } from 'openapi-types';
import { betterAjvErrors, ValidationError } from '@apideck/better-ajv-errors';
import {
  isPresent,
  lowercaseKeys,
  parseContentType,
  parseCookies,
  removeReadOnlyProperties,
  tryJsonParse,
} from './utils';

export type AjvOptions = _AjvOptions;

type Result<E> = { ok: true } | { ok: false; errors: E[] };
type ParameterDictionary = Record<string, unknown>;
type SchemaByType = Record<string, OpenAPIV3.SchemaObject>;

const OPENAPI_PARAMETER_TYPES = ['header', 'path', 'query', 'cookie'] as const;
type OpenApiParameterType = typeof OPENAPI_PARAMETER_TYPES[number];

export interface RevaRequest {
  queryParameters?: ParameterDictionary;
  pathParameters?: ParameterDictionary;
  headers?: ParameterDictionary;
  body?: unknown;
}

interface OpenApiOperation {
  parameters?: OpenAPIV3.ParameterObject[];
  requestBody?: OpenAPIV3.RequestBodyObject;
  [key: string]: unknown;
}

export interface RevaOptions {
  allowAdditionalParameters: true | OpenApiParameterType[];
  partialBody: boolean;
  groupedParameters: OpenApiParameterType[];
  paramAjvOptions?: AjvOptions;
  bodyAjvOptions?: AjvOptions;
}

export interface RevaValidateOptions {
  operation: OpenApiOperation;
  request: RevaRequest;
  options?: Partial<RevaOptions>;
}

export const revaDefaultParamAjvOptions = {
  allErrors: true,
  coerceTypes: true,
  strict: false,
};
export const revaDefaultBodyAjvOptions = { allErrors: true, strict: false };

export class Reva {
  private paramAjv: Ajv;
  private bodyAjv: Ajv;
  private options: RevaOptions = {
    allowAdditionalParameters: ['header', 'cookie'],
    groupedParameters: [],
    partialBody: false,
  };

  constructor(options: Partial<RevaOptions> = {}) {
    this.options = { ...this.options, ...options };
    this.paramAjv = new Ajv({
      ...revaDefaultParamAjvOptions,
      ...options.paramAjvOptions,
    });
    this.bodyAjv = new Ajv({
      ...revaDefaultBodyAjvOptions,
      ...options.bodyAjvOptions,
    });
  }

  validate({
    operation,
    request: { body, headers, pathParameters, queryParameters },
    options: validateOptions = {},
  }: RevaValidateOptions): Result<ValidationError> {
    const options = { ...this.options, ...validateOptions };
    const errors: ValidationError[] = [];

    const schemaByType =
      operation.parameters
        ?.filter((param): param is OpenAPIV3.ParameterObject => 'in' in param)
        .reduce<SchemaByType>((schemaMap, param) => {
          const schema = (param.schema ??
            param.content?.['application/json']
              ?.schema) as OpenAPIV3.SchemaObject;
          if (!schema) return schemaMap;

          if (!schemaMap[param.in]) {
            schemaMap[param.in] = {
              type: 'object',
              required: [],
              properties: {},
              additionalProperties:
                options.allowAdditionalParameters === true ||
                options.allowAdditionalParameters.includes(
                  param.in as OpenApiParameterType
                ), // Additional headers are allowed, additional query/path params are not
            };
          }

          const paramKey =
            param.in === 'header' ? param.name.toLocaleLowerCase() : param.name;
          // properties is always assigned above
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          schemaMap[param.in].properties![paramKey] = schema;

          if (param.required) {
            schemaMap[param.in].required?.push(paramKey);
          }

          return schemaMap;
        }, {}) ?? {};

    const safeHeaders = lowercaseKeys(headers ?? {});

    const validationEntries = OPENAPI_PARAMETER_TYPES.map((type) => {
      const schema = schemaByType[type];
      if (!schema) return null;

      let value: Record<string, unknown> = {};

      switch (type) {
        case 'header':
          value = Object.fromEntries(
            Object.entries(safeHeaders).map(([key, value]) => {
              const headerSchema = schema.properties?.[
                key
              ] as OpenAPIV3.SchemaObject;
              if (headerSchema?.type === 'object') {
                return [key, tryJsonParse(value as string) ?? {}];
              }
              return [key, value];
            })
          );
          break;
        case 'path':
          value = pathParameters ?? {};
          break;
        case 'query':
          value = queryParameters ?? {};
          break;
        case 'cookie':
          value = parseCookies(safeHeaders.cookie as string) ?? {};
          break;
      }

      return { schema, value, type };
    }).filter(isPresent);

    if (options.groupedParameters.length > 0) {
      const groupedValidationEntry = validationEntries
        .filter(({ type }) => options.groupedParameters.includes(type))
        .reduce(
          (acc, { value, schema }) => {
            acc.schema.required = [
              ...(acc.schema.required ?? []),
              ...(schema.required ?? []),
            ];
            acc.schema.properties = {
              ...acc.schema.properties,
              ...schema.properties,
            };
            acc.value = { ...acc.value, ...value };

            return acc;
          },
          {
            value: {},
            schema: {
              type: 'object',
              required: [],
              properties: {},
              additionalProperties: options.allowAdditionalParameters === true,
            } as OpenAPIV3.SchemaObject,
          }
        );

      const validParams = this.paramAjv.validate(
        groupedValidationEntry.schema,
        groupedValidationEntry.value
      );

      if (!validParams) {
        errors.push(
          ...betterAjvErrors({
            errors: this.paramAjv.errors,
            data: groupedValidationEntry.value,
            schema: groupedValidationEntry.schema as any,
            basePath: 'request.parameters',
          })
        );
      }
    }

    for (const { schema, value, type } of validationEntries.filter(
      ({ type }) => !options.groupedParameters.includes(type)
    )) {
      const validParams = this.paramAjv.validate(schema, value);

      if (!validParams) {
        errors.push(
          ...betterAjvErrors({
            errors: this.paramAjv.errors,
            data: value,
            schema: schema as any,
            basePath: `request.${type}`,
          })
        );
      }
    }

    const requestBody = operation.requestBody as
      | OpenAPIV3.RequestBodyObject
      | undefined;

    if (requestBody) {
      const contentType = parseContentType(
        (safeHeaders['content-type'] as string) ?? 'application/json'
      );
      const supportedContentTypes = Object.keys(requestBody?.content ?? {});
      const invalidContentType =
        !supportedContentTypes.includes('*/*') &&
        !supportedContentTypes.includes(contentType.mediaType);

      if (invalidContentType) {
        errors.push({
          context: {
            errorType: 'contentType',
            supportedContentTypes,
          } as any,
          path: 'request.header.Content-Type',
          message: `"${contentType.mediaType}" Content-Type is not supported.`,
        });
      } else {
        const mediaTypeObject =
          requestBody?.content?.[contentType.mediaType] ??
          requestBody?.content?.['*/*'];
        const requestBodySchema = mediaTypeObject?.schema as
          | OpenAPIV3.SchemaObject
          | undefined;

        if (requestBodySchema) {
          const cleanRequestBodySchema = removeReadOnlyProperties(
            requestBodySchema as OpenAPIV3.SchemaObject
          );
          if (options.partialBody) {
            delete cleanRequestBodySchema.required;
          }

          const validBody = this.bodyAjv.validate(
            cleanRequestBodySchema,
            body ?? {}
          );

          if (!validBody) {
            errors.push(
              ...betterAjvErrors({
                data: body,
                schema: cleanRequestBodySchema as any,
                errors: this.bodyAjv.errors,
                basePath: 'request.body',
              })
            );
          }
        }
      }
    }

    if (errors.length > 0) {
      return { ok: false, errors };
    }

    return { ok: true };
  }
}
