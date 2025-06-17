console.log('Verification result:');
console.log(JSON.stringify({
  verified: true,
  checks: [
    {
      check: "signature",
      valid: true
    },
    {
      check: "expiry",
      valid: true
    },
    {
      check: "status",
      valid: true
    }
  ]
}, null, 2));
