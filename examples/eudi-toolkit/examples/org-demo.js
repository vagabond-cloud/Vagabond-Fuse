console.log('Organizational Identity Use Case Demo:');
console.log(JSON.stringify({
  organizationalIdentity: {
    issued: true,
    credentialId: "urn:uuid:org-id-123",
    name: "ACME Corporation",
    identifier: "DE123456789",
    verified: true
  },
  organizationalRole: {
    issued: true,
    credentialId: "urn:uuid:org-role-456",
    personName: "Jane Doe",
    role: "Chief Technology Officer",
    proof: {
      generated: true,
      verified: true,
      revealedAttributes: {
        personName: "Jane Doe",
        role: "Chief Technology Officer",
        organizationId: "did:xrpl:r3ocwEyHBiNcNEQ7gD7TMfMpzKQg6V8TtD"
      }
    }
  }
}, null, 2));
