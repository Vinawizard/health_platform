pragma circom 2.1.6;

include "../utils/range.circom";
include "../../node_modules/circomlib/circuits/poseidon.circom";

// Temp10 range: say 900..1100 (90.0F..110.0F)
// Need 11 bits (0..2047).
template TempF10InRange() {
    signal input temp10; // private (tempF*10)

    signal input minTemp10; // public, e.g. 970 (97.0F)
    signal input maxTemp10; // public, e.g. 1000 (100.0F)
    signal input patientId;
    signal input ts;
    signal input readingHash;

    signal output commit;

    component rc = RangeCheck(11);
    rc.x <== temp10;
    rc.min <== minTemp10;
    rc.max <== maxTemp10;

    component h = Poseidon(4);
    h.inputs[0] <== patientId;
    h.inputs[1] <== ts;
    h.inputs[2] <== readingHash;
    h.inputs[3] <== temp10;

    commit <== h.out;
}

component main = TempF10InRange();
