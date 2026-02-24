pragma circom 2.1.6;

include "./bitify.circom";

// Checks: a < b for a,b < 2^n
// Output out is 1 if a < b else 0
template LessThan(n) {
    signal input a;
    signal input b;
    signal output out;

    // We use a classic trick:
    // out = MSB( (a + 2^n - b) ) == 0 ? 1 : 0
    // Equivalent via bit decomposition and checking carry.
    signal tmp;
    tmp <== a + (1 << n) - b;

    component bits = Num2Bits(n+1);
    bits.in <== tmp;

    // If a < b then tmp < 2^n => highest bit (n) is 0
    // So out = 1 - bits.out[n]
    out <== 1 - bits.out[n];
}
