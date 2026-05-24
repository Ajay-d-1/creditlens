# Tests

## Running Tests
```bash
npm test
```

## Test Coverage

| Test | File | What It Covers |
|------|------|----------------|
| Cursor Business minimum seat waste | audit-engine.test.ts | Catches users paying for unused minimum seats |
| Cursor Pro optimal (no savings) | audit-engine.test.ts | Verifies no false positives for correct plans |
| Duplicate coding assistants | audit-engine.test.ts | Flags when user pays for multiple similar tools |
| Savings never exceed spend | audit-engine.test.ts | Sanity check on math |
| Copilot Business → Individual | audit-engine.test.ts | Downgrade recommendation for small teams |
| Claude Team → Pro | audit-engine.test.ts | Minimum seat waste for Claude |

All 6 tests pass. Run `npm test` to verify.
