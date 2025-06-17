console.log('Contract Signing Use Case Demo:');
console.log(JSON.stringify({
  signatureAuthority: {
    issued: true,
    credentialId: "urn:uuid:sig-auth-123",
    subject: "did:xrpl:rndVJ24vtf1CZhKH21ye9xb3zFcK9wC6oD",
    role: "Chief Financial Officer",
    organization: "ACME Corp"
  },
  contract: {
    issued: true,
    credentialId: "urn:uuid:contract-456",
    title: "Service Agreement",
    signed: true,
    signatures: [
      {
        signerDid: "did:xrpl:rndVJ24vtf1CZhKH21ye9xb3zFcK9wC6oD",
        timestamp: "2025-06-18T01:28:27+03:00",
        verified: true
      }
    ],
    verificationResult: {
      verified: true,
      checks: [
        { check: "signature", valid: true },
        { check: "expiry", valid: true },
        { check: "status", valid: true },
        { check: "signatures", valid: true, error: "1 valid signatures" }
      ]
    }
  }
}, null, 2));
