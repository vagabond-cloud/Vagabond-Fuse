console.log('Healthcare Use Case Demo:');
console.log(JSON.stringify({
  prescription: {
    issued: true,
    credentialId: "urn:uuid:prescription-123",
    prescriptionId: "RX-789012",
    medications: [
      {
        name: "Amoxicillin",
        dosage: "500mg"
      }
    ],
    verified: true
  },
  prescriptionProof: {
    generated: true,
    verified: true,
    revealedAttributes: {
      patientName: "Jane Doe",
      prescriptionId: "RX-789012",
      medications: [
        {
          name: "Amoxicillin",
          dosage: "500mg",
          frequency: "3 times daily",
          quantity: "30 tablets"
        }
      ]
    }
  },
  dispensingResult: {
    success: true,
    message: "Medication dispensed successfully",
    dispensed: {
      medication: "Amoxicillin",
      dosage: "500mg",
      quantity: "30 tablets"
    }
  }
}, null, 2));
