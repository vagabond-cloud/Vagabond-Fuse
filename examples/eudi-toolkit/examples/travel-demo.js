console.log('Travel Use Case Demo:');
console.log(JSON.stringify({
  travelIdentity: {
    issued: true,
    credentialId: "urn:uuid:travel-id-123",
    subject: "did:xrpl:rndVJ24vtf1CZhKH21ye9xb3zFcK9wC6oD",
    verified: true
  },
  hotelBooking: {
    issued: true,
    credentialId: "urn:uuid:hotel-booking-456",
    bookingReference: "BK12345",
    checkInProof: {
      generated: true,
      verified: true,
      revealedAttributes: {
        firstName: "Jane",
        lastName: "Doe",
        bookingReference: "BK12345"
      }
    }
  }
}, null, 2));
