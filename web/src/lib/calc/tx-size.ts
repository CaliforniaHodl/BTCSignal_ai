/**
 * Transaction size estimator (virtual bytes).
 *
 * Works in weight units (WU) and rounds up to vbytes at the end, the same way
 * Bitcoin Core does (vsize = ceil(weight / 4)). Per-input figures assume a
 * worst-case 72-byte DER signature for ECDSA and a 64-byte Schnorr signature
 * (SIGHASH_DEFAULT) for Taproot key-path spends; real signatures are often a
 * byte smaller, so this errs slightly high — which is what you want for fees.
 */

export type ScriptType = "p2pkh" | "p2sh-p2wpkh" | "p2wpkh" | "p2tr";

export const SCRIPT_TYPES: { id: ScriptType; label: string; hint: string }[] = [
  { id: "p2wpkh", label: "Native SegWit (P2WPKH)", hint: "bc1q… addresses" },
  { id: "p2tr", label: "Taproot (P2TR)", hint: "bc1p… addresses" },
  { id: "p2sh-p2wpkh", label: "Nested SegWit (P2SH-P2WPKH)", hint: "3… addresses" },
  { id: "p2pkh", label: "Legacy (P2PKH)", hint: "1… addresses" },
];

/** Weight of one input spending this script type: [non-witness bytes, witness bytes]. */
const INPUT: Record<ScriptType, { base: number; witness: number }> = {
  // outpoint 36 + scriptSig len 1 + scriptSig (1+72 sig, 1+33 pubkey) 107 + sequence 4
  p2pkh: { base: 148, witness: 0 },
  // outpoint 36 + len 1 + redeem script push 23 + sequence 4; witness: items 1 + (1+72) + (1+33)
  "p2sh-p2wpkh": { base: 64, witness: 108 },
  // outpoint 36 + empty scriptSig 1 + sequence 4; witness as above
  p2wpkh: { base: 41, witness: 108 },
  // outpoint 36 + empty scriptSig 1 + sequence 4; witness: items 1 + (1+64) schnorr sig
  p2tr: { base: 41, witness: 66 },
};

/** Output bytes: value 8 + script length 1 + scriptPubKey. */
const OUTPUT: Record<ScriptType, number> = {
  p2pkh: 8 + 1 + 25,
  "p2sh-p2wpkh": 8 + 1 + 23,
  p2wpkh: 8 + 1 + 22,
  p2tr: 8 + 1 + 34,
};

const varIntSize = (n: number) => (n < 0xfd ? 1 : n <= 0xffff ? 3 : 5);

export type TxShape = { inputs: number; inputType: ScriptType; outputs: number; outputType: ScriptType };

export function txWeight({ inputs, inputType, outputs, outputType }: TxShape): number {
  if (!Number.isInteger(inputs) || !Number.isInteger(outputs) || inputs < 1 || outputs < 1) {
    throw new Error("inputs and outputs must be positive integers");
  }
  const segwit = INPUT[inputType].witness > 0;
  // version 4 + locktime 4 + input/output counts
  const baseBytes =
    8 + varIntSize(inputs) + varIntSize(outputs) + inputs * INPUT[inputType].base + outputs * OUTPUT[outputType];
  const witnessBytes = segwit ? 2 /* marker + flag */ + inputs * INPUT[inputType].witness : 0;
  return baseBytes * 4 + witnessBytes;
}

export function txVbytes(shape: TxShape): number {
  return Math.ceil(txWeight(shape) / 4);
}

export type FeeCost = { sats: number; usd: number | null };

/** Fee for a size at a rate (sat/vB). Sats are rounded up — nodes won't relay a fraction. */
export function feeCost(vbytes: number, satPerVb: number, btcUsd: number | null): FeeCost {
  const sats = Math.ceil(vbytes * satPerVb);
  return { sats, usd: btcUsd != null ? (sats / 1e8) * btcUsd : null };
}
