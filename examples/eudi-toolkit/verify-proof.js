const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Read the proof file
try {
    const proofFile = path.resolve(__dirname, 'proof.json');
    console.log(`Reading proof file: ${proofFile}`);

    if (!fs.existsSync(proofFile)) {
        console.error('Error: proof.json file not found');
        process.exit(1);
    }

    const proofData = JSON.parse(fs.readFileSync(proofFile, 'utf8'));
    const proofId = proofData.id;

    if (!proofId) {
        console.error('Error: No proof ID found in proof.json');
        process.exit(1);
    }

    console.log(`Found proof ID: ${proofId}`);
    console.log('Verifying proof...');

    // Run the verification command
    const verifyProcess = spawn('npm', ['run', 'start', '--', 'zkp', 'verify', '-p', proofId], {
        stdio: 'inherit',
        shell: true
    });

    verifyProcess.on('close', (code) => {
        console.log(`Verification process exited with code ${code}`);
    });

} catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
} 