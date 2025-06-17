console.log('Education Certification Use Case Demo:');
console.log(JSON.stringify({
  diploma: {
    issued: true,
    credentialId: "urn:uuid:diploma-123",
    degree: "Master of Science",
    field: "Computer Science",
    institution: "Berlin University of Technology",
    verified: true
  },
  educationProof: {
    generated: true,
    verified: true,
    revealedAttributes: {
      studentName: "Jane Doe",
      institution: "Berlin University of Technology",
      degree: "Master of Science",
      field: "Computer Science",
      awardDate: "2022-06-15"
    }
  }
}, null, 2));
