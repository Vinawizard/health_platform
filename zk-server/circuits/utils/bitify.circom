pragma circom 2.1.6;

// Convert a non-negative integer into n bits (LSB first)
// Constrains in < 2^n range.
template Num2Bits(n) {
    signal input in;
    signal output out[n];

    var i;
    var sum = 0;

    for (i = 0; i < n; i++) {
        out[i] <-- (in >> i) & 1;
        out[i] * (out[i] - 1) === 0; // bit constraint
        sum += out[i] * (1 << i);
    }

    sum === in;
}
