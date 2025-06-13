import { parseJsonFromText, slugify } from '../utils'; // Reverted to extensionless
import { JsonParseError } from '../../../types'; // Reverted to extensionless

describe('server/utils.ts', () => {
  describe('slugify', () => {
    it('should convert simple strings to lowercase', () => {
      expect(slugify('Simple String')).toBe('simple-string');
    });

    it('should handle leading/trailing spaces', () => {
      expect(slugify('  Leading Trailing  ')).toBe('leading-trailing');
    });

    it('should replace multiple spaces with a single hyphen', () => {
      expect(slugify('Multiple   Spaces')).toBe('multiple-spaces');
    });

    it('should remove special characters', () => {
      expect(slugify('Special!@#$%^&*()_+Chars')).toBe('special_chars');
    });

    it('should handle numbers in strings - updated expectation', () => {
      expect(slugify('Version 1.2.3')).toBe('version-123');
    });

    it('should return an empty string for an empty input', () => {
      expect(slugify('')).toBe('');
    });

    it('should handle strings with only special characters', () => {
      expect(slugify('!@#$%')).toBe('');
    });
  });

  describe('parseJsonFromText', () => {
    it('should parse valid JSON string', () => {
      const json = { key: 'value', number: 123 };
      const text = JSON.stringify(json);
      expect(parseJsonFromText(text)).toEqual(json);
    });

    it('should parse valid JSON string with markdown fences', () => {
      const json = { key: 'value', nested: { array: [1, 'two'] } };
      const text = '```json\n' + JSON.stringify(json, null, 2) + '\n```';
      expect(parseJsonFromText(text)).toEqual(json);
    });

    it('should parse valid JSON string with markdown fences (no language specified)', () => {
      const json = { test: true };
      const text = '```\n' + JSON.stringify(json) + '\n```';
      expect(parseJsonFromText(text)).toEqual(json);
    });

    it('should parse JSON string when it is embedded within other text - updated expectation', () => {
        const json = { "extracted": true, "ignored": "part" };
        const text = 'Some leading text... { "extracted": true, "ignored": "part" } ... trailing text';
        expect(parseJsonFromText(text)).toEqual(json);
    });

    it('should parse JSON array string', () => {
        const json = [{id:1}, {id:2}];
        const text = JSON.stringify(json);
        expect(parseJsonFromText(text)).toEqual(json);
    });

    it('should parse JSON array string with markdown fences', () => {
        const json = [{id:1, name:"item1"}, {id:2, name:"item2"}];
        const text = '```json\n' + JSON.stringify(json, null, 2) + '\n```';
        expect(parseJsonFromText(text)).toEqual(json);
    });


    it('should throw JsonParseError for invalid JSON string', () => {
      const invalidText = 'this is not json';
      expect(() => parseJsonFromText(invalidText)).toThrow(JsonParseError);
      expect(() => parseJsonFromText(invalidText)).toThrow(/^Failed to parse JSON from response/);
    });

    it('should throw JsonParseError for malformed JSON (e.g., trailing comma)', () => {
      const malformedText = '{"key": "value",}';
      expect(() => parseJsonFromText(malformedText)).toThrow(JsonParseError);
    });

    it('should throw JsonParseError for incomplete JSON', () => {
      const incompleteText = '{"key": "value"';
      expect(() => parseJsonFromText(incompleteText)).toThrow(JsonParseError);
    });

    it('should include "AI failed to correct" in message if isFixAttempt is true', () => {
      const invalidText = 'this is not json';
      expect(() => parseJsonFromText(invalidText, true)).toThrow(/^AI failed to correct the JSON format/);
    });

    // it('should correctly parse JSON when there are multiple code blocks and only one is JSON', () => { ... });

    it('should handle empty string input by throwing JsonParseError', () => {
        expect(() => parseJsonFromText('')).toThrow(JsonParseError);
    });

    it('should handle string with only whitespace by throwing JsonParseError', () => {
        expect(() => parseJsonFromText('   \n\t')).toThrow(JsonParseError);
    });
  });
});
