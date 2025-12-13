# SecureBank Bug Fixes

**Candidate:** Nirali Mehta  
**Completed:** 12th December 2025

This repository contains my fixes for 23 bugs in the SecureBank banking application as part of the SDET Technical Interview.

---

## Quick Start

```bash
npm install
npm run dev
# Open http://localhost:3000
```

---

## Bugs Fixed: 23 Total

| Priority | Count |
|----------|-------|
| Critical | 9 |
| High | 7 |
| Medium | 7 |

### Categories

**UI & Validation (11 bugs)**
- Dark mode text visibility
- Email validation (typo detection)
- Age verification (18+ requirement)
- State code dropdown (56 valid codes)
- Phone number validation (area codes + international)
- Card number validation (Luhn algorithm + 4 card types)
- Routing number validation (ABA checksum)
- Password strength requirements
- Zero amount prevention
- Amount input formatting

**Security (4 bugs)** ⚠️
- SSN encryption (AES-256)
- Secure random account numbers (crypto.randomBytes)
- XSS vulnerability fix (removed dangerouslySetInnerHTML)
- Session management (single session per user)

**Logic & Performance (8 bugs)**
- Proper error handling (no fake data)
- Logout session deletion
- Expired session cleanup
- Transaction sorting (newest first)
- Missing transactions fix
- Balance calculation accuracy
- Query optimization (98% faster)
- Resource leak fix (database cleanup)

---

## Documentation

Detailed documentation is in this folder for each section:

1. **[UI & Validation Fixes](./01-UI-AND-VALIDATION-FIXES.md)** - 11 bugs
2. **[Security Fixes](./02-SECURITY-FIXES.md)** - 4 bugs
3. **[Logic & Performance Fixes](./03-LOGIC-AND-PERFORMANCE-FIXES.md)** - 8 bugs

Each document includes:
- What caused the bug
- How I fixed it
- Preventive measures

---

## Approach

### Prioritization

Fixed critical security and data integrity bugs first:
1. SSN encryption (compliance risk)
2. XSS vulnerability (security risk)
3. Age validation (compliance risk)
4. Balance calculation (data integrity)
5. Missing transactions (data integrity)

Then high-priority validation and performance issues, followed by medium-priority UX improvements.

### Testing

Manually tested all fixes:
- Security: Verified SSN encryption, XSS protection, session cleanup
- Validation: Tested all input validation rules with edge cases
- Performance: Confirmed transaction queries optimized (2 queries vs 101)
- Logic: Verified balance calculations, transaction sorting, logout

### Key Technical Decisions

**Validation Strategy**
- Implemented on both frontend (React Hook Form) and backend (Zod)
- Used industry standards: Luhn algorithm for cards, ABA checksum for routing

**Security**
- AES-256-CBC for SSN encryption
- crypto.randomBytes for account numbers
- React's built-in XSS protection (removed manual HTML rendering)

**Performance**
- Eliminated N+1 queries (query once, map in memory)
- Added ORDER BY to all SELECT queries
- Proper resource cleanup (SIGINT/SIGTERM handlers)

---

## Files Modified

**Frontend**
- app/signup/page.tsx
- app/login/page.tsx
- app/dashboard/page.tsx
- components/FundingModal.tsx
- components/AccountCreationModal.tsx
- components/TransactionList.tsx

**Backend**
- server/routers/auth.ts
- server/routers/account.ts
- server/trpc.ts
- lib/db/index.ts

**New Files**
- utils/encryption.ts (SSN encryption)
- utils/constants.ts (US states list)

---

## Deployment Notes

Before deploying to production:

1. **Set environment variables:**
```bash
# Generate 32-char encryption key
openssl rand -hex 32

# Set in environment
ENCRYPTION_KEY=your-generated-key
JWT_SECRET=your-jwt-secret
```

2. **Migrate existing SSNs:**
```typescript
// One-time script to encrypt existing plaintext SSNs
const users = await db.select().from(users);
for (const user of users) {
  if (!user.ssn.includes(':')) {
    await db.update(users)
      .set({ ssn: encryptSSN(user.ssn) })
      .where(eq(users.id, user.id));
  }
}
```

3. **Test all flows:**
- Signup (encryption working)
- Login/logout (sessions managed)
- Account creation
- Funding (validation working)
- Transactions (sorting correct)

---

---

## Testing

Added test cases for critical bugs (extra credit):

```bash
npm install --save-dev jest @jest/globals ts-jest @types/jest
npm test
```

**15 test cases covering:**
- Security: SSN encryption, secure random, XSS prevention
- Validation: Age verification, Luhn algorithm, ABA routing
- Logic: Transaction sorting, balance calculation, query optimization
- Edge cases: Zero amounts, leading zeros, area code validation

See [TESTING.md](../TESTING.md) for setup instructions.

---

## Summary

All 23 bugs have been fixed with proper solutions. The application now has:
- ✅ Encrypted sensitive data
- ✅ Comprehensive input validation
- ✅ XSS protection
- ✅ Optimized database queries
- ✅ Proper error handling
- ✅ Resource cleanup
- ✅ Test coverage for critical fixes

Thanks for reviewing!