# Benchmark results

Node 22.23.4 and Bun 1.4.4, Intel(R) Xeon(R) Processor @ 2.10GHz, 4 cores, linux x64, 2026-11-14. Run it with `bun run bench` from the root of the repository.

## A state update: what changed in one tick, 14 entities on average

| Library | Schema | Size | Node write | Node read | Bun write | Bun read |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| **manapack (socket state)** | yes | 305 B | 1.92 µs | 0.51 µs | 0.83 µs | 0.44 µs |
| **manapack** | yes | 607 B | 2.09 µs | 1.35 µs | 1.36 µs | 1.08 µs |
| msgpackr (records, float32) | no | 650 B | 5.47 µs | 1.96 µs | 4.70 µs | 3.90 µs |
| JSON | no | 1,971 B | 14.3 µs | 10.9 µs | 5.04 µs | 3.69 µs |

## A snapshot: everything about 32 entities

| Library | Schema | Size | Node write | Node read | Bun write | Bun read |
| --- | --- | ---: | ---: | ---: | ---: | ---: |

## A client input

| Library | Schema | Size | Node write | Node read | Bun write | Bun read |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| **manapack (socket state)** | yes | 30 B | 0.23 µs | 0.10 µs | 0.09 µs | 0.06 µs |
| **manapack** | yes | 49 B | 0.25 µs | 0.12 µs | 0.10 µs | 0.10 µs |
| msgpackr (records, float32) | no | 57 B | 0.43 µs | 0.20 µs | 0.45 µs | 0.33 µs |
| JSON | no | 197 B | 1.70 µs | 1.14 µs | 0.46 µs | 0.37 µs |

## Libraries

| Library | Version | How it is used |
| --- | --- | --- |
| JSON | built in | JSON.stringify and TextEncoder |
| manapack | 0.1.0 | no state: any reader takes any message |
| manapack (socket state) | 0.1.0 | a state per socket: an id is spelled once, a clock is a step |
| msgpackr (records, float32) | 2.1.4 | sequential record structures per socket, read in order; useFloat32: ALWAYS |
