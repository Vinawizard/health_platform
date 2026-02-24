pragma circom 2.1.6;

include "../utils/range.circom";
include "../../node_modules/circomlib/circuits/poseidon.circom";

// SpO2 is usually 0..100. We'll use n=8 bits (0..255).
template Spo2GE() {
    // private witness
    signal input spo2; // integer 0..100

    // public inputs
    signal input minSpo2;     // e.g., 95
    signal input patientId;   // pseudonymous id
    signal input ts;          // timestamp bucket
    signal input readingHash; // hash of encrypted record

    // public output commitment
    signal output commit;

    // Range check: spo2 in [minSpo2, 100]
    component rc = RangeCheck(8);
    rc.x <== spo2;
    rc.min <== minSpo2;
    rc.max <== 100;

    // Bind to record via commitment
    component h = Poseidon(4);
    h.inputs[0] <== patientId;
    h.inputs[1] <== ts;
    h.inputs[2] <== readingHash;
    h.inputs[3] <== spo2;

    commit <== h.out;
}

component main = Spo2GE();
