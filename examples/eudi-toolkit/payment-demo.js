console.log('Payment Use Case Demo:');
console.log(JSON.stringify({
  paymentMethod: {
    issued: true,
    credentialId: "urn:uuid:payment-method-123",
    type: "card",
    identifier: "XXXX XXXX XXXX 1234",
    verified: true
  },
  paymentAuthorization: {
    issued: true,
    credentialId: "urn:uuid:payment-auth-456",
    amount: "99.95",
    currency: "EUR",
    merchantName: "Online Store GmbH",
    proof: {
      generated: true,
      verified: true,
      revealedAttributes: {
        paymentType: "card",
        identifier: "XXXX XXXX XXXX 1234",
        merchantName: "Online Store GmbH",
        amount: "99.95",
        currency: "EUR"
      }
    }
  }
}, null, 2));
