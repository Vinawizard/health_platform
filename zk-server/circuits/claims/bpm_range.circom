pragma circom 2.1.6;

include "../utils/range.circom";
include "../../node_modules/circomlib/circuits/poseidon.circom";

// BPM typically 0..220. Use 9 bits (0..511).
template BpmInRange() {
    signal input bpm; // private

    signal input minBpm; // public
    signal input maxBpm; // public
    signal input patientId;
    signal input ts;
    signal input readingHash;

    signal output commit;

    component rc = RangeCheck(9);
    rc.x <== bpm;
    rc.min <== minBpm;
    rc.max <== maxBpm;

    component h = Poseidon(4);
    h.inputs[0] <== patientId;
    h.inputs[1] <== ts;
    h.inputs[2] <== readingHash;
    h.inputs[3] <== bpm;

    commit <== h.out;
}

component main = BpmInRange();
