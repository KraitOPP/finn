import { contractSchemas } from './generated/schema.ts';
import type { ContractTypes } from './generated/models.ts';

type Schema = boolean | { [key: string]: unknown };

export class ContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ContractError';
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validFormat(value: string, format: unknown): boolean {
  if (format === 'date') {
    return /^\d{4}-\d{2}-\d{2}$/.test(value)
      && Number.isFinite(Date.parse(`${value}T00:00:00Z`))
      && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
  }
  if (format === 'date-time') {
    const clock = /^\d{4}-\d{2}-\d{2}T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-](\d{2}):(\d{2}))$/.exec(value);
    if (!clock || Number(clock[1]) > 23 || Number(clock[2]) > 59 || Number(clock[3]) > 59
      || (clock[4] !== undefined && Number(clock[4]) > 23)
      || (clock[5] !== undefined && Number(clock[5]) > 59)) return false;
    // Reject leap seconds conservatively: JavaScript cannot represent them reliably.
    // Date.parse alone also normalises 24:00:00 into the following calendar day.
    return Number.isFinite(Date.parse(value))
      && validFormat(value.slice(0, 10), 'date');
  }
  if (format === 'uuid') return /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(value);
  if (format === 'uri' || format === 'uri-reference') {
    try { new URL(value, format === 'uri-reference' ? 'https://contract.invalid' : undefined); return true; }
    catch { return false; }
  }
  return true;
}

function matchesType(value: unknown, type: unknown): boolean {
  switch (type) {
    case 'null': return value === null;
    case 'string': return typeof value === 'string';
    case 'boolean': return typeof value === 'boolean';
    case 'number': return typeof value === 'number' && Number.isFinite(value);
    case 'integer': return typeof value === 'number' && Number.isSafeInteger(value);
    case 'array': return Array.isArray(value);
    case 'object': return isObject(value);
    default: return false;
  }
}

// The generator rejects unsupported keywords, so the shipped schema cannot silently
// acquire constraints this deliberately small boundary validator does not enforce.
function problem(schema: Schema, value: unknown, path: string, depth = 0): string | null {
  if (depth > 80) return `${path}: response nesting exceeds the contract limit`;
  if (schema === true) return null;
  if (schema === false) return `${path}: value is forbidden`;
  const nested = (child: Schema, item: unknown, location = path) => problem(child, item, location, depth + 1);
  if (typeof schema.$ref === 'string') {
    const name = schema.$ref.slice('#/components/schemas/'.length) as keyof typeof contractSchemas;
    const result = nested(contractSchemas[name] as Schema, value);
    if (result) return result;
  }
  if (Object.hasOwn(schema, 'const') && JSON.stringify(value) !== JSON.stringify(schema.const)) return `${path}: unexpected constant`;
  if (Array.isArray(schema.enum) && !schema.enum.some((item) => JSON.stringify(item) === JSON.stringify(value))) return `${path}: unrecognised value`;
  for (const kind of ['allOf', 'anyOf', 'oneOf'] as const) {
    const children = schema[kind];
    if (Array.isArray(children)) {
      const passing = children.filter((child) => nested(child as Schema, value) === null).length;
      if ((kind === 'allOf' && passing !== children.length) || (kind === 'anyOf' && passing === 0) || (kind === 'oneOf' && passing !== 1)) {
        return `${path}: response does not match ${kind}`;
      }
    }
  }
  if (schema.type !== undefined) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some((type) => matchesType(value, type))) return `${path}: unexpected value type`;
  }
  if (typeof value === 'string') {
    const length = [...value].length;
    if (typeof schema.minLength === 'number' && length < schema.minLength) return `${path}: string is too short`;
    if (typeof schema.maxLength === 'number' && length > schema.maxLength) return `${path}: string is too long`;
    if (typeof schema.pattern === 'string' && !new RegExp(schema.pattern, 'u').test(value)) return `${path}: string has an invalid format`;
    if (!validFormat(value, schema.format)) return `${path}: invalid ${String(schema.format)}`;
  }
  if (typeof value === 'number') {
    for (const [key, failed] of [
      ['minimum', (limit: number) => value < limit], ['maximum', (limit: number) => value > limit],
      ['exclusiveMinimum', (limit: number) => value <= limit], ['exclusiveMaximum', (limit: number) => value >= limit],
    ] as const) {
      if (typeof schema[key] === 'number' && failed(schema[key] as number)) return `${path}: number is outside the contract range`;
    }
  }
  if (Array.isArray(value)) {
    if (typeof schema.minItems === 'number' && value.length < schema.minItems) return `${path}: too few items`;
    if (typeof schema.maxItems === 'number' && value.length > schema.maxItems) return `${path}: too many items`;
    if (schema.uniqueItems === true && new Set(value.map((item) => JSON.stringify(item))).size !== value.length) return `${path}: duplicate items`;
    if (schema.items !== undefined) {
      for (let index = 0; index < value.length; index += 1) {
        const result = nested(schema.items as Schema, value[index], `${path}[${index}]`);
        if (result) return result;
      }
    }
  }
  if (isObject(value)) {
    const properties = (schema.properties ?? {}) as Record<string, Schema>;
    for (const required of (schema.required ?? []) as string[]) {
      if (!Object.hasOwn(value, required)) return `${path}.${required}: required field is missing`;
    }
    for (const [key, item] of Object.entries(value)) {
      if (Object.hasOwn(properties, key)) {
        const result = nested(properties[key], item, `${path}.${key}`);
        if (result) return result;
      } else if (schema.additionalProperties === false) return `${path}: unexpected field`;
      else if (isObject(schema.additionalProperties)) {
        const result = nested(schema.additionalProperties, item, `${path}.${key}`);
        if (result) return result;
      }
    }
  }
  return null;
}

export function decodeContract<Name extends keyof ContractTypes>(name: Name, value: unknown): ContractTypes[Name] {
  if (!Object.hasOwn(contractSchemas, name)) throw new ContractError('Unknown contract schema.');
  const issue = problem(contractSchemas[name] as Schema, value, '$');
  if (issue) throw new ContractError(`${String(name)}: ${issue}`);
  return value as ContractTypes[Name];
}
