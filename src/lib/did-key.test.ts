/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildDetachedEdDsaJws,
  buildPresentationJws,
  didKeyFromEd25519,
  ed25519PublicKey,
  ed25519Sign,
  ed25519Verify,
  fromBase64Url,
  toBase64Url,
  utf8ToBytes,
} from './did-key.ts';

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.trim();
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

// RFC 8032 §7.1, test 1.
const SECRET = '9d61b19deffd5a60ba844af492ec2cc44449c5697b326919703bac031cae7f60';
const PUBLIC = 'd75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a';
const EMPTY_MESSAGE_SIG =
  'e5564300c360ac729086e2cc806e828a84877f1eb8e5d974d873e065224901555fb8821590a33bacc61e39701cf9b46bd25bf5f0595bbe24655141438e7a100b';

describe('ed25519', () => {
  it('derives the RFC 8032 public key from the secret seed', () => {
    assert.equal(bytesToHex(ed25519PublicKey(hexToBytes(SECRET))), PUBLIC);
  });

  it('signs and verifies deterministically (RFC 8032 vector)', () => {
    const signature = ed25519Sign(new Uint8Array(0), hexToBytes(SECRET));
    assert.equal(bytesToHex(signature), EMPTY_MESSAGE_SIG);
    assert.equal(ed25519Verify(signature, new Uint8Array(0), hexToBytes(PUBLIC)), true);
  });
});

describe('did:key', () => {
  it('encodes Ed25519 keys with the z6Mk multibase prefix', () => {
    const did = didKeyFromEd25519(hexToBytes(PUBLIC));
    assert.ok(did.startsWith('did:key:z6Mk'), `unexpected did: ${did}`);
  });
});

describe('detached JWS', () => {
  it('serializes as `header..signature` and signs header.payload', async () => {
    const header = { alg: 'EdDSA', kid: 'did:key:z6Mkexample#key-1', nonce: 'abc123' };
    const payload = { credentialHash: 'sometokenhash' };

    const jws = await buildDetachedEdDsaJws({
      header,
      payload,
      sign: async (input) => ed25519Sign(input, hexToBytes(SECRET)),
    });
    const [headerPart, payloadPart, signaturePart] = jws.split('.');

    assert.equal(payloadPart, '');
    assert.deepEqual(JSON.parse(new TextDecoder().decode(fromBase64Url(headerPart))), header);

    const payloadPart64 = toBase64Url(utf8ToBytes(JSON.stringify(payload)));
    const signingInput = utf8ToBytes(`${headerPart}.${payloadPart64}`);
    assert.equal(
      ed25519Verify(fromBase64Url(signaturePart), signingInput, hexToBytes(PUBLIC)),
      true,
    );
  });
});

describe('presentation proof JWS', () => {
  const DID = didKeyFromEd25519(hexToBytes(PUBLIC));

  it('binds the did:key, challenge and credential hash, and verifies', async () => {
    const challenge = 'session-challenge-123';
    const credentialHash = 'aGVsbG8';

    const jws = await buildPresentationJws({
      did: DID,
      challenge,
      credentialHash,
      sign: async (input) => ed25519Sign(input, hexToBytes(SECRET)),
    });
    const [headerPart, payloadPart, signaturePart] = jws.split('.');

    assert.equal(payloadPart, '');

    // Header must carry the exact contract SovGrant reconstructs.
    assert.deepEqual(JSON.parse(new TextDecoder().decode(fromBase64Url(headerPart))), {
      alg: 'EdDSA',
      kid: `${DID}#key-1`,
      nonce: challenge,
    });

    const payloadPart64 = toBase64Url(utf8ToBytes(JSON.stringify({ credentialHash })));
    const signingInput = utf8ToBytes(`${headerPart}.${payloadPart64}`);
    assert.equal(
      ed25519Verify(fromBase64Url(signaturePart), signingInput, hexToBytes(PUBLIC)),
      true,
    );
  });

  it('does not verify against a different credential hash', async () => {
    const jws = await buildPresentationJws({
      did: DID,
      challenge: 'c',
      credentialHash: 'hash-a',
      sign: async (input) => ed25519Sign(input, hexToBytes(SECRET)),
    });
    const [headerPart, , signaturePart] = jws.split('.');

    const wrongPayload = toBase64Url(utf8ToBytes(JSON.stringify({ credentialHash: 'hash-b' })));
    const signingInput = utf8ToBytes(`${headerPart}.${wrongPayload}`);
    assert.equal(
      ed25519Verify(fromBase64Url(signaturePart), signingInput, hexToBytes(PUBLIC)),
      false,
    );
  });
});
