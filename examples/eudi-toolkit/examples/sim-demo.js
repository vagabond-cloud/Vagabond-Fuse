console.log('SIM Registration Use Case Demo:');
console.log(JSON.stringify({
  simRegistration: {
    issued: true,
    credentialId: "urn:uuid:sim-reg-123",
    identificationNumber: "ID-12345678",
    verified: true
  },
  simCard: {
    issued: true,
    credentialId: "urn:uuid:sim-card-456",
    iccid: "8912345678901234567",
    msisdn: "+491234567890",
    carrier: "Example Telecom",
    activationDate: "2025-06-18",
    planType: "Prepaid"
  },
  registrationProof: {
    generated: true,
    verified: true,
    revealedAttributes: {
      firstName: "Jane",
      lastName: "Doe",
      identificationNumber: "ID-12345678",
      idType: "National ID"
    }
  }
}, null, 2));
