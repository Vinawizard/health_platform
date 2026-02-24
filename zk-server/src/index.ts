import express from "express";
import cors from "cors";
import { z } from "zod";

import { CIRCUITS, type CircuitName } from "./circuits";
import { inputSchemaByCircuit, normalizeWitnessInput } from "./validators";
import { poseidonCommit4 } from "./poseidon";
import { proveGroth16, verifyGroth16 } from "./zk";

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

const circuitParam = z.object({
    circuit: z.enum(["spo2_ge", "bpm_range", "temp_range_f10"]),
});

function getCircuit(name: CircuitName) {
    return CIRCUITS[name];
}

app.post("/zk/commit/:circuit", async (req, res) => {
    try {
        const { circuit } = circuitParam.parse(req.params);
        const schema = inputSchemaByCircuit[circuit];
        const parsed = schema.parse(req.body);

        const patientId = BigInt((parsed as any).patientId);
        const ts = BigInt((parsed as any).ts);
        const readingHash = BigInt((parsed as any).readingHash);

        const valueKey =
            circuit === "spo2_ge" ? "spo2" : circuit === "bpm_range" ? "bpm" : "temp10";

        const value = BigInt((parsed as any)[valueKey]);

        const commit = await poseidonCommit4(patientId, ts, readingHash, value);

        res.json({ circuit, commit });
    } catch (e: any) {
        res.status(400).json({ error: e?.message ?? "bad request" });
    }
});

app.post("/zk/prove/:circuit", async (req, res) => {
    try {
        const { circuit } = circuitParam.parse(req.params);
        const def = getCircuit(circuit);

        const schema = inputSchemaByCircuit[circuit];
        const parsed = schema.parse(req.body);

        const witnessInput = normalizeWitnessInput(parsed as any);

        const { proof, publicSignals } = await proveGroth16(def, witnessInput);

        res.json({
            circuit,
            proof,
            publicSignals,
        });
    } catch (e: any) {
        res.status(400).json({ error: e?.message ?? "bad request" });
    }
});

app.post("/zk/verify/:circuit", async (req, res) => {
    try {
        const { circuit } = circuitParam.parse(req.params);
        const def = getCircuit(circuit);

        const bodySchema = z.object({
            proof: z.any(),
            publicSignals: z.array(z.string()),
        });
        const { proof, publicSignals } = bodySchema.parse(req.body);

        const ok = await verifyGroth16(def, publicSignals, proof);

        res.json({ circuit, verified: ok });
    } catch (e: any) {
        res.status(400).json({ error: e?.message ?? "bad request" });
    }
});

app.get("/zk/vkey/:circuit", async (req, res) => {
    try {
        const { circuit } = circuitParam.parse(req.params);
        const def = getCircuit(circuit);
        res.sendFile(def.vkeyPath);
    } catch (e: any) {
        res.status(400).json({ error: e?.message ?? "bad request" });
    }
});

app.get("/health", (_req, res) => res.json({ ok: true }));

const port = process.env.PORT ? Number(process.env.PORT) : 9000;
app.listen(port, () => {
    console.log(`ZK server running on http://localhost:${port}`);
});
