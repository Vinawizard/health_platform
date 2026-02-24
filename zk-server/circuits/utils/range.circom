pragma circom 2.1.6;

include "./less_than.circom";

// Proves min <= x <= max
// All inputs are FIELD elements. Must fit in < 2^n.
template RangeCheck(n) {
    signal input x;
    signal input min;
    signal input max;

    // x >= min  <=>  !(x < min)
    component lt1 = LessThan(n);
    lt1.a <== x;
    lt1.b <== min;

    // x <= max  <=>  x < (max+1)
    component lt2 = LessThan(n);
    lt2.a <== x;
    lt2.b <== max + 1;

    // Enforce lt1.out == 0 and lt2.out == 1
    lt1.out === 0;
    lt2.out === 1;
}
