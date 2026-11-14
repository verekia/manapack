# Benchmark results

<!-- Generated from BENCH.json by bench/benchmd.mjs — do not edit by hand. -->

The same game messages packed by manapack and by 41 other ways to pack them: libraries with a schema,
libraries without one, JSON and the serializer of V8. Every library is given the plain objects a game holds, at the
best settings its documentation names, and returns bytes it does not write over. Before anything is timed, each
of the 256 messages of a sequence is written, read back and compared with the original: a whole number exact, a
fraction to 2 mm. A float is a float32 wherever a library has one.

A size is the average of the 256 messages. A time is the fastest pass over them, each library in a process of its
own, the best of 3 runs. The last three columns say how manapack compares to the library of the row: 🟢 manapack
is smaller or faster, 🔴 manapack is larger or slower, ⚪ within 5% (the run noise of a time).

A library that keeps a state per socket needs its messages read in order on one connection: it is compared with
manapack with its socket state, in a table of its own. Any reader takes a message of the other libraries, in any
order: they are compared with manapack without a state.

- Date: 2026-11-14
- Node: 22.23.4 (V8)
- Bun: 1.4.4 (JavaScriptCore)
- CPU: Intel Xeon Processor @ 2.10GHz, 4 cores

`bun run bench` runs it all again.

## A state update — Node (V8)

What changed in one tick of 50 ms: 14 entities on average, a few fields of each.

Without a state:

| library                              | schema |    size |      write |     read | manapack size    | manapack write    | manapack read    |
| ------------------------------------ | ------ | ------: | ---------: | -------: | ---------------- | ----------------- | ---------------- |
| **manapack**                         | yes    |   607 B |    2.05 µs |  1.37 µs |                  |                   |                  |
| @hpx7/delta-pack                     | yes    |   591 B |    4.27 µs |  3.65 µs | ⚪ even          | 🟢 2.08x faster   | 🟢 2.66x faster  |
| @timeleap/sia                        | yes    |   595 B |    2.06 µs |  1.33 µs | ⚪ even          | ⚪ even           | ⚪ even          |
| restructure                          | yes    |   596 B |   55.47 µs | 34.87 µs | ⚪ even          | 🟢 27.05x faster  | 🟢 25.44x faster |
| schemapack                           | yes    |   659 B |    3.51 µs |  2.34 µs | 🟢 1.09x smaller | 🟢 1.71x faster   | 🟢 1.70x faster  |
| kiwi-schema                          | yes    |   660 B |    4.72 µs |  3.32 µs | 🟢 1.09x smaller | 🟢 2.30x faster   | 🟢 2.42x faster  |
| @javelin/pack                        | yes    |   673 B |   30.09 µs | 24.81 µs | 🟢 1.11x smaller | 🟢 14.68x faster  | 🟢 18.10x faster |
| @geckos.io/typed-array-buffer-schema | yes    |   679 B |   78.60 µs | 81.74 µs | 🟢 1.12x smaller | 🟢 38.33x faster  | 🟢 59.65x faster |
| @bufbuild/protobuf                   | yes    |   691 B |   11.32 µs |  6.42 µs | 🟢 1.14x smaller | 🟢 5.52x faster   | 🟢 4.68x faster  |
| pbf                                  | yes    |   691 B |    3.37 µs |  2.46 µs | 🟢 1.14x smaller | 🟢 1.64x faster   | 🟢 1.80x faster  |
| protobufjs                           | yes    |   691 B |    4.81 µs |  2.80 µs | 🟢 1.14x smaller | 🟢 2.35x faster   | 🟢 2.04x faster  |
| avsc                                 | yes    |   692 B |    4.29 µs |  2.92 µs | 🟢 1.14x smaller | 🟢 2.09x faster   | 🟢 2.13x faster  |
| packcat                              | yes    |   692 B |    5.32 µs |  2.66 µs | 🟢 1.14x smaller | 🟢 2.60x faster   | 🟢 1.94x faster  |
| sirdez                               | yes    |   692 B |    2.04 µs |  1.40 µs | 🟢 1.14x smaller | ⚪ even           | ⚪ even          |
| tinybuf                              | yes    |   692 B |    9.76 µs |  3.29 µs | 🟢 1.14x smaller | 🟢 4.76x faster   | 🟢 2.40x faster  |
| @bare-ts/lib                         | yes    |   693 B |    3.90 µs |  3.13 µs | 🟢 1.14x smaller | 🟢 1.90x faster   | 🟢 2.28x faster  |
| @apache-fory/core                    | yes    |   698 B |    2.94 µs |  1.98 µs | 🟢 1.15x smaller | 🟢 1.43x faster   | 🟢 1.45x faster  |
| typed-binary                         | yes    |   698 B |   11.36 µs | 15.28 µs | 🟢 1.15x smaller | 🟢 5.54x faster   | 🟢 11.15x faster |
| seqproto                             | yes    |   699 B |    3.12 µs |  1.47 µs | 🟢 1.15x smaller | 🟢 1.52x faster   | 🟢 1.08x faster  |
| superbuffer                          | yes    |   701 B |   34.99 µs | 30.27 µs | 🟢 1.16x smaller | 🟢 17.07x faster  | 🟢 22.09x faster |
| @zorsh/zorsh                         | yes    |   741 B |   21.06 µs |  8.56 µs | 🟢 1.22x smaller | 🟢 10.27x faster  | 🟢 6.25x faster  |
| borsh                                | yes    |   741 B |   39.98 µs | 44.16 µs | 🟢 1.22x smaller | 🟢 19.50x faster  | 🟢 32.22x faster |
| bebop                                | yes    |   783 B |    4.17 µs |  2.70 µs | 🟢 1.29x smaller | 🟢 2.03x faster   | 🟢 1.97x faster  |
| cbor2                                | no     |   924 B | 1214.03 µs | 81.30 µs | 🟢 1.52x smaller | 🟢 592.06x faster | 🟢 59.33x faster |
| cborg                                | no     |   924 B |   23.95 µs | 14.92 µs | 🟢 1.52x smaller | 🟢 11.68x faster  | 🟢 10.88x faster |
| cbor-x                               | no     |   924 B |    5.02 µs |  6.23 µs | 🟢 1.52x smaller | 🟢 2.45x faster   | 🟢 4.55x faster  |
| @msgpack/msgpack                     | no     |   924 B |    6.32 µs |  6.47 µs | 🟢 1.52x smaller | 🟢 3.08x faster   | 🟢 4.72x faster  |
| msgpackr                             | no     |   924 B |    4.69 µs |  5.91 µs | 🟢 1.52x smaller | 🟢 2.29x faster   | 🟢 4.31x faster  |
| @jsonjoy.com/json-pack (CBOR)        | no     |   943 B |    4.00 µs |  5.44 µs | 🟢 1.55x smaller | 🟢 1.95x faster   | 🟢 3.97x faster  |
| js-binary                            | yes    |   948 B |   11.35 µs |  3.15 µs | 🟢 1.56x smaller | 🟢 5.54x faster   | 🟢 2.30x faster  |
| lib0                                 | no     |   962 B |   14.43 µs | 20.76 µs | 🟢 1.59x smaller | 🟢 7.04x faster   | 🟢 15.15x faster |
| flatbuffers (object API)             | yes    |   983 B |   11.05 µs |  4.12 µs | 🟢 1.62x smaller | 🟢 5.39x faster   | 🟢 3.01x faster  |
| flatbuffers (read in place)          | yes    |   983 B |   11.01 µs |  3.49 µs | 🟢 1.62x smaller | 🟢 5.37x faster   | 🟢 2.55x faster  |
| msgpack-lite                         | no     | 1,160 B |    9.64 µs | 33.53 µs | 🟢 1.91x smaller | 🟢 4.70x faster   | 🟢 24.46x faster |
| notepack.io                          | no     | 1,160 B |   10.71 µs |  6.07 µs | 🟢 1.91x smaller | 🟢 5.22x faster   | 🟢 4.43x faster  |
| @jsonjoy.com/json-pack (MessagePack) | no     | 1,175 B |    3.88 µs |  5.44 µs | 🟢 1.94x smaller | 🟢 1.89x faster   | 🟢 3.97x faster  |
| node:v8 serialize                    | no     | 1,341 B |    4.70 µs |  8.25 µs | 🟢 2.21x smaller | 🟢 2.29x faster   | 🟢 6.02x faster  |
| bson                                 | no     | 1,385 B |    8.52 µs |  8.72 µs | 🟢 2.28x smaller | 🟢 4.16x faster   | 🟢 6.36x faster  |
| JSON                                 | no     | 1,971 B |   14.09 µs | 10.94 µs | 🟢 3.25x smaller | 🟢 6.87x faster   | 🟢 7.98x faster  |

With a state per socket:

| library                                            | schema |  size |   write |     read | manapack size    | manapack write  | manapack read    |
| -------------------------------------------------- | ------ | ----: | ------: | -------: | ---------------- | --------------- | ---------------- |
| **manapack (socket state)**                        | yes    | 305 B | 1.98 µs |  0.52 µs |                  |                 |                  |
| **manapack (socket state, fixed-point positions)** | yes    | 278 B | 2.06 µs |  0.53 µs |                  |                 |                  |
| @colyseus/schema                                   | yes    | 356 B | 5.89 µs | 10.26 µs | 🟢 1.17x smaller | 🟢 2.98x faster | 🟢 19.86x faster |
| msgpackr (records, float32)                        | no     | 650 B | 5.48 µs |  2.00 µs | 🟢 2.13x smaller | 🟢 2.77x faster | 🟢 3.86x faster  |
| cbor-x (records, float32)                          | no     | 695 B | 6.02 µs |  2.11 µs | 🟢 2.28x smaller | 🟢 3.05x faster | 🟢 4.09x faster  |

## A state update — Bun (JavaScriptCore)

What changed in one tick of 50 ms: 14 entities on average, a few fields of each.

Without a state:

| library                              | schema |    size |     write |     read | manapack size    | manapack write    | manapack read    |
| ------------------------------------ | ------ | ------: | --------: | -------: | ---------------- | ----------------- | ---------------- |
| **manapack**                         | yes    |   607 B |   1.16 µs |  0.92 µs |                  |                   |                  |
| @hpx7/delta-pack                     | yes    |   591 B |   3.45 µs |  2.97 µs | ⚪ even          | 🟢 2.97x faster   | 🟢 3.22x faster  |
| @timeleap/sia                        | yes    |   595 B |   1.09 µs |  1.73 µs | ⚪ even          | 🔴 1.07x slower   | 🟢 1.88x faster  |
| restructure                          | yes    |   596 B |  19.28 µs | 12.76 µs | ⚪ even          | 🟢 16.57x faster  | 🟢 13.84x faster |
| schemapack                           | yes    |   659 B |   2.99 µs |  0.99 µs | 🟢 1.09x smaller | 🟢 2.57x faster   | 🟢 1.08x faster  |
| kiwi-schema                          | yes    |   660 B |   3.17 µs |  3.36 µs | 🟢 1.09x smaller | 🟢 2.73x faster   | 🟢 3.64x faster  |
| @javelin/pack                        | yes    |   673 B |  10.44 µs |  7.19 µs | 🟢 1.11x smaller | 🟢 8.98x faster   | 🟢 7.80x faster  |
| @geckos.io/typed-array-buffer-schema | yes    |   679 B |  65.23 µs | 54.79 µs | 🟢 1.12x smaller | 🟢 56.07x faster  | 🟢 59.42x faster |
| @bufbuild/protobuf                   | yes    |   691 B |   8.41 µs |  6.04 µs | 🟢 1.14x smaller | 🟢 7.23x faster   | 🟢 6.55x faster  |
| pbf                                  | yes    |   691 B |   1.87 µs |  1.87 µs | 🟢 1.14x smaller | 🟢 1.61x faster   | 🟢 2.03x faster  |
| protobufjs                           | yes    |   691 B |   3.59 µs |  2.85 µs | 🟢 1.14x smaller | 🟢 3.09x faster   | 🟢 3.09x faster  |
| avsc                                 | yes    |   692 B |   3.71 µs |  3.65 µs | 🟢 1.14x smaller | 🟢 3.19x faster   | 🟢 3.96x faster  |
| packcat                              | yes    |   692 B |   3.89 µs |  1.91 µs | 🟢 1.14x smaller | 🟢 3.35x faster   | 🟢 2.08x faster  |
| sirdez                               | yes    |   692 B |   1.31 µs |  1.10 µs | 🟢 1.14x smaller | 🟢 1.12x faster   | 🟢 1.19x faster  |
| tinybuf                              | yes    |   692 B |   3.98 µs |  2.67 µs | 🟢 1.14x smaller | 🟢 3.42x faster   | 🟢 2.90x faster  |
| @bare-ts/lib                         | yes    |   693 B |   2.92 µs |  2.78 µs | 🟢 1.14x smaller | 🟢 2.51x faster   | 🟢 3.01x faster  |
| @apache-fory/core                    | yes    |   698 B |   2.05 µs |  1.09 µs | 🟢 1.15x smaller | 🟢 1.76x faster   | 🟢 1.19x faster  |
| typed-binary                         | yes    |   698 B |   9.09 µs | 11.49 µs | 🟢 1.15x smaller | 🟢 7.82x faster   | 🟢 12.46x faster |
| seqproto                             | yes    |   699 B |   1.87 µs |  1.60 µs | 🟢 1.15x smaller | 🟢 1.61x faster   | 🟢 1.73x faster  |
| superbuffer                          | yes    |   701 B |  18.14 µs | 17.88 µs | 🟢 1.16x smaller | 🟢 15.59x faster  | 🟢 19.40x faster |
| @zorsh/zorsh                         | yes    |   741 B |  13.76 µs | 14.18 µs | 🟢 1.22x smaller | 🟢 11.83x faster  | 🟢 15.38x faster |
| borsh                                | yes    |   741 B |  21.82 µs | 28.98 µs | 🟢 1.22x smaller | 🟢 18.75x faster  | 🟢 31.44x faster |
| bebop                                | yes    |   783 B |   2.63 µs |  2.82 µs | 🟢 1.29x smaller | 🟢 2.26x faster   | 🟢 3.06x faster  |
| cbor2                                | no     |   924 B | 494.86 µs | 66.85 µs | 🟢 1.52x smaller | 🟢 425.35x faster | 🟢 72.51x faster |
| cborg                                | no     |   924 B |  21.13 µs | 21.97 µs | 🟢 1.52x smaller | 🟢 18.16x faster  | 🟢 23.83x faster |
| cbor-x                               | no     |   924 B |   3.77 µs |  5.21 µs | 🟢 1.52x smaller | 🟢 3.24x faster   | 🟢 5.65x faster  |
| @msgpack/msgpack                     | no     |   924 B |   5.40 µs |  6.47 µs | 🟢 1.52x smaller | 🟢 4.64x faster   | 🟢 7.02x faster  |
| msgpackr                             | no     |   924 B |   4.60 µs |  4.71 µs | 🟢 1.52x smaller | 🟢 3.95x faster   | 🟢 5.11x faster  |
| @jsonjoy.com/json-pack (CBOR)        | no     |   943 B |   3.36 µs |  4.67 µs | 🟢 1.55x smaller | 🟢 2.89x faster   | 🟢 5.06x faster  |
| js-binary                            | yes    |   948 B |   7.15 µs |  2.91 µs | 🟢 1.56x smaller | 🟢 6.14x faster   | 🟢 3.16x faster  |
| lib0                                 | no     |   962 B |  12.17 µs | 18.47 µs | 🟢 1.59x smaller | 🟢 10.46x faster  | 🟢 20.03x faster |
| flatbuffers (object API)             | yes    |   983 B |   4.92 µs |  2.78 µs | 🟢 1.62x smaller | 🟢 4.23x faster   | 🟢 3.01x faster  |
| flatbuffers (read in place)          | yes    |   983 B |   5.08 µs |  2.17 µs | 🟢 1.62x smaller | 🟢 4.36x faster   | 🟢 2.35x faster  |
| msgpack-lite                         | no     | 1,160 B |   7.43 µs | 13.20 µs | 🟢 1.91x smaller | 🟢 6.39x faster   | 🟢 14.32x faster |
| notepack.io                          | no     | 1,160 B |   9.70 µs |  3.07 µs | 🟢 1.91x smaller | 🟢 8.34x faster   | 🟢 3.33x faster  |
| @jsonjoy.com/json-pack (MessagePack) | no     | 1,175 B |   3.89 µs |  4.54 µs | 🟢 1.94x smaller | 🟢 3.34x faster   | 🟢 4.93x faster  |
| bson                                 | no     | 1,385 B |   7.74 µs | 12.86 µs | 🟢 2.28x smaller | 🟢 6.65x faster   | 🟢 13.95x faster |
| node:v8 serialize                    | no     | 1,593 B |  15.02 µs |  4.27 µs | 🟢 2.63x smaller | 🟢 12.91x faster  | 🟢 4.63x faster  |
| JSON                                 | no     | 1,971 B |   5.04 µs |  3.58 µs | 🟢 3.25x smaller | 🟢 4.33x faster   | 🟢 3.88x faster  |

With a state per socket:

| library                                            | schema |  size |   write |    read | manapack size    | manapack write  | manapack read    |
| -------------------------------------------------- | ------ | ----: | ------: | ------: | ---------------- | --------------- | ---------------- |
| **manapack (socket state)**                        | yes    | 305 B | 0.82 µs | 0.39 µs |                  |                 |                  |
| **manapack (socket state, fixed-point positions)** | yes    | 278 B | 0.92 µs | 0.47 µs |                  |                 |                  |
| @colyseus/schema                                   | yes    | 356 B | 4.82 µs | 7.18 µs | 🟢 1.17x smaller | 🟢 5.86x faster | 🟢 18.41x faster |
| msgpackr (records, float32)                        | no     | 650 B | 4.51 µs | 3.75 µs | 🟢 2.13x smaller | 🟢 5.49x faster | 🟢 9.61x faster  |
| cbor-x (records, float32)                          | no     | 695 B | 3.72 µs | 3.75 µs | 🟢 2.28x smaller | 🟢 4.52x faster | 🟢 9.61x faster  |

## A snapshot — Node (V8)

Everything about 32 entities: what a client is sent when it joins.

Without a state:

| library                              | schema |    size |      write |      read | manapack size    | manapack write     | manapack read    |
| ------------------------------------ | ------ | ------: | ---------: | --------: | ---------------- | ------------------ | ---------------- |
| **manapack**                         | yes    | 1,660 B |    3.27 µs |   4.12 µs |                  |                    |                  |
| @hpx7/delta-pack                     | yes    | 1,581 B |   12.29 µs |  10.52 µs | ⚪ even          | 🟢 3.76x faster    | 🟢 2.56x faster  |
| kiwi-schema                          | yes    | 1,627 B |    9.43 µs |  11.26 µs | ⚪ even          | 🟢 2.89x faster    | 🟢 2.74x faster  |
| packcat                              | yes    | 1,629 B |   10.56 µs |   8.59 µs | ⚪ even          | 🟢 3.23x faster    | 🟢 2.09x faster  |
| schemapack                           | yes    | 1,629 B |    7.33 µs |   7.65 µs | ⚪ even          | 🟢 2.25x faster    | 🟢 1.86x faster  |
| sirdez                               | yes    | 1,629 B |    3.59 µs |   4.82 µs | ⚪ even          | 🟢 1.10x faster    | 🟢 1.17x faster  |
| tinybuf                              | yes    | 1,629 B |   39.27 µs |  10.98 µs | ⚪ even          | 🟢 12.03x faster   | 🟢 2.67x faster  |
| avsc                                 | yes    | 1,634 B |    9.95 µs |   6.03 µs | ⚪ even          | 🟢 3.05x faster    | 🟢 1.46x faster  |
| @bare-ts/lib                         | yes    | 1,635 B |    8.55 µs |   8.97 µs | ⚪ even          | 🟢 2.62x faster    | 🟢 2.18x faster  |
| @timeleap/sia                        | yes    | 1,637 B |    3.91 µs |   3.61 µs | ⚪ even          | 🟢 1.20x faster    | 🔴 1.14x slower  |
| restructure                          | yes    | 1,638 B |  148.62 µs |  91.48 µs | ⚪ even          | 🟢 45.52x faster   | 🟢 22.22x faster |
| typed-binary                         | yes    | 1,640 B |   15.92 µs |  27.62 µs | ⚪ even          | 🟢 4.88x faster    | 🟢 6.71x faster  |
| @apache-fory/core                    | yes    | 1,642 B |    3.47 µs |   4.30 µs | ⚪ even          | 🟢 1.06x faster    | ⚪ even          |
| superbuffer                          | yes    | 1,704 B |  103.10 µs |  60.57 µs | ⚪ even          | 🟢 31.58x faster   | 🟢 14.71x faster |
| @javelin/pack                        | yes    | 1,708 B |   71.81 µs |  63.30 µs | ⚪ even          | 🟢 21.99x faster   | 🟢 15.38x faster |
| @geckos.io/typed-array-buffer-schema | yes    | 1,714 B |  171.20 µs | 179.13 µs | ⚪ even          | 🟢 52.43x faster   | 🟢 43.51x faster |
| @zorsh/zorsh                         | yes    | 1,832 B |   82.07 µs |  26.08 µs | 🟢 1.10x smaller | 🟢 25.14x faster   | 🟢 6.34x faster  |
| bebop                                | yes    | 1,832 B |    7.68 µs |   8.09 µs | 🟢 1.10x smaller | 🟢 2.35x faster    | 🟢 1.97x faster  |
| borsh                                | yes    | 1,832 B |   92.43 µs | 133.52 µs | 🟢 1.10x smaller | 🟢 28.31x faster   | 🟢 32.43x faster |
| js-binary                            | yes    | 2,013 B |   34.68 µs |   9.77 µs | 🟢 1.21x smaller | 🟢 10.62x faster   | 🟢 2.37x faster  |
| @bufbuild/protobuf                   | yes    | 2,024 B |   27.51 µs |  25.01 µs | 🟢 1.22x smaller | 🟢 8.42x faster    | 🟢 6.07x faster  |
| pbf                                  | yes    | 2,024 B |    8.22 µs |  10.15 µs | 🟢 1.22x smaller | 🟢 2.52x faster    | 🟢 2.47x faster  |
| protobufjs                           | yes    | 2,024 B |   12.93 µs |   9.24 µs | 🟢 1.22x smaller | 🟢 3.96x faster    | 🟢 2.25x faster  |
| seqproto                             | yes    | 2,355 B |    4.98 µs |   5.82 µs | 🟢 1.42x smaller | 🟢 1.53x faster    | 🟢 1.41x faster  |
| flatbuffers (object API)             | yes    | 2,693 B |   55.09 µs |  13.54 µs | 🟢 1.62x smaller | 🟢 16.87x faster   | 🟢 3.29x faster  |
| flatbuffers (read in place)          | yes    | 2,693 B |   47.15 µs |  12.22 µs | 🟢 1.62x smaller | 🟢 14.44x faster   | 🟢 2.97x faster  |
| @msgpack/msgpack                     | no     | 3,783 B |   27.95 µs |  26.86 µs | 🟢 2.28x smaller | 🟢 8.56x faster    | 🟢 6.53x faster  |
| msgpackr                             | no     | 3,783 B |   18.87 µs |  26.32 µs | 🟢 2.28x smaller | 🟢 5.78x faster    | 🟢 6.39x faster  |
| cbor2                                | no     | 3,806 B | 4868.98 µs | 319.75 µs | 🟢 2.29x smaller | 🟢 1491.22x faster | 🟢 77.67x faster |
| cborg                                | no     | 3,806 B |   67.55 µs |  58.98 µs | 🟢 2.29x smaller | 🟢 20.69x faster   | 🟢 14.33x faster |
| cbor-x                               | no     | 3,807 B |   43.07 µs |  27.54 µs | 🟢 2.29x smaller | 🟢 13.19x faster   | 🟢 6.69x faster  |
| @jsonjoy.com/json-pack (CBOR)        | no     | 3,951 B |   16.96 µs |  20.49 µs | 🟢 2.38x smaller | 🟢 5.19x faster    | 🟢 4.98x faster  |
| lib0                                 | no     | 3,966 B |   47.65 µs |  78.12 µs | 🟢 2.39x smaller | 🟢 14.59x faster   | 🟢 18.98x faster |
| msgpack-lite                         | no     | 4,167 B |   40.18 µs | 129.29 µs | 🟢 2.51x smaller | 🟢 12.31x faster   | 🟢 31.40x faster |
| notepack.io                          | no     | 4,167 B |   45.07 µs |  32.60 µs | 🟢 2.51x smaller | 🟢 13.80x faster   | 🟢 7.92x faster  |
| @jsonjoy.com/json-pack (MessagePack) | no     | 4,260 B |   16.09 µs |  19.77 µs | 🟢 2.57x smaller | 🟢 4.93x faster    | 🟢 4.80x faster  |
| node:v8 serialize                    | no     | 4,742 B |   13.93 µs |  21.98 µs | 🟢 2.86x smaller | 🟢 4.27x faster    | 🟢 5.34x faster  |
| bson                                 | no     | 5,277 B |   28.68 µs |  42.36 µs | 🟢 3.18x smaller | 🟢 8.78x faster    | 🟢 10.29x faster |
| JSON                                 | no     | 6,367 B |   30.74 µs |  25.70 µs | 🟢 3.84x smaller | 🟢 9.41x faster    | 🟢 6.24x faster  |

With a state per socket:

| library                                            | schema |    size |    write |     read | manapack size    | manapack write   | manapack read    |
| -------------------------------------------------- | ------ | ------: | -------: | -------: | ---------------- | ---------------- | ---------------- |
| **manapack (socket state)**                        | yes    |   992 B |  1.85 µs |  1.77 µs |                  |                  |                  |
| **manapack (socket state, fixed-point positions)** | yes    |   923 B |  2.06 µs |  1.82 µs |                  |                  |                  |
| msgpackr (records, float32)                        | no     | 2,018 B | 12.69 µs |  5.34 µs | 🟢 2.03x smaller | 🟢 6.85x faster  | 🟢 3.03x faster  |
| cbor-x (records, float32)                          | no     | 2,135 B | 13.18 µs |  5.93 µs | 🟢 2.15x smaller | 🟢 7.12x faster  | 🟢 3.36x faster  |
| @colyseus/schema                                   | yes    | 2,153 B | 30.19 µs | 89.59 µs | 🟢 2.17x smaller | 🟢 16.31x faster | 🟢 50.74x faster |

## A snapshot — Bun (JavaScriptCore)

Everything about 32 entities: what a client is sent when it joins.

Without a state:

| library                              | schema |    size |      write |      read | manapack size    | manapack write    | manapack read    |
| ------------------------------------ | ------ | ------: | ---------: | --------: | ---------------- | ----------------- | ---------------- |
| **manapack**                         | yes    | 1,660 B |    1.94 µs |   4.01 µs |                  |                   |                  |
| @hpx7/delta-pack                     | yes    | 1,581 B |   11.12 µs |   8.53 µs | ⚪ even          | 🟢 5.72x faster   | 🟢 2.12x faster  |
| kiwi-schema                          | yes    | 1,627 B |    6.19 µs |  10.40 µs | ⚪ even          | 🟢 3.19x faster   | 🟢 2.59x faster  |
| packcat                              | yes    | 1,629 B |    8.12 µs |   7.64 µs | ⚪ even          | 🟢 4.18x faster   | 🟢 1.90x faster  |
| schemapack                           | yes    | 1,629 B |    8.52 µs |   4.10 µs | ⚪ even          | 🟢 4.39x faster   | ⚪ even          |
| sirdez                               | yes    | 1,629 B |    2.54 µs |   3.70 µs | ⚪ even          | 🟢 1.31x faster   | 🔴 1.08x slower  |
| tinybuf                              | yes    | 1,629 B |   16.97 µs |  17.22 µs | ⚪ even          | 🟢 8.73x faster   | 🟢 4.29x faster  |
| avsc                                 | yes    | 1,634 B |    6.75 µs |   5.03 µs | ⚪ even          | 🟢 3.47x faster   | 🟢 1.25x faster  |
| @bare-ts/lib                         | yes    | 1,635 B |    6.35 µs |   9.19 µs | ⚪ even          | 🟢 3.27x faster   | 🟢 2.29x faster  |
| @timeleap/sia                        | yes    | 1,637 B |    2.00 µs |   6.08 µs | ⚪ even          | ⚪ even           | 🟢 1.51x faster  |
| restructure                          | yes    | 1,638 B |   39.39 µs |  39.19 µs | ⚪ even          | 🟢 20.27x faster  | 🟢 9.77x faster  |
| typed-binary                         | yes    | 1,640 B |   30.51 µs |  35.01 µs | ⚪ even          | 🟢 15.70x faster  | 🟢 8.72x faster  |
| @apache-fory/core                    | yes    | 1,642 B |    2.33 µs |   4.13 µs | ⚪ even          | 🟢 1.20x faster   | ⚪ even          |
| superbuffer                          | yes    | 1,704 B |   34.86 µs |  37.19 µs | ⚪ even          | 🟢 17.94x faster  | 🟢 9.27x faster  |
| @javelin/pack                        | yes    | 1,708 B |   27.68 µs |  26.47 µs | ⚪ even          | 🟢 14.24x faster  | 🟢 6.60x faster  |
| @geckos.io/typed-array-buffer-schema | yes    | 1,714 B |  175.04 µs | 151.06 µs | ⚪ even          | 🟢 90.06x faster  | 🟢 37.64x faster |
| @zorsh/zorsh                         | yes    | 1,832 B |   36.45 µs |  45.49 µs | 🟢 1.10x smaller | 🟢 18.76x faster  | 🟢 11.34x faster |
| bebop                                | yes    | 1,832 B |    5.08 µs |   8.76 µs | 🟢 1.10x smaller | 🟢 2.62x faster   | 🟢 2.18x faster  |
| borsh                                | yes    | 1,832 B |   66.71 µs |  88.49 µs | 🟢 1.10x smaller | 🟢 34.32x faster  | 🟢 22.05x faster |
| js-binary                            | yes    | 2,013 B |   24.24 µs |  10.43 µs | 🟢 1.21x smaller | 🟢 12.47x faster  | 🟢 2.60x faster  |
| @bufbuild/protobuf                   | yes    | 2,024 B |   25.86 µs |  27.09 µs | 🟢 1.22x smaller | 🟢 13.30x faster  | 🟢 6.75x faster  |
| pbf                                  | yes    | 2,024 B |    4.42 µs |   9.35 µs | 🟢 1.22x smaller | 🟢 2.27x faster   | 🟢 2.33x faster  |
| protobufjs                           | yes    | 2,024 B |    7.62 µs |  10.69 µs | 🟢 1.22x smaller | 🟢 3.92x faster   | 🟢 2.66x faster  |
| seqproto                             | yes    | 2,355 B |    4.05 µs |   6.38 µs | 🟢 1.42x smaller | 🟢 2.08x faster   | 🟢 1.59x faster  |
| flatbuffers (object API)             | yes    | 2,693 B |   15.68 µs |   9.07 µs | 🟢 1.62x smaller | 🟢 8.07x faster   | 🟢 2.26x faster  |
| flatbuffers (read in place)          | yes    | 2,693 B |   15.54 µs |   7.55 µs | 🟢 1.62x smaller | 🟢 8.00x faster   | 🟢 1.88x faster  |
| @msgpack/msgpack                     | no     | 3,783 B |   18.42 µs |  35.20 µs | 🟢 2.28x smaller | 🟢 9.48x faster   | 🟢 8.77x faster  |
| msgpackr                             | no     | 3,783 B |   15.70 µs |  30.37 µs | 🟢 2.28x smaller | 🟢 8.08x faster   | 🟢 7.57x faster  |
| cbor2                                | no     | 3,806 B | 1817.17 µs | 251.27 µs | 🟢 2.29x smaller | 🟢 934.99x faster | 🟢 62.62x faster |
| cborg                                | no     | 3,806 B |   68.16 µs |  94.78 µs | 🟢 2.29x smaller | 🟢 35.07x faster  | 🟢 23.62x faster |
| cbor-x                               | no     | 3,807 B |   13.23 µs |  33.24 µs | 🟢 2.29x smaller | 🟢 6.81x faster   | 🟢 8.28x faster  |
| @jsonjoy.com/json-pack (CBOR)        | no     | 3,951 B |   15.32 µs |  21.55 µs | 🟢 2.38x smaller | 🟢 7.88x faster   | 🟢 5.37x faster  |
| lib0                                 | no     | 3,966 B |   37.04 µs |  76.08 µs | 🟢 2.39x smaller | 🟢 19.06x faster  | 🟢 18.96x faster |
| msgpack-lite                         | no     | 4,167 B |   34.13 µs |  55.45 µs | 🟢 2.51x smaller | 🟢 17.56x faster  | 🟢 13.82x faster |
| notepack.io                          | no     | 4,167 B |   40.59 µs |  18.55 µs | 🟢 2.51x smaller | 🟢 20.89x faster  | 🟢 4.62x faster  |
| @jsonjoy.com/json-pack (MessagePack) | no     | 4,260 B |   16.06 µs |  19.96 µs | 🟢 2.57x smaller | 🟢 8.26x faster   | 🟢 4.97x faster  |
| node:v8 serialize                    | no     | 5,078 B |   48.18 µs |  14.17 µs | 🟢 3.06x smaller | 🟢 24.79x faster  | 🟢 3.53x faster  |
| bson                                 | no     | 5,277 B |   26.47 µs |  77.79 µs | 🟢 3.18x smaller | 🟢 13.62x faster  | 🟢 19.39x faster |
| JSON                                 | no     | 6,367 B |   10.56 µs |  10.51 µs | 🟢 3.84x smaller | 🟢 5.43x faster   | 🟢 2.62x faster  |

With a state per socket:

| library                                            | schema |    size |    write |     read | manapack size    | manapack write   | manapack read    |
| -------------------------------------------------- | ------ | ------: | -------: | -------: | ---------------- | ---------------- | ---------------- |
| **manapack (socket state)**                        | yes    |   992 B |  1.10 µs |  2.80 µs |                  |                  |                  |
| **manapack (socket state, fixed-point positions)** | yes    |   923 B |  1.16 µs |  2.77 µs |                  |                  |                  |
| msgpackr (records, float32)                        | no     | 2,018 B | 13.29 µs |  6.19 µs | 🟢 2.03x smaller | 🟢 12.07x faster | 🟢 2.21x faster  |
| cbor-x (records, float32)                          | no     | 2,135 B | 10.99 µs |  6.65 µs | 🟢 2.15x smaller | 🟢 9.98x faster  | 🟢 2.37x faster  |
| @colyseus/schema                                   | yes    | 2,153 B | 35.47 µs | 63.44 µs | 🟢 2.17x smaller | 🟢 32.20x faster | 🟢 22.63x faster |

## A client input — Node (V8)

What a client sends 20 times a second: its pose and the abilities it used.

Without a state:

| library                              | schema |  size |     write |     read | manapack size    | manapack write    | manapack read     |
| ------------------------------------ | ------ | ----: | --------: | -------: | ---------------- | ----------------- | ----------------- |
| **manapack**                         | yes    |  49 B |   0.24 µs |  0.13 µs |                  |                   |                   |
| avsc                                 | yes    |  47 B |   0.19 µs |  0.23 µs | 🔴 1.05x larger  | 🔴 1.26x slower   | 🟢 1.86x faster   |
| @hpx7/delta-pack                     | yes    |  47 B |   0.25 µs |  0.28 µs | ⚪ even          | ⚪ even           | 🟢 2.27x faster   |
| kiwi-schema                          | yes    |  47 B |   0.93 µs |  0.29 µs | ⚪ even          | 🟢 3.82x faster   | 🟢 2.30x faster   |
| @bare-ts/lib                         | yes    |  48 B |   0.63 µs |  0.23 µs | ⚪ even          | 🟢 2.60x faster   | 🟢 1.81x faster   |
| packcat                              | yes    |  48 B |   0.50 µs |  0.22 µs | ⚪ even          | 🟢 2.04x faster   | 🟢 1.79x faster   |
| sirdez                               | yes    |  48 B |   0.19 µs |  0.15 µs | ⚪ even          | 🔴 1.27x slower   | 🟢 1.21x faster   |
| tinybuf                              | yes    |  48 B |   1.08 µs |  0.40 µs | ⚪ even          | 🟢 4.41x faster   | 🟢 3.17x faster   |
| schemapack                           | yes    |  49 B |   0.24 µs |  0.21 µs | ⚪ even          | ⚪ even           | 🟢 1.66x faster   |
| @timeleap/sia                        | yes    |  50 B |   0.20 µs |  0.14 µs | ⚪ even          | 🔴 1.23x slower   | 🟢 1.14x faster   |
| restructure                          | yes    |  50 B |   3.54 µs |  4.11 µs | ⚪ even          | 🟢 14.49x faster  | 🟢 32.77x faster  |
| @apache-fory/core                    | yes    |  52 B |   0.24 µs |  0.24 µs | ⚪ even          | ⚪ even           | 🟢 1.88x faster   |
| typed-binary                         | yes    |  53 B |   0.55 µs |  1.47 µs | 🟢 1.08x smaller | 🟢 2.24x faster   | 🟢 11.75x faster  |
| @bufbuild/protobuf                   | yes    |  55 B |   1.70 µs |  0.73 µs | 🟢 1.11x smaller | 🟢 6.95x faster   | 🟢 5.83x faster   |
| pbf                                  | yes    |  55 B |   0.40 µs |  0.26 µs | 🟢 1.11x smaller | 🟢 1.62x faster   | 🟢 2.09x faster   |
| protobufjs                           | yes    |  55 B |   0.33 µs |  0.26 µs | 🟢 1.11x smaller | 🟢 1.36x faster   | 🟢 2.08x faster   |
| @javelin/pack                        | yes    |  55 B |   2.27 µs |  1.79 µs | 🟢 1.11x smaller | 🟢 9.30x faster   | 🟢 14.32x faster  |
| superbuffer                          | yes    |  56 B |   3.66 µs |  2.33 µs | 🟢 1.13x smaller | 🟢 14.98x faster  | 🟢 18.55x faster  |
| @zorsh/zorsh                         | yes    |  59 B |   1.62 µs |  0.76 µs | 🟢 1.20x smaller | 🟢 6.63x faster   | 🟢 6.04x faster   |
| borsh                                | yes    |  59 B |   3.21 µs |  4.95 µs | 🟢 1.20x smaller | 🟢 13.13x faster  | 🟢 39.50x faster  |
| @geckos.io/typed-array-buffer-schema | yes    |  61 B |   8.50 µs | 28.31 µs | 🟢 1.24x smaller | 🟢 34.75x faster  | 🟢 225.81x faster |
| bebop                                | yes    |  62 B |   0.27 µs |  0.26 µs | 🟢 1.26x smaller | 🟢 1.09x faster   | 🟢 2.09x faster   |
| seqproto                             | yes    |  65 B |   0.53 µs |  0.20 µs | 🟢 1.32x smaller | 🟢 2.19x faster   | 🟢 1.58x faster   |
| js-binary                            | yes    |  68 B |   0.84 µs |  0.28 µs | 🟢 1.39x smaller | 🟢 3.43x faster   | 🟢 2.22x faster   |
| @msgpack/msgpack                     | no     |  96 B |   0.98 µs |  0.70 µs | 🟢 1.95x smaller | 🟢 3.99x faster   | 🟢 5.59x faster   |
| cbor-x                               | no     |  96 B |   0.52 µs |  0.66 µs | 🟢 1.95x smaller | 🟢 2.15x faster   | 🟢 5.29x faster   |
| cbor2                                | no     |  96 B | 107.68 µs |  9.25 µs | 🟢 1.95x smaller | 🟢 440.43x faster | 🟢 73.78x faster  |
| cborg                                | no     |  96 B |   2.38 µs |  1.55 µs | 🟢 1.95x smaller | 🟢 9.75x faster   | 🟢 12.38x faster  |
| msgpackr                             | no     |  96 B |   0.50 µs |  0.44 µs | 🟢 1.95x smaller | 🟢 2.05x faster   | 🟢 3.48x faster   |
| @jsonjoy.com/json-pack (CBOR)        | no     |  98 B |   0.42 µs |  0.51 µs | 🟢 2.00x smaller | 🟢 1.72x faster   | 🟢 4.03x faster   |
| lib0                                 | no     | 101 B |   2.29 µs |  2.09 µs | 🟢 2.04x smaller | 🟢 9.38x faster   | 🟢 16.68x faster  |
| msgpack-lite                         | no     | 116 B |   1.76 µs |  3.48 µs | 🟢 2.36x smaller | 🟢 7.22x faster   | 🟢 27.73x faster  |
| notepack.io                          | no     | 116 B |   0.97 µs |  0.73 µs | 🟢 2.36x smaller | 🟢 3.97x faster   | 🟢 5.82x faster   |
| @jsonjoy.com/json-pack (MessagePack) | no     | 117 B |   0.37 µs |  0.43 µs | 🟢 2.37x smaller | 🟢 1.52x faster   | 🟢 3.43x faster   |
| flatbuffers (object API)             | yes    | 124 B |   1.82 µs |  0.49 µs | 🟢 2.52x smaller | 🟢 7.45x faster   | 🟢 3.93x faster   |
| flatbuffers (read in place)          | yes    | 124 B |   1.81 µs |  0.53 µs | 🟢 2.52x smaller | 🟢 7.38x faster   | 🟢 4.22x faster   |
| node:v8 serialize                    | no     | 137 B |   1.07 µs |  1.22 µs | 🟢 2.78x smaller | 🟢 4.37x faster   | 🟢 9.72x faster   |
| bson                                 | no     | 140 B |   0.93 µs |  0.90 µs | 🟢 2.85x smaller | 🟢 3.81x faster   | 🟢 7.19x faster   |
| JSON                                 | no     | 197 B |   1.71 µs |  1.14 µs | 🟢 4.01x smaller | 🟢 6.98x faster   | 🟢 9.07x faster   |

With a state per socket:

| library                     | schema | size |   write |    read | manapack size    | manapack write  | manapack read   |
| --------------------------- | ------ | ---: | ------: | ------: | ---------------- | --------------- | --------------- |
| **manapack (socket state)** | yes    | 30 B | 0.22 µs | 0.10 µs |                  |                 |                 |
| msgpackr (records, float32) | no     | 57 B | 0.43 µs | 0.20 µs | 🟢 1.88x smaller | 🟢 1.98x faster | 🟢 2.02x faster |
| cbor-x (records, float32)   | no     | 61 B | 0.48 µs | 0.23 µs | 🟢 2.03x smaller | 🟢 2.21x faster | 🟢 2.27x faster |

## A client input — Bun (JavaScriptCore)

What a client sends 20 times a second: its pose and the abilities it used.

Without a state:

| library                              | schema |  size |    write |    read | manapack size    | manapack write    | manapack read    |
| ------------------------------------ | ------ | ----: | -------: | ------: | ---------------- | ----------------- | ---------------- |
| **manapack**                         | yes    |  49 B |  0.10 µs | 0.10 µs |                  |                   |                  |
| avsc                                 | yes    |  47 B |  0.12 µs | 0.15 µs | 🔴 1.05x larger  | 🟢 1.21x faster   | 🟢 1.53x faster  |
| @hpx7/delta-pack                     | yes    |  47 B |  0.18 µs | 0.28 µs | ⚪ even          | 🟢 1.74x faster   | 🟢 2.81x faster  |
| kiwi-schema                          | yes    |  47 B |  0.61 µs | 0.45 µs | ⚪ even          | 🟢 6.02x faster   | 🟢 4.48x faster  |
| @bare-ts/lib                         | yes    |  48 B |  0.39 µs | 0.15 µs | ⚪ even          | 🟢 3.89x faster   | 🟢 1.46x faster  |
| packcat                              | yes    |  48 B |  0.28 µs | 0.20 µs | ⚪ even          | 🟢 2.77x faster   | 🟢 2.01x faster  |
| sirdez                               | yes    |  48 B |  0.09 µs | 0.11 µs | ⚪ even          | 🔴 1.07x slower   | 🟢 1.11x faster  |
| tinybuf                              | yes    |  48 B |  0.41 µs | 0.31 µs | ⚪ even          | 🟢 4.05x faster   | 🟢 3.11x faster  |
| schemapack                           | yes    |  49 B |  0.26 µs | 0.11 µs | ⚪ even          | 🟢 2.56x faster   | 🟢 1.10x faster  |
| @timeleap/sia                        | yes    |  50 B |  0.12 µs | 0.15 µs | ⚪ even          | 🟢 1.17x faster   | 🟢 1.44x faster  |
| restructure                          | yes    |  50 B |  1.08 µs | 1.41 µs | ⚪ even          | 🟢 10.73x faster  | 🟢 14.02x faster |
| @apache-fory/core                    | yes    |  52 B |  0.21 µs | 0.18 µs | ⚪ even          | 🟢 2.08x faster   | 🟢 1.80x faster  |
| typed-binary                         | yes    |  53 B |  0.73 µs | 1.28 µs | 🟢 1.08x smaller | 🟢 7.24x faster   | 🟢 12.71x faster |
| @bufbuild/protobuf                   | yes    |  55 B |  0.81 µs | 0.57 µs | 🟢 1.11x smaller | 🟢 8.01x faster   | 🟢 5.65x faster  |
| pbf                                  | yes    |  55 B |  0.22 µs | 0.22 µs | 🟢 1.11x smaller | 🟢 2.14x faster   | 🟢 2.15x faster  |
| protobufjs                           | yes    |  55 B |  0.33 µs | 0.17 µs | 🟢 1.11x smaller | 🟢 3.28x faster   | 🟢 1.73x faster  |
| @javelin/pack                        | yes    |  55 B |  0.72 µs | 0.45 µs | 🟢 1.11x smaller | 🟢 7.14x faster   | 🟢 4.44x faster  |
| superbuffer                          | yes    |  56 B |  1.43 µs | 1.41 µs | 🟢 1.13x smaller | 🟢 14.20x faster  | 🟢 14.02x faster |
| @zorsh/zorsh                         | yes    |  59 B |  1.22 µs | 1.05 µs | 🟢 1.20x smaller | 🟢 12.08x faster  | 🟢 10.39x faster |
| borsh                                | yes    |  59 B |  2.29 µs | 3.02 µs | 🟢 1.20x smaller | 🟢 22.71x faster  | 🟢 29.98x faster |
| @geckos.io/typed-array-buffer-schema | yes    |  61 B |  7.37 µs | 6.53 µs | 🟢 1.24x smaller | 🟢 73.20x faster  | 🟢 64.73x faster |
| bebop                                | yes    |  62 B |  0.13 µs | 0.16 µs | 🟢 1.26x smaller | 🟢 1.27x faster   | 🟢 1.54x faster  |
| seqproto                             | yes    |  65 B |  0.18 µs | 0.24 µs | 🟢 1.32x smaller | 🟢 1.81x faster   | 🟢 2.34x faster  |
| js-binary                            | yes    |  68 B |  0.51 µs | 0.20 µs | 🟢 1.39x smaller | 🟢 5.05x faster   | 🟢 2.03x faster  |
| @msgpack/msgpack                     | no     |  96 B |  0.44 µs | 0.61 µs | 🟢 1.95x smaller | 🟢 4.34x faster   | 🟢 6.01x faster  |
| cbor-x                               | no     |  96 B |  0.40 µs | 0.92 µs | 🟢 1.95x smaller | 🟢 4.01x faster   | 🟢 9.09x faster  |
| cbor2                                | no     |  96 B | 54.62 µs | 5.17 µs | 🟢 1.95x smaller | 🟢 542.30x faster | 🟢 51.33x faster |
| cborg                                | no     |  96 B |  1.57 µs | 1.86 µs | 🟢 1.95x smaller | 🟢 15.59x faster  | 🟢 18.41x faster |
| msgpackr                             | no     |  96 B |  0.51 µs | 0.49 µs | 🟢 1.95x smaller | 🟢 5.01x faster   | 🟢 4.88x faster  |
| @jsonjoy.com/json-pack (CBOR)        | no     |  98 B |  0.34 µs | 0.42 µs | 🟢 2.00x smaller | 🟢 3.41x faster   | 🟢 4.18x faster  |
| lib0                                 | no     | 101 B |  1.10 µs | 1.65 µs | 🟢 2.04x smaller | 🟢 10.91x faster  | 🟢 16.39x faster |
| msgpack-lite                         | no     | 116 B |  0.96 µs | 1.36 µs | 🟢 2.36x smaller | 🟢 9.52x faster   | 🟢 13.49x faster |
| notepack.io                          | no     | 116 B |  0.88 µs | 0.38 µs | 🟢 2.36x smaller | 🟢 8.75x faster   | 🟢 3.81x faster  |
| @jsonjoy.com/json-pack (MessagePack) | no     | 117 B |  0.40 µs | 0.36 µs | 🟢 2.37x smaller | 🟢 3.94x faster   | 🟢 3.60x faster  |
| flatbuffers (object API)             | yes    | 124 B |  0.66 µs | 0.35 µs | 🟢 2.52x smaller | 🟢 6.51x faster   | 🟢 3.52x faster  |
| flatbuffers (read in place)          | yes    | 124 B |  0.66 µs | 0.29 µs | 🟢 2.52x smaller | 🟢 6.50x faster   | 🟢 2.90x faster  |
| bson                                 | no     | 140 B |  0.76 µs | 1.33 µs | 🟢 2.85x smaller | 🟢 7.56x faster   | 🟢 13.22x faster |
| node:v8 serialize                    | no     | 175 B |  1.71 µs | 1.12 µs | 🟢 3.55x smaller | 🟢 16.97x faster  | 🟢 11.15x faster |
| JSON                                 | no     | 197 B |  0.45 µs | 0.36 µs | 🟢 4.01x smaller | 🟢 4.49x faster   | 🟢 3.61x faster  |

With a state per socket:

| library                     | schema | size |   write |    read | manapack size    | manapack write  | manapack read   |
| --------------------------- | ------ | ---: | ------: | ------: | ---------------- | --------------- | --------------- |
| **manapack (socket state)** | yes    | 30 B | 0.09 µs | 0.06 µs |                  |                 |                 |
| msgpackr (records, float32) | no     | 57 B | 0.45 µs | 0.34 µs | 🟢 1.88x smaller | 🟢 4.98x faster | 🟢 5.46x faster |
| cbor-x (records, float32)   | no     | 61 B | 0.32 µs | 0.39 µs | 🟢 2.03x smaller | 🟢 3.59x faster | 🟢 6.30x faster |

## Libraries

| library                                        | version        | how it is used                                                                                                                                                                                                                                                                                                                                            |
| ---------------------------------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| @apache-fory/core                              | 1.7.8          | default config; structs evolving: false (no type meta on the wire); nullable fields; t is varuint64 (BigInt out)                                                                                                                                                                                                                                          |
| @bare-ts/lib                                   | 0.7.0          | BARE, hand-written as bare-ts generates it (safe ints, undefined for none); optional<T> is a bool then T; t is uint                                                                                                                                                                                                                                       |
| @bufbuild/protobuf                             | 2.17.0         | hand-built FileDescriptorProto, no protoc; create() then toBinary; proto3 optional; t is uint64 (BigInt)                                                                                                                                                                                                                                                  |
| @colyseus/schema                               | 5.0.48         | schema() form. snapshot: set 32 entities, encodeAll, read into a fresh state. update: set the changed fields of a map keyed by id, encode, discardChanges: an id travels once and a field set to the value it had is not sent, so the check compares the whole reader state with the messages so far. Enums as uint8, t as uint64, no input (not a state) |
| @geckos.io/typed-array-buffer-schema           | 1.2.1          | Model.toBuffer/fromBuffer; fixed-length strings padded with spaces (id and target 20, name 12, zone and ability 5); no optional fields: a mask and every field; enums as uint8; alive as bool8; t as uint64                                                                                                                                               |
| @hpx7/delta-pack                               | 0.3.1          | interpreter mode: load(schema).encode/decode of whole messages (no SyncSession diffs); optional fields, bools, enums and level are bits; t and the other integers as varints                                                                                                                                                                              |
| @javelin/pack                                  | 1.0.0-alpha.12 | encode/decode on a createModel node; fixed-length string8 padded with zeros (id and target 20, name 12, zone and ability 5); no optional fields: a mask and every field; enums as uint8; t as float64                                                                                                                                                     |
| @jsonjoy.com/json-pack (CBOR)                  | 18.30.0        | reused CborEncoder and CborDecoder; it writes a float as float32 when that loses nothing                                                                                                                                                                                                                                                                  |
| @jsonjoy.com/json-pack (MessagePack)           | 18.30.0        | reused MsgPackEncoderFast and MsgPackDecoderFast; floats are always float64                                                                                                                                                                                                                                                                               |
| @msgpack/msgpack                               | 3.1.3          | reused Encoder and Decoder; forceFloat32 (lossless here: every float is a float32)                                                                                                                                                                                                                                                                        |
| @timeleap/sia                                  | 2.3.0          | hand-written: ids addAscii8, names addUtfz, enums one byte, optional fields behind a mask byte; no float type, so a float32 goes as its bits in addUInt32                                                                                                                                                                                                 |
| @zorsh/zorsh                                   | 0.5.2          | Borsh; b.option needs null for an absent field, so encode fills them in; b.nativeEnum; t is u64 (BigInt)                                                                                                                                                                                                                                                  |
| avsc                                           | 5.7.9          | Avro binary; optional fields are ["null", T] unions; t, ack and seq are long, the other ints are int                                                                                                                                                                                                                                                      |
| bebop                                          | 3.2.3          | code generated by bebopc 3.2.3 from bebop/messages.bop; struct for the dense records, message for the optional fields (a byte per field present); enums from 1, as Bebop asks; t as uint64 (BigInt)                                                                                                                                                       |
| borsh                                          | 2.0.0          | validate: false (the schema is not re-validated on every call); { option }; enums are unit-struct variants; t is u64                                                                                                                                                                                                                                      |
| bson                                           | 7.3.4          | BSON.serialize and BSON.deserialize with default options; floats are float64                                                                                                                                                                                                                                                                              |
| cbor-x                                         | 1.6.9          | plain CBOR maps (useRecords: false), variableMapSize, useFloat32: ALWAYS (lossless here)                                                                                                                                                                                                                                                                  |
| cbor-x (records, float32)                      | 1.6.9          | sequential record structures per socket, read in order; useFloat32: ALWAYS                                                                                                                                                                                                                                                                                |
| cbor2                                          | 2.4.1          | encode and decode with default options: floats in the shortest lossless size                                                                                                                                                                                                                                                                              |
| cborg                                          | 7.0.0          | encode and decode with default options: sorted map keys, floats in the shortest lossless size                                                                                                                                                                                                                                                             |
| flatbuffers (object API)                       | 25.9.23        | written as flatbuffers (read in place); the reader builds objects with unpack(), the object API (--gen-object-api)                                                                                                                                                                                                                                        |
| flatbuffers (read in place)                    | 25.9.23        | code generated by flatc 25.12.19 from flatbuffers/messages.fbs; one Builder, cleared for each message; the reader builds no object: it reads every field through the accessors; optional scalars; t as ulong (BigInt)                                                                                                                                     |
| js-binary                                      | 1.2.0          | Type.encode/decode; 'field?' optionals are a byte per field; floats are 64 bits (no float32); integers and t as uint varints; enums as uint                                                                                                                                                                                                               |
| JSON                                           | built in       | JSON.stringify and TextEncoder                                                                                                                                                                                                                                                                                                                            |
| kiwi-schema                                    | 0.5.0          | compileSchema at run time; structs, and messages (field ids) where a field can be absent; t is uint64 (BigInt)                                                                                                                                                                                                                                            |
| lib0                                           | 0.2.120        | writeAny and readAny; it writes a float as float32 when that loses nothing                                                                                                                                                                                                                                                                                |
| manapack                                       | 0.1.0          | no state: any reader takes any message                                                                                                                                                                                                                                                                                                                    |
| manapack (socket state, fixed-point positions) | 0.1.0          | x and y of an entity to 2 mm (fixed(512)) where the rows above send a float32                                                                                                                                                                                                                                                                             |
| manapack (socket state)                        | 0.1.0          | a state per socket: an id is spelled once, a clock is a step                                                                                                                                                                                                                                                                                              |
| msgpack-lite                                   | 0.2.4          | encode and decode with the default codec; floats are always float64                                                                                                                                                                                                                                                                                       |
| msgpackr                                       | 2.1.4          | plain MessagePack maps (useRecords: false), variableMapSize, useFloat32: ALWAYS (lossless here)                                                                                                                                                                                                                                                           |
| msgpackr (records, float32)                    | 2.1.4          | sequential record structures per socket, read in order; useFloat32: ALWAYS                                                                                                                                                                                                                                                                                |
| node:v8 serialize                              | built in       | structured clone format of the runtime: V8 in Node, JavaScriptCore in Bun                                                                                                                                                                                                                                                                                 |
| notepack.io                                    | 3.0.1          | encode and decode (it has no options); floats are always float64                                                                                                                                                                                                                                                                                          |
| packcat                                        | 0.4.0          | build(schema).pack/unpack; optional() is a byte per field; t as float64 (varuint is 32 bits)                                                                                                                                                                                                                                                              |
| pbf                                            | 5.1.2          | hand-written protobuf readers and writers; a writer over one pre-allocated buffer, copied out; t is a varint                                                                                                                                                                                                                                              |
| protobufjs                                     | 8.8.1          | reflection from a parsed .proto; enum names mapped by hand, not fromObject; proto3 optional; t is uint64 (a Long)                                                                                                                                                                                                                                         |
| restructure                                    | 3.0.2          | r.Optional on a uint8 presence mask that encode computes; no 64-bit int, so t is a double; uint8 string lengths                                                                                                                                                                                                                                           |
| schemapack                                     | 1.4.2          | build(schema, false): validation off; no optional fields: a mask and every field; enums as uint8; t as float64 (varuint is 31 bits)                                                                                                                                                                                                                       |
| seqproto                                       | 0.2.3          | hand-written functions on one reused Ser and Des; every value is a 32-bit word; optional fields: a uint32 mask then the present ones; enums as uint32; t as two uint32                                                                                                                                                                                    |
| sirdez                                         | 0.1.0          | sirdez/eval, use(struct).toBytes/fromBytes; optional() is a byte per field; enums as uint8; t as float64 (usize is 31 bits); usize varints for the other integers                                                                                                                                                                                         |
| superbuffer                                    | 1.1.1          | Model.toBuffer/fromBuffer; no optional fields: a mask and every field; enums as uint8; t as uint64 (read as a BigInt); floats rounded to 7 digits by the library                                                                                                                                                                                          |
| tinybuf                                        | 1.9.2          | headerless formats; encode(data, true) copies out of the shared buffer; encodingBufferMaxSize raised from 1500; optional() is a byte per field; enums as UInt8 through setTransforms; t as UInt (8 bytes)                                                                                                                                                 |
| typed-binary                                   | 4.3.5          | one reused BufferWriter, bytes copied out; optional() is a byte per field; enums as u8; t as f64Array(1), its only 64-bit type                                                                                                                                                                                                                            |

## Left out

- grechabuf: its 64-bit float writes 8 bytes and counts 4, which corrupts the field after it.
- @mysten/bcs: the format has no float type.
- Cap'n Proto, typia and @deepkit/bson: they need a compiler or a build plugin that this benchmark does not run.
