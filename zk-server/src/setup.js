const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const circuits = ['spo2_ge', 'bpm_range', 'temp_range_f10'];
const buildDir = path.join(__dirname, '..', 'build');
const artifactsDir = path.join(__dirname, '..', 'artifacts');

if (!fs.existsSync(buildDir)) fs.mkdirSync(buildDir);
if (!fs.existsSync(artifactsDir)) fs.mkdirSync(artifactsDir);

console.log('--- Generating ptau file (Trusted Setup Phase 1) ---');
if (!fs.existsSync('pot12_final.ptau')) {
    execSync('snarkjs powersoftau new bn128 12 pot12_0000.ptau -v', { stdio: 'inherit' });
    execSync('snarkjs powersoftau contribute pot12_0000.ptau pot12_0001.ptau --name="First contribution" -v -e="some random text"', { stdio: 'inherit' });
    execSync('snarkjs powersoftau prepare phase2 pot12_0001.ptau pot12_final.ptau -v', { stdio: 'inherit' });
}

for (const circuit of circuits) {
    console.log(`\n--- Processing ${circuit} ---`);
    const circuitFile = path.join(__dirname, '..', 'circuits', 'claims', `${circuit}.circom`);

    // Compile circuit
    console.log('Compiling...');
    execSync(`.\\circom.exe ${circuitFile} --r1cs --wasm --sym -o ${buildDir}`, { stdio: 'inherit' });

    const circuitArtifacts = path.join(artifactsDir, circuit);
    if (!fs.existsSync(circuitArtifacts)) fs.mkdirSync(circuitArtifacts);

    // Copy wasm
    fs.copyFileSync(
        path.join(buildDir, `${circuit}_js`, `${circuit}.wasm`),
        path.join(circuitArtifacts, 'circuit.wasm')
    );

    // Setup Phase 2 (Circuit Specific)
    console.log('Generating zkey...');
    execSync(`snarkjs groth16 setup ${path.join(buildDir, `${circuit}.r1cs`)} pot12_final.ptau ${path.join(circuitArtifacts, 'circuit_0000.zkey')}`, { stdio: 'inherit' });
    execSync(`snarkjs zkey contribute ${path.join(circuitArtifacts, 'circuit_0000.zkey')} ${path.join(circuitArtifacts, 'circuit.zkey')} --name="Second contribution" -v -e="another random text"`, { stdio: 'inherit' });

    // Export Verification Key
    console.log('Exporting vkey...');
    execSync(`snarkjs zkey export verificationkey ${path.join(circuitArtifacts, 'circuit.zkey')} ${path.join(circuitArtifacts, 'vkey.json')}`, { stdio: 'inherit' });
}

console.log('\n✅ All circuits compiled and artifacts generated successfully!');
