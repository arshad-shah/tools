import { describe, expect, it } from 'vitest';
import {
  camelCase,
  isJsIdentifier,
  itemName,
  NameScope,
  pascalCase,
  singular,
  snakeCase,
  words,
} from './naming';

describe('words', () => {
  it('splits camel, snake, kebab and spaced keys', () => {
    expect(words('firstName')).toEqual(['first', 'Name']);
    expect(words('first_name')).toEqual(['first', 'name']);
    expect(words('first-name')).toEqual(['first', 'name']);
    expect(words('First Name')).toEqual(['First', 'Name']);
    expect(words('HTTPServer')).toEqual(['HTTP', 'Server']);
    expect(words('user2Id')).toEqual(['user2', 'Id']);
    expect(words('@@')).toEqual([]);
  });
});

describe('casing', () => {
  it('PascalCase keeps acronyms and falls back for symbol keys', () => {
    expect(pascalCase('first_name')).toBe('FirstName');
    expect(pascalCase('userID')).toBe('UserID');
    expect(pascalCase('')).toBe('Type');
    expect(pascalCase('$$', 'Root')).toBe('Root');
    expect(pascalCase('1st place')).toBe('Type1stPlace');
  });

  it('camelCase lowers the first word', () => {
    expect(camelCase('First-Name')).toBe('firstName');
    expect(camelCase('HTTPServer')).toBe('httpServer');
    expect(camelCase('2fa')).toBe('field2fa');
    expect(camelCase('')).toBe('field');
  });

  it('snake_case joins lower words', () => {
    expect(snakeCase('firstName')).toBe('first_name');
    expect(snakeCase('first-name')).toBe('first_name');
    expect(snakeCase('9lives')).toBe('field_9lives');
    expect(snakeCase('!')).toBe('field');
  });
});

describe('singular and item names', () => {
  it('makes rough English singulars', () => {
    expect(singular('users')).toBe('user');
    expect(singular('Categories')).toBe('Category');
    expect(singular('addresses')).toBe('address');
    expect(singular('boxes')).toBe('box');
    expect(singular('status')).toBe('status');
    expect(singular('class')).toBe('class');
    expect(singular('data')).toBe('data');
  });

  it('names array items from the key, or adds Item', () => {
    expect(itemName('users')).toBe('User');
    expect(itemName('data')).toBe('DataItem');
    expect(itemName('Root')).toBe('RootItem');
  });
});

describe('NameScope', () => {
  it('numbers clashes, ignoring case', () => {
    const scope = new NameScope(['Reserved']);
    expect(scope.take('Address')).toBe('Address');
    expect(scope.take('Address')).toBe('Address2');
    expect(scope.take('address')).toBe('address3');
    expect(scope.take('reserved')).toBe('reserved2');
  });
});

it('recognises JavaScript identifiers', () => {
  expect(isJsIdentifier('a_b$1')).toBe(true);
  expect(isJsIdentifier('first-name')).toBe(false);
  expect(isJsIdentifier('1a')).toBe(false);
  expect(isJsIdentifier('')).toBe(false);
});
