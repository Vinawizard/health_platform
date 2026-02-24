import fs from "fs/promises";
import * as snarkjs from "snarkjs";
import type { CircuitDef } from "./circuits";

export type ProveResult = {
    proof: any;
    publicSignals: string[];
};

export async function proveGroth16(
    circuit: CircuitDef,
    witnessInput: Record<string, string>
): Promise<ProveResult> {
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        witnessInput,
        circuit.wasmPath,
        circuit.zkeyPath
    );

    return { proof, publicSignals };
}

export async function verifyGroth16(
    circuit: CircuitDef,
    publicSignals: string[],
    proof: any
): Promise<boolean> {
    const vkey = JSON.parse(await fs.readFile(circuit.vkeyPath, "utf-8"));
    return await snarkjs.groth16.verify(vkey, publicSignals, proof);
}
