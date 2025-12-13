# Test Setup Guide

## Quick Setup

### 1. Install Jest

```bash
npm install --save-dev jest @jest/globals ts-jest @types/jest
```

### 2. Create Jest Config

Create `jest.config.js`:

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1'
  }
};
```

### 3. Add Test Script

In `package.json`, add:

```json
{
  "scripts": {
    "test:run": "jest",
    "test:watch": "jest --watch"
  }
}
```

### 4. Run Tests

```bash
npm test:run
```

---

## Test Coverage

The test file covers:

**Security (3 tests)**
- SEC-301: SSN encryption/decryption
- SEC-302: Unique account number generation  
- SEC-303: XSS prevention

**Validation (5 tests)**
- VAL-202: Age validation (under 18, exactly 18, future dates)
- VAL-206: Luhn algorithm for card validation
- VAL-207: ABA routing number checksum

**Logic & Performance (3 tests)**
- PERF-404: Transaction sorting
- PERF-406: Balance calculation accuracy
- PERF-407: Query optimization (no N+1)

**Edge Cases (4 tests)**
- Zero amounts
- Leading zeros
- Area code validation
- Minimum valid amounts

**Total: 15 test cases covering critical bugs**

---

## Expected Output

When you run `npm test`, you should see:

```
PASS  tests/bug-fixes.test.ts
  SEC-301: SSN Encryption
    ✓ encrypts SSN before storage
    ✓ decrypts SSN correctly
    ✓ each encryption produces different ciphertext
  VAL-202: Age Validation
    ✓ rejects users under 18
    ✓ accepts users exactly 18 years old
    ✓ rejects future dates
  VAL-206: Luhn Algorithm
    ✓ validates correct card numbers
    ✓ rejects invalid card numbers
  VAL-207: ABA Routing Number
    ✓ validates correct routing numbers
    ✓ rejects invalid routing numbers
  PERF-404: Transaction Sorting
    ✓ transactions are sorted newest first
  PERF-406: Balance Calculation
    ✓ calculates exact balance
    ✓ maintains precision with multiple transactions
  Edge Cases
    ✓ rejects zero amount
    ✓ accepts minimum valid amount
    ✓ rejects leading zeros

Test Suites: 1 passed, 1 total
Tests:       15 passed, 15 total
```

---

## Notes

- Tests are standalone and don't require database
- They test the core logic/algorithms
- Easy to run and understand
- Cover the most critical bugs