import { z } from "zod";
import type { CircuitName } from "./circuits";

const base = z.object({
    patientId: z.union([z.string(), z.number()]),
    ts: z.union([z.string(), z.number()]),
    readingHash: z.union([z.string(), z.number()]),
});

export const inputSchemaByCircuit: Record<CircuitName, z.ZodTypeAny> = {
    spo2_ge: base.extend({
        spo2: z.union([z.string(), z.number()]),
        minSpo2: z.union([z.string(), z.number()]),
    }),
    bpm_range: base.extend({
        bpm: z.union([z.string(), z.number()]),
        minBpm: z.union([z.string(), z.number()]),
        maxBpm: z.union([z.string(), z.number()]),
    }),
    temp_range_f10: base.extend({
        temp10: z.union([z.string(), z.number()]),
        minTemp10: z.union([z.string(), z.number()]),
        maxTemp10: z.union([z.string(), z.number()]),
    }),
};

export function normalizeWitnessInput(obj: Record<string, any>) {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(obj)) {
        out[k] = typeof v === "string" ? v : String(v);
    }
    return out;
}
