/**
 * Binary batch layout (little-endian):
 *   u32 count
 *   repeat count:
 *     u32 instrumentId
 *     u8  kind        // 0=bid, 1=ask, 2=trade
 *     i32 priceCents
 *     u32 qty
 */
const KIND_BID: u8 = 0;
const KIND_ASK: u8 = 1;
const KIND_TRADE: u8 = 2;

const RECORD_SIZE: i32 = 13;
const MAX_INSTRUMENTS: i32 = 50;
const MAX_BATCH: i32 = 1000;
const HEADER_SIZE: i32 = 4;
const BUFFER_SIZE: i32 = HEADER_SIZE + MAX_BATCH * RECORD_SIZE;

const buffer = new StaticArray<u8>(BUFFER_SIZE);
const mids = new StaticArray<i32>(MAX_INSTRUMENTS);

let instrumentCount: i32 = 5;
let batchSize: i32 = 100;
let rngState: u32 = 1;
let lastBatchBytes: i32 = 0;

function storeU32(offset: i32, value: u32): void {
  store<u32>(changetype<usize>(buffer) + offset, value);
}

function storeI32(offset: i32, value: i32): void {
  store<i32>(changetype<usize>(buffer) + offset, value);
}

function storeU8(offset: i32, value: u8): void {
  store<u8>(changetype<usize>(buffer) + offset, value);
}

/** Seeded xorshift32 — all randomness lives in Wasm. */
function nextU32(): u32 {
  let x = rngState;
  x ^= x << 13;
  x ^= x >> 17;
  x ^= x << 5;
  rngState = x;
  return x;
}

function nextBounded(maxExclusive: u32): u32 {
  if (maxExclusive == 0) return 0;
  return nextU32() % maxExclusive;
}

function clampI32(value: i32, lo: i32, hi: i32): i32 {
  if (value < lo) return lo;
  if (value > hi) return hi;
  return value;
}

/**
 * Configure producer sizing. Call before reset/nextBatch.
 * instrumentCount: 1..50, batchSize: 1..1000.
 */
export function configure(nextInstrumentCount: i32, nextBatchSize: i32): void {
  instrumentCount = clampI32(nextInstrumentCount, 1, MAX_INSTRUMENTS);
  batchSize = clampI32(nextBatchSize, 1, MAX_BATCH);
}

/**
 * Reset RNG and per-instrument mid prices for a new run.
 * Mid starts at 100_00 cents + 100 * id so instruments diverge.
 */
export function reset(seed: u32): void {
  rngState = seed == 0 ? 1 : seed;
  for (let i: i32 = 0; i < instrumentCount; i++) {
    unchecked((mids[i] = 10_000 + i * 100));
  }
  lastBatchBytes = 0;
}

/** Byte length of the payload written by the last nextBatch(). */
export function batchByteLength(): i32 {
  return lastBatchBytes;
}

/**
 * Generate one batch into linear memory.
 * @returns Pointer to the start of the batch payload.
 */
export function nextBatch(): usize {
  const count = batchSize;
  storeU32(0, count as u32);

  let offset: i32 = HEADER_SIZE;

  for (let n: i32 = 0; n < count; n++) {
    const id = nextBounded(instrumentCount as u32) as i32;
    let mid = unchecked(mids[id]);

    // Random-walk mid by [-5, +5] cents (nonzero step preferred).
    let step = (nextBounded(11) as i32) - 5;
    if (step == 0) step = 1;
    mid = clampI32(mid + step, 100, 1_000_000);
    unchecked((mids[id] = mid));

    // Half-spread ≥ 1 ⇒ bid < ask always.
    const halfSpread: i32 = 1 + (nextBounded(5) as i32);
    const bid = mid - halfSpread;
    const ask = mid + halfSpread;

    const kindRoll = nextBounded(3);
    let kind: u8 = KIND_BID;
    let price: i32 = bid;
    let qty: u32 = 1 + nextBounded(50);

    if (kindRoll == 1) {
      kind = KIND_ASK;
      price = ask;
    } else if (kindRoll == 2) {
      kind = KIND_TRADE;
      // Trade price ∈ {bid, ask}
      price = nextBounded(2) == 0 ? bid : ask;
      qty = 1 + nextBounded(100);
    }

    storeU32(offset, id as u32);
    storeU8(offset + 4, kind);
    storeI32(offset + 5, price);
    storeU32(offset + 9, qty);
    offset += RECORD_SIZE;
  }

  lastBatchBytes = offset;
  return changetype<usize>(buffer);
}
