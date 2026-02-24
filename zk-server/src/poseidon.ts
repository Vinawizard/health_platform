import { buildPoseidon } from "circomlibjs";

let poseidonPromise: ReturnType<typeof buildPoseidon> | null = null;

async function getPoseidon() {
    if (!poseidonPromise) poseidonPromise = buildPoseidon();
    return poseidonPromise;
}

export async function poseidonCommit4(
    a: bigint,
    b: bigint,
    c: bigint,
    d: bigint
): Promise<string> {
    const poseidon = await getPoseidon();
    const F = poseidon.F;

    const out = poseidon([a, b, c, d]);
    return F.toObject(out).toString();
}
