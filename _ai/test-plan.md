# Test Plan - StashTracker

## 1. Introduction and Testing Objectives

### 1.1 Document Purpose
This document defines a comprehensive testing strategy for StashTracker - a web application for tracking expenses and savings in PLN currency.

### 1.2 Testing Objectives
- **Quality Assurance**: Verify correct functionality of all application features
- **Security**: Confirm effectiveness of authentication and authorization mechanisms (RLS)
- **Data Integrity**: Validate correctness of database operations, triggers, and soft-delete
- **Performance**: Check application responsiveness and query optimization
- **Compatibility**: Verify functionality across different browsers and devices
- **Accessibility**: Ensure WCAG compliance for users with disabilities

### 1.3 Project Scope
StashTracker is a personal finance management application that enables:
- Expense tracking with categories and monthly budgets
- Managing "stashes" (savings accounts, brokerage accounts, crypto wallets)
- Recording deposit and withdrawal transactions
- Viewing transaction and expense history
- User account management (registration, login, password reset, account deletion)

---

## 2. Test Scope

### 2.1 Features In Scope

#### Authentication Module
- User registration, login, logout
- Password reset and update
- Session verification
- Middleware authorization

#### Stashes Module
- CRUD operations for stashes
- Pagination and sorting
- Soft-delete functionality
- Name uniqueness validation

#### Stash Transactions Module
- Deposit and withdrawal transactions
- Automatic balance updates via triggers
- Overdraft prevention
- Cascading soft-delete

#### Monthly Budgets Module
- Budget upsert operations
- Automatic balance calculation
- Year filtering
- Uniqueness per user per month

#### Expenses Module
- CRUD operations for expenses
- Automatic year_month generation
- Category-based filtering
- Budget impact calculation

#### Dashboard Module
- Stashes summary (count, total balance)
- Current month budget summary
- Handling missing budgets

### 2.2 Features Out of Scope
- External API integrations
- AI features
- Automatic bank transaction import
- Multi-currency support
- Native mobile applications

---

## 3. Types of Tests

### 3.1 Unit Tests
**Tools**: Vitest, React Testing Library  
**Scope**: Zod schemas, services, hooks, UI components  
**Target Coverage**: 80%+

### 3.2 Integration Tests
**Tools**: Vitest, Supertest, Supabase Test Helpers  
**Scope**: API endpoints, database triggers, RLS policies, middleware

### 3.3 End-to-End Tests
**Tools**: Playwright  
**Scope**: Complete user flows, UI interactions, responsiveness

### 3.4 Performance Tests
**Tools**: Lighthouse, k6, Chrome DevTools  
**Metrics**: FCP < 1.5s, LCP < 2.5s, TTI < 3.5s, API p95 < 1s

### 3.5 Security Tests
**Tools**: Manual testing, OWASP ZAP  
**Scope**: RLS policies, input validation, session security, HTTPS

### 3.6 Accessibility Tests
**Tools**: axe DevTools, Lighthouse, NVDA/JAWS  
**Standard**: WCAG 2.1 Level AA

### 3.7 Compatibility Tests
**Scope**: Chrome, Firefox, Safari, Edge on Desktop/Tablet/Mobile

---

## 4. Key Test Scenarios

### 4.1 Authentication

**TC-AUTH-001: User Registration**
- Navigate to /register → Fill form → Submit
- Expected: Account created, redirect to /login
- Edge cases: Duplicate email, weak password, invalid format

**TC-AUTH-002: User Login**
- Navigate to /login → Enter credentials → Submit
- Expected: Session created, redirect to /app/dashboard
- Edge cases: Invalid credentials, already logged in

**TC-AUTH-003: Password Reset**
- Request reset → Receive email → Set new password
- Expected: Password updated, redirect to /login

### 4.2 Stashes

**TC-STASH-001: Create Stash**
- Click "Add stash" → Enter name → Submit
- Expected: Stash created with balance 0.00
- Edge cases: Duplicate name, empty name, name too long

**TC-STASH-002: Add Deposit**
- Select stash → Add deposit 1000 PLN
- Expected: Balance increases by 1000, transaction recorded
- Edge cases: Negative amount, invalid format

**TC-STASH-003: Add Withdrawal**
- Select stash → Add withdrawal 500 PLN
- Expected: Balance decreases by 500
- Edge cases: Withdrawal > balance (should fail)

**TC-STASH-004: Delete Stash**
- Click delete → Confirm
- Expected: Soft-delete stash and all transactions
- Verify: deleted_at set, stash hidden from list

### 4.3 Expenses

**TC-EXPENSE-001: Create Expense**
- Click "Add expense" → Fill form → Submit
- Expected: Expense created, year_month auto-generated, budget updated
- Edge cases: Invalid amount, missing description

**TC-EXPENSE-002: Edit Expense (Month Change)**
- Edit expense → Change date to different month → Save
- Expected: year_month updated, both budgets recalculated

**TC-EXPENSE-003: Filter Expenses**
- Apply yearMonth filter → View results
- Expected: Only expenses from selected month shown
- Edge cases: yearMonth + from/to simultaneously (should fail)

### 4.4 Budgets

**TC-BUDGET-001: Set Monthly Budget**
- Select month → Enter amount → Save
- Expected: Budget created/updated, current_balance calculated
- Edge cases: Negative amount, zero amount

**TC-BUDGET-002: Dashboard Without Budget**
- View dashboard with no budget set
- Expected: hasNoBudget = true, expenses still shown

### 4.5 Dashboard

**TC-DASH-001: View Dashboard Summary**
- Login → Navigate to dashboard
- Expected: Stashes summary and budget summary displayed correctly

---

## 5. Test Environment

### 5.1 Environments

**Development**
- URL: http://localhost:3000
- Database: Supabase Local/Cloud (dev)
- Purpose: Manual testing during development

**Staging**
- URL: https://staging.stashtracker.app
- Database: Supabase Cloud (staging)
- Purpose: Automated testing, acceptance testing

**Production**
- URL: https://stashtracker.app
- Database: Supabase Cloud (production)
- Purpose: Smoke tests post-deployment

### 5.2 Configuration

**Hardware**: 2 vCPU, 4 GB RAM, 20 GB SSD  
**Software**: Node.js v22.14.0, PostgreSQL 15+, npm  
**Test Data**: Test users, sample stashes, expenses, categories from seed data

### 5.3 Environment Reset
```bash
supabase db reset  # Resets database and runs migrations
npm run dev        # Restart Astro server
```

---

## 6. Testing Tools

### 6.1 Automated Testing
- **Vitest**: Unit and integration tests
- **Playwright**: E2E tests
- **React Testing Library**: Component testing

### 6.2 Performance
- **Lighthouse**: Performance audits
- **k6**: Load testing

### 6.3 Security
- **OWASP ZAP**: Vulnerability scanning
- **Manual testing**: RLS policy verification

### 6.4 Accessibility
- **axe DevTools**: Automated accessibility checks
- **NVDA/JAWS**: Screen reader testing

### 6.5 CI/CD
- **GitHub Actions**: Automated test execution

---

## 7. Test Schedule

| Phase | Duration | Focus | Deliverable |
|-------|----------|-------|-------------|
| Unit Testing | Week 1-2 | Functions, components | 80%+ coverage |
| Integration Testing | Week 3-4 | APIs, database | All endpoints tested |
| E2E Testing | Week 5-6 | User flows | Critical paths automated |
| Performance Testing | Week 7 | Load, optimization | Performance report |
| Security Testing | Week 8 | RLS, validation | Security audit |
| Accessibility Testing | Week 9 | WCAG compliance | Compliance report |
| Regression Testing | Ongoing | Continuous | Test reports per PR |

---

## 8. Test Acceptance Criteria

### Functional
- ✅ All critical test cases pass (100%)
- ✅ All high-priority test cases pass (100%)
- ✅ Medium-priority test cases pass (95%+)
- ✅ No critical/high-severity bugs open

### Performance
- ✅ Page load < 2s (95th percentile)
- ✅ API response < 500ms (95th percentile)
- ✅ Lighthouse Performance score > 90

### Security
- ✅ All RLS policies enforced
- ✅ No SQL injection/XSS vulnerabilities
- ✅ Secure session cookies

### Accessibility
- ✅ WCAG 2.1 Level AA compliance
- ✅ Lighthouse Accessibility score > 90
- ✅ Keyboard navigation functional

### Code Quality
- ✅ Unit test coverage > 80%
- ✅ No ESLint/TypeScript errors
- ✅ Code formatted with Prettier

---

## 9. Roles and Responsibilities

| Role | Responsibilities |
|------|------------------|
| **QA Lead** | Test plan, strategy, coordination, reporting |
| **QA Engineers** | Test case creation, execution, automation, bug reporting |
| **Developers** | Unit/integration tests, bug fixing, code review |
| **DevOps** | CI/CD setup, environment provisioning, monitoring |

---

## 10. Bug Reporting

### Severity Levels

**Critical (P0)**: App crash, data loss, security vulnerability → Response < 2 hours  
**High (P1)**: Major feature broken → Response < 8 hours  
**Medium (P2)**: Feature partially working → Response < 1 week  
**Low (P3)**: Cosmetic issues → Backlog

### Bug Report Template
```markdown
**Title**: [Brief description]
**Severity**: [Critical/High/Medium/Low]
**Environment**: [Dev/Staging/Prod]
**Browser**: [Chrome 120, etc.]

**Steps to Reproduce**:
1. [Step 1]
2. [Step 2]

**Expected**: [What should happen]
**Actual**: [What happens]
**Screenshots**: [If applicable]
**Console Errors**: [Paste errors]
```

### Workflow
New → Triaged → Assigned → In Progress → Fixed → Verified → Closed

---

## 11. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Insufficient test coverage | Medium | High | Enforce 80%+ coverage |
| Database trigger failures | Low | Critical | Comprehensive integration tests |
| RLS policy bypass | Low | Critical | Dedicated security testing |
| Performance degradation | Medium | High | Regular benchmarking |
| Browser compatibility | Medium | Medium | Cross-browser CI/CD testing |
| Test environment instability | High | Medium | Automated provisioning |

---

## 12. Test Metrics

### Coverage Metrics
- Unit test coverage > 80%
- Integration test coverage: All API endpoints
- E2E test coverage: All critical paths

### Execution Metrics
- Test pass rate > 95%
- Flaky test rate < 5%
- Test automation rate > 80%

### Defect Metrics
- Defect density (bugs per 1000 LOC)
- Defect detection rate (testing vs production)
- Average resolution time by severity

### Reporting
- Daily: Test execution results
- Weekly: Coverage and defect metrics
- Sprint end: Comprehensive test report
- Release: Quality gate assessment

---

## 13. Appendix

### A. Test Data Examples

**Test Users**:
- test-user-1@example.com / SecurePass123!
- test-user-2@example.com / SecurePass123!

**Test Stashes**:
- "Test Savings" (balance: 5000 PLN)
- "Test Broker" (balance: 10000 PLN)

**Expense Categories**: From seed migration (Food, Transport, Entertainment, etc.)

### B. Useful Commands

```bash
# Run unit tests
npm run test:unit

# Run E2E tests
npm run test:e2e

# Generate coverage report
npm run test:coverage

# Run linter
npm run lint

# Format code
npm run format

# Reset database
supabase db reset

# Start dev server
npm run dev
```

### C. References

- [Astro Documentation](https://docs.astro.build)
- [Supabase Documentation](https://supabase.com/docs)
- [Playwright Documentation](https://playwright.dev)
- [Vitest Documentation](https://vitest.dev)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)

---

**Document Version**: 1.0  
**Last Updated**: 2025-10-27  
**Prepared By**: QA Team  
**Approved By**: Project Manager
