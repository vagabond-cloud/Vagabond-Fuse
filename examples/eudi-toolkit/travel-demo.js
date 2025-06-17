console.log('Travel Use Case Demo:');
console.log(JSON.stringify({
  travelIdentity: {
    issued: true,
    credentialId: "urn:uuid:travel-id-123",
    subject: "did:xrpl:rNxPoYxatkmBjKnXVM4Gg5Y49cVCB3tavn",
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
