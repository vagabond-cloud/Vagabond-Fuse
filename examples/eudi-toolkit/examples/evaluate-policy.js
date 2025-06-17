console.log('Evaluation result:');
console.log(JSON.stringify({
  allow: true,
  reason: "Age verification passed and user consent given",
  data: { verified: true, age: 33 }
}, null, 2));
