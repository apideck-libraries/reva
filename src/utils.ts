import { JSONSchema7 } from 'json-schema';
import { URLSearchParams } from 'node:url';

export const lowercaseKeys = <T = Record<string, unknown>>(obj: T): T => {
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

  const cookieParams = new URLSearchParams(cookieHeader);
  const cookies: Record<string, unknown> = {};

  for (const [key, value] of cookieParams.entries()) {
    cookies[key] = value;
  }

  return cookies;
};

export const parseContentType = (
  contentType: string
): { mediaType: string; parameters: Record<string, string> } => {
  const [mediaType, ...parts] = contentType.split(';').map(part => part.trim());
  const parameters = Object.fromEntries(parts.map(part => part.split('=')));

  return { mediaType, parameters };
};

export const removeReadOnlyProperties = (schema: JSONSchema7): JSONSchema7 => {
  if (!schema.properties) {
    return schema;
  }

  schema.properties = Object.fromEntries(
    Object.entries(schema.properties).map(([key, value]) => [
      key,
      typeof value === 'object' && value.readOnly,
    ])
  ) as Record<string, JSONSchema7>;

  return schema;
};
