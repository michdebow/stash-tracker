# Create Transaction Endpoint - Testing Guide

## Endpoint
`POST /api/stashes/{stashId}/transactions`

## Prerequisites
- User must be authenticated (valid session)
- Stash with `{stashId}` must exist and belong to the authenticated user

## Test Cases

### 1. Success Cases

#### 1.1 Create Deposit Transaction
**Request:**
```bash
curl -X POST http://localhost:4321/api/stashes/{stashId}/transactions \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-access-token=YOUR_TOKEN" \
  -d '{
    "transaction_type": "deposit",
    "amount": 150.75,
    "description": "Monthly savings contribution"
  }'
```

**Expected Response:** `201 Created`
```json
{
  "id": "uuid",
  "stash_id": "uuid",
  "transaction_type": "deposit",
  "amount": 150.75,
  "description": "Monthly savings contribution",
  "created_at": "2025-10-22T21:46:00.000Z"
}
```

**Verification:**
- Transaction is created in database
- Stash `current_balance` increased by 150.75
- Stash `updated_at` timestamp updated

#### 1.2 Create Withdrawal Transaction
**Request:**
```bash
curl -X POST http://localhost:4321/api/stashes/{stashId}/transactions \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-access-token=YOUR_TOKEN" \
  -d '{
    "transaction_type": "withdrawal",
    "amount": 50.00,
    "description": "Emergency expense"
  }'
```

**Expected Response:** `201 Created`
```json
{
  "id": "uuid",
  "stash_id": "uuid",
  "transaction_type": "withdrawal",
  "amount": 50.00,
  "description": "Emergency expense",
  "created_at": "2025-10-22T21:46:00.000Z"
}
```

**Verification:**
- Transaction is created in database
- Stash `current_balance` decreased by 50.00
- Stash `updated_at` timestamp updated

#### 1.3 Create Transaction Without Description
**Request:**
```bash
curl -X POST http://localhost:4321/api/stashes/{stashId}/transactions \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-access-token=YOUR_TOKEN" \
  -d '{
    "transaction_type": "deposit",
    "amount": 100.00
  }'
```

**Expected Response:** `201 Created`
```json
{
  "id": "uuid",
  "stash_id": "uuid",
  "transaction_type": "deposit",
  "amount": 100.00,
  "description": null,
  "created_at": "2025-10-22T21:46:00.000Z"
}
```

### 2. Validation Error Cases (400 Bad Request)

#### 2.1 Invalid Stash ID Format
**Request:**
```bash
curl -X POST http://localhost:4321/api/stashes/invalid-uuid/transactions \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-access-token=YOUR_TOKEN" \
  -d '{
    "transaction_type": "deposit",
    "amount": 100.00
  }'
```

**Expected Response:** `400 Bad Request`
```json
{
  "error": "Validation failed",
  "message": "Invalid stash ID",
  "errors": {
    "stashId": ["Invalid stash ID format"]
  }
}
```

#### 2.2 Missing Required Field (transaction_type)
**Request:**
```bash
curl -X POST http://localhost:4321/api/stashes/{stashId}/transactions \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-access-token=YOUR_TOKEN" \
  -d '{
    "amount": 100.00
  }'
```

**Expected Response:** `400 Bad Request`
```json
{
  "error": "Validation failed",
  "message": "Invalid request body",
  "errors": {
    "transaction_type": ["Transaction type must be either 'deposit' or 'withdrawal'"]
  }
}
```

#### 2.3 Invalid Transaction Type
**Request:**
```bash
curl -X POST http://localhost:4321/api/stashes/{stashId}/transactions \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-access-token=YOUR_TOKEN" \
  -d '{
    "transaction_type": "transfer",
    "amount": 100.00
  }'
```

**Expected Response:** `400 Bad Request`
```json
{
  "error": "Validation failed",
  "message": "Invalid request body",
  "errors": {
    "transaction_type": ["Transaction type must be either 'deposit' or 'withdrawal'"]
  }
}
```

#### 2.4 Missing Required Field (amount)
**Request:**
```bash
curl -X POST http://localhost:4321/api/stashes/{stashId}/transactions \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-access-token=YOUR_TOKEN" \
  -d '{
    "transaction_type": "deposit"
  }'
```

**Expected Response:** `400 Bad Request`
```json
{
  "error": "Validation failed",
  "message": "Invalid request body",
  "errors": {
    "amount": ["Amount is required"]
  }
}
```

#### 2.5 Invalid Amount (Zero)
**Request:**
```bash
curl -X POST http://localhost:4321/api/stashes/{stashId}/transactions \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-access-token=YOUR_TOKEN" \
  -d '{
    "transaction_type": "deposit",
    "amount": 0
  }'
```

**Expected Response:** `400 Bad Request`
```json
{
  "error": "Validation failed",
  "message": "Invalid request body",
  "errors": {
    "amount": ["Amount must be greater than zero"]
  }
}
```

#### 2.6 Invalid Amount (Negative)
**Request:**
```bash
curl -X POST http://localhost:4321/api/stashes/{stashId}/transactions \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-access-token=YOUR_TOKEN" \
  -d '{
    "transaction_type": "deposit",
    "amount": -50.00
  }'
```

**Expected Response:** `400 Bad Request`
```json
{
  "error": "Validation failed",
  "message": "Invalid request body",
  "errors": {
    "amount": ["Amount must be greater than zero"]
  }
}
```

#### 2.7 Invalid Amount Type (String)
**Request:**
```bash
curl -X POST http://localhost:4321/api/stashes/{stashId}/transactions \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-access-token=YOUR_TOKEN" \
  -d '{
    "transaction_type": "deposit",
    "amount": "one hundred"
  }'
```

**Expected Response:** `400 Bad Request`
```json
{
  "error": "Validation failed",
  "message": "Invalid request body",
  "errors": {
    "amount": ["Amount must be a number"]
  }
}
```

#### 2.8 Description Too Long
**Request:**
```bash
curl -X POST http://localhost:4321/api/stashes/{stashId}/transactions \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-access-token=YOUR_TOKEN" \
  -d '{
    "transaction_type": "deposit",
    "amount": 100.00,
    "description": "A very long description that exceeds 1000 characters..."
  }'
```

**Expected Response:** `400 Bad Request`
```json
{
  "error": "Validation failed",
  "message": "Invalid request body",
  "errors": {
    "description": ["Description cannot exceed 1000 characters"]
  }
}
```

#### 2.9 Invalid JSON
**Request:**
```bash
curl -X POST http://localhost:4321/api/stashes/{stashId}/transactions \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-access-token=YOUR_TOKEN" \
  -d 'invalid json'
```

**Expected Response:** `400 Bad Request`
```json
{
  "error": "Bad Request",
  "message": "Invalid JSON in request body"
}
```

### 3. Authentication Error (401 Unauthorized)

#### 3.1 No Authentication Token
**Request:**
```bash
curl -X POST http://localhost:4321/api/stashes/{stashId}/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "transaction_type": "deposit",
    "amount": 100.00
  }'
```

**Expected Response:** `401 Unauthorized`
```json
{
  "error": "Unauthorized",
  "message": "You must be logged in to access this resource."
}
```

### 4. Insufficient Balance Error (403 Forbidden)

#### 4.1 Withdrawal Exceeds Balance
**Setup:** Stash has current_balance of 50.00

**Request:**
```bash
curl -X POST http://localhost:4321/api/stashes/{stashId}/transactions \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-access-token=YOUR_TOKEN" \
  -d '{
    "transaction_type": "withdrawal",
    "amount": 100.00
  }'
```

**Expected Response:** `403 Forbidden`
```json
{
  "error": "Forbidden",
  "message": "Insufficient balance for withdrawal"
}
```

**Verification:**
- Transaction is NOT created
- Stash balance remains unchanged

### 5. Not Found Error (404 Not Found)

#### 5.1 Stash Does Not Exist
**Request:**
```bash
curl -X POST http://localhost:4321/api/stashes/00000000-0000-0000-0000-000000000000/transactions \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-access-token=YOUR_TOKEN" \
  -d '{
    "transaction_type": "deposit",
    "amount": 100.00
  }'
```

**Expected Response:** `404 Not Found`
```json
{
  "error": "Not Found",
  "message": "Stash not found"
}
```

#### 5.2 Stash Belongs to Another User
**Request:**
```bash
curl -X POST http://localhost:4321/api/stashes/{another-users-stash-id}/transactions \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-access-token=YOUR_TOKEN" \
  -d '{
    "transaction_type": "deposit",
    "amount": 100.00
  }'
```

**Expected Response:** `404 Not Found`
```json
{
  "error": "Not Found",
  "message": "Stash not found"
}
```

**Security Note:** Returns 404 instead of 403 to prevent information disclosure about other users' stashes.

## Database Verification Queries

### Check Transaction Was Created
```sql
SELECT * FROM stash_transactions 
WHERE stash_id = '{stashId}' 
AND deleted_at IS NULL
ORDER BY created_at DESC;
```

### Check Stash Balance Updated
```sql
SELECT id, name, current_balance, updated_at 
FROM stashes 
WHERE id = '{stashId}';
```

### Verify Transaction Count
```sql
SELECT 
  stash_id,
  transaction_type,
  COUNT(*) as count,
  SUM(amount) as total
FROM stash_transactions
WHERE stash_id = '{stashId}' AND deleted_at IS NULL
GROUP BY stash_id, transaction_type;
```

## Performance Testing

### Test Concurrent Transactions
Create multiple transactions simultaneously to verify:
- Database triggers handle concurrency correctly
- Balance calculations remain accurate
- No race conditions occur

### Test Large Amounts
Test with various amount values:
- Very small: 0.01
- Large: 999999999.99
- Many decimal places: 123.456789 (should round to 123.46)

## Security Testing

### Test RLS Policies
1. Create transaction for own stash → Should succeed
2. Create transaction for another user's stash → Should fail (404)
3. Create transaction without authentication → Should fail (401)

### Test SQL Injection
Try malicious inputs in description field:
```json
{
  "transaction_type": "deposit",
  "amount": 100.00,
  "description": "'; DROP TABLE stash_transactions; --"
}
```
Should be safely escaped and stored as plain text.

## Notes

- All monetary amounts are stored as `numeric(12,2)` in the database
- Timestamps are in ISO 8601 format (UTC)
- The `deleted_at` field is used for soft deletes (not exposed in API responses)
- Database triggers automatically update stash balance and prevent negative balances
- RLS policies ensure users can only access their own data
