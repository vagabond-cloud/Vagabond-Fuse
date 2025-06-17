console.log('Contract Signing Use Case Demo:');
console.log(JSON.stringify({
  signatureAuthority: {
    issued: true,
    credentialId: "urn:uuid:sig-auth-123",
    subject: "did:xrpl:rNxPoYxatkmBjKnXVM4Gg5Y49cVCB3tavn",
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
        signerDid: "did:xrpl:rNxPoYxatkmBjKnXVM4Gg5Y49cVCB3tavn",
        timestamp: "2025-06-18T01:26:58+03:00",
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
