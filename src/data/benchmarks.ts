// src/data/benchmarks.ts
// Curated team-size spend bands for AI tool benchmarking
// Used by the benchmark-overspend finding rule

import type { BenchmarkBand } from '../engine/types';

/**
 * Benchmark bands define expected AI tool spend per seat per month
 * by team size. Values represent typical ranges based on public
 * pricing data across popular AI tools.
 *
 * midpointPerSeatMonth is the center of the expected range.
 * The benchmark-overspend rule flags spend >30% above the midpoint.
 */
export const BENCHMARK_BANDS: BenchmarkBand[] = [
  {
    minTeamSize: 1,
    maxTeamSize: 1,
    midpointPerSeatMonth: 100,
    label: 'Solo',
  },
  {
    minTeamSize: 2,
    maxTeamSize: 5,
    midpointPerSeatMonth: 80,
    label: 'Small Team',
  },
  {
    minTeamSize: 6,
    maxTeamSize: 20,
    midpointPerSeatMonth: 60,
    label: 'Mid-size Team',
  },
  {
    minTeamSize: 21,
    maxTeamSize: 100,
    midpointPerSeatMonth: 45,
    label: 'Large Team',
  },
  {
    minTeamSize: 101,
    maxTeamSize: Infinity,
    midpointPerSeatMonth: 35,
    label: 'Enterprise',
  },
];

/**
 * Get the benchmark band for a given team size.
 */
export function getBenchmarkBand(teamSize: number): BenchmarkBand | undefined {
  return BENCHMARK_BANDS.find(
    (band) => teamSize >= band.minTeamSize && teamSize <= band.maxTeamSize
  );
}
