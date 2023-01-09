import type { OpenAPIV3 } from 'openapi-types';

export const lowercaseKeys = <
  T extends Record<string, unknown> = Record<string, unknown>
>(
  obj: T
): T => {
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [key.toLowerCase(), value])
  ) as T;
};

export const tryJsonParse = (str: string): Record<string, unknown> | null => {
  try {
    return JSON.parse(str);
  } catch (e) {
    return null;
  }
};

export const parseCookies = (
  cookieHeader?: string | null
): Record<string, unknown> | null => {
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split('; ').reduce((prev, current) => {
    const [name, ...value] = current.split('=');
    prev[name] = value.join('=');
    return prev;
  }, {} as Record<string, unknown>);

  return cookies;
};

export const parseContentType = (
  contentType: string
): { mediaType: string; parameters: Record<string, string> } => {
  const [mediaType, ...parts] = contentType
    .split(';')
    .map((part) => part.trim());
  const parameters = Object.fromEntries(parts.map((part) => part.split('=')));

  return { mediaType, parameters };
};

export const removeReadOnlyProperties = (
  schema: OpenAPIV3.SchemaObject
): OpenAPIV3.SchemaObject => {
  if (!schema.properties) {
    return schema;
  }

  schema.required = schema.required?.filter((field) => {
    const prop = schema.properties?.[field];
    return !(
      typeof prop === 'object' && (prop as OpenAPIV3.SchemaObject).readOnly
    );
  });

  schema.properties = Object.fromEntries(
    Object.entries(schema.properties)
      .map(([key, value]) => {
        if (typeof value !== 'object') {
          return [key, value];
        }

        const schemaObject = value as OpenAPIV3.SchemaObject;

        if (schemaObject.readOnly) {
          return [key, null];
        }

        if (schemaObject.type === 'object') {
          return [key, removeReadOnlyProperties(schemaObject)];
        }

        return [key, value];
      })
      .filter(([, value]) => value !== null)
  ) as Record<string, OpenAPIV3.SchemaObject>;

  return schema;
};

export function isPresent<T>(t: T | undefined | null | void): t is T {
  return t !== undefined && t !== null;
}
