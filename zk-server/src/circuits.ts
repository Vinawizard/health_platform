import path from "path";

export type CircuitName = "spo2_ge" | "bpm_range" | "temp_range_f10";

export type CircuitDef = {
    name: CircuitName;
    wasmPath: string;
    zkeyPath: string;
    vkeyPath: string;
};

const ARTIFACTS_DIR = path.resolve(process.cwd(), "artifacts");

export const CIRCUITS: Record<CircuitName, CircuitDef> = {
    spo2_ge: {
        name: "spo2_ge",
        wasmPath: path.join(ARTIFACTS_DIR, "spo2_ge", "circuit.wasm"),
        zkeyPath: path.join(ARTIFACTS_DIR, "spo2_ge", "circuit.zkey"),
        vkeyPath: path.join(ARTIFACTS_DIR, "spo2_ge", "vkey.json"),
    },
    bpm_range: {
        name: "bpm_range",
        wasmPath: path.join(ARTIFACTS_DIR, "bpm_range", "circuit.wasm"),
        zkeyPath: path.join(ARTIFACTS_DIR, "bpm_range", "circuit.zkey"),
        vkeyPath: path.join(ARTIFACTS_DIR, "bpm_range", "vkey.json"),
    },
    temp_range_f10: {
        name: "temp_range_f10",
        wasmPath: path.join(ARTIFACTS_DIR, "temp_range_f10", "circuit.wasm"),
        zkeyPath: path.join(ARTIFACTS_DIR, "temp_range_f10", "circuit.zkey"),
        vkeyPath: path.join(ARTIFACTS_DIR, "temp_range_f10", "vkey.json"),
    },
};
