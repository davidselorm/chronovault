/**
 * Shamir's Secret Sharing (k-of-n threshold scheme) in GF(256) finite field.
 */

// Irreducible polynomial for GF(256): x^8 + x^4 + x^3 + x + 1 (0x11B)
const GF_EXP: number[] = new Array(512);
const GF_LOG: number[] = new Array(256);

(function initGaloisField() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_EXP[i + 255] = x;
    GF_LOG[x] = i;
    x = (x << 1) ^ (x & 0x80 ? 0x11b : 0);
  }
  GF_LOG[0] = 0;
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function gfDiv(a: number, b: number): number {
  if (b === 0) throw new Error("Division by zero in GF(256)");
  if (a === 0) return 0;
  return GF_EXP[(GF_LOG[a] - GF_LOG[b] + 255) % 255];
}

export interface SecretShare {
  x: number; // Share index (1..n)
  y: Uint8Array; // Evaluated polynomial bytes
}

export class ShamirSecretSharing {
  /**
   * Splits a secret buffer into n shares where any k shares can reconstruct it.
   */
  public static split(secret: Uint8Array, n: number, k: number): SecretShare[] {
    if (k > n) throw new Error("Threshold k cannot exceed total shares n");
    if (n > 255 || k < 2) throw new Error("Invalid parameters: 2 <= k <= n <= 255");

    const shares: SecretShare[] = Array.from({ length: n }, (_, i) => ({
      x: i + 1,
      y: new Uint8Array(secret.length)
    }));

    for (let byteIdx = 0; byteIdx < secret.length; byteIdx++) {
      // Coefficients: a0 is the secret byte, a1..a_{k-1} are random
      const coeffs = new Uint8Array(k);
      coeffs[0] = secret[byteIdx];
      for (let i = 1; i < k; i++) {
        coeffs[i] = Math.floor(Math.random() * 256);
      }

      // Evaluate polynomial f(x) for each share x in 1..n
      for (let sIdx = 0; sIdx < n; sIdx++) {
        const x = shares[sIdx].x;
        let y = 0;
        for (let power = k - 1; power >= 0; power--) {
          y = gfMul(y, x) ^ coeffs[power];
        }
        shares[sIdx].y[byteIdx] = y;
      }
    }

    return shares;
  }

  /**
   * Reconstructs the secret from any k valid shares using Lagrange polynomial interpolation at x=0.
   */
  public static combine(shares: SecretShare[]): Uint8Array {
    if (shares.length < 2) throw new Error("Need at least 2 shares to reconstruct");
    const k = shares.length;
    const len = shares[0].y.length;
    const secret = new Uint8Array(len);

    for (let byteIdx = 0; byteIdx < len; byteIdx++) {
      let secretByte = 0;

      for (let i = 0; i < k; i++) {
        const xi = shares[i].x;
        const yi = shares[i].y[byteIdx];

        // Compute Lagrange basis polynomial L_i(0) = product( (0 - xj) / (xi - xj) )
        let li = 1;
        for (let j = 0; j < k; j++) {
          if (i === j) continue;
          const xj = shares[j].x;
          const num = xj; // (0 - xj) in GF(256) is xj since addition is XOR
          const den = xi ^ xj; // (xi - xj) in GF(256) is xi ^ xj
          li = gfMul(li, gfDiv(num, den));
        }

        secretByte ^= gfMul(yi, li);
      }

      secret[byteIdx] = secretByte;
    }

    return secret;
  }
}
