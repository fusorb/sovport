/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parsePresentRequest } from './present-link.ts';

describe('parsePresentRequest', () => {
  it('parses a sovport:// deep link', () => {
    assert.deepEqual(parsePresentRequest('sovport://present?sessionId=s1&challenge=c1'), {
      sessionId: 's1',
      challenge: 'c1',
    });
  });

  it('parses an https verification URL', () => {
    assert.deepEqual(
      parsePresentRequest('https://verify.example.com/present?sessionId=abc&challenge=xyz'),
      { sessionId: 'abc', challenge: 'xyz' },
    );
  });

  it('parses a raw JSON payload', () => {
    assert.deepEqual(parsePresentRequest('{"sessionId":"s","challenge":"c"}'), {
      sessionId: 's',
      challenge: 'c',
    });
  });

  it('url-decodes parameter values', () => {
    assert.deepEqual(parsePresentRequest('sovport://present?sessionId=a%2Fb&challenge=c+d'), {
      sessionId: 'a/b',
      challenge: 'c d',
    });
  });

  it('returns null when a required field is missing', () => {
    assert.equal(parsePresentRequest('sovport://present?sessionId=s1'), null);
    assert.equal(parsePresentRequest('{"sessionId":"s"}'), null);
  });

  it('returns null for empty, malformed, or unrelated input', () => {
    assert.equal(parsePresentRequest(''), null);
    assert.equal(parsePresentRequest('   '), null);
    assert.equal(parsePresentRequest('not-a-link'), null);
    assert.equal(parsePresentRequest('{"sessionId":'), null);
  });
});
