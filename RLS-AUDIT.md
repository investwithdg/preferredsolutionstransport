# 🔒 Row Level Security (RLS) Audit & Policy Recommendations

## 📋 Overview

This document provides a comprehensive audit of the current RLS policies and recommends least-privilege access controls for the Preferred Solutions Transport platform.

## 🎯 Current Security Model

### Roles & Access Levels
1. **Service Role** - Full API access (internal operations)
2. **Authenticated Users** - Customer/Driver access
3. **Anonymous Users** - Public access (quotes, limited reads)

### Data Sensitivity Levels
- **Public**: Quote form submissions
- **Customer Private**: Personal contact info, order details
- **Driver Private**: Driver profiles, assigned orders
- **Internal**: Audit logs, webhook events, system metrics

## 🔍 Current RLS Policy Analysis

### ✅ Strengths
- RLS is enabled on all tables
- Service role has appropriate full access
- Basic separation between anonymous/authenticated access
- Append-only constraints on audit tables

### ⚠️ Security Gaps
- Overly permissive policies for authenticated users
- Anonymous users can insert customer data without validation
- Missing role-based access controls
- No audit logging for policy violations

## 🛡️ Recommended Least-Privilege Policies

### 1. Customers Table
```sql
-- Current: Service role OR owner access
-- Recommended: More restrictive customer access

-- Policy 1: Service role full access (unchanged)
CREATE POLICY "Service role full access to customers"
  ON public.customers FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Policy 2: Customers can only read/update their own record
CREATE POLICY "Customers manage own data"
  ON public.customers FOR ALL
  USING (
    auth.role() = 'authenticated' AND
    auth.uid()::text = id::text
  )
  WITH CHECK (
    auth.role() = 'authenticated' AND
    auth.uid()::text = id::text
  );

-- Policy 3: Anonymous users can only insert (for quote flow)
CREATE POLICY "Anonymous can create customer for quotes"
  ON public.customers FOR INSERT
  WITH CHECK (true);
```

### 2. Quotes Table
```sql
-- Current: Service role OR customer access (too broad)
-- Recommended: Restrict to quote owners and service role

CREATE POLICY "Service role full access to quotes"
  ON public.quotes FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Customers access their own quotes"
  ON public.quotes FOR ALL
  USING (
    auth.role() = 'authenticated' AND
    auth.uid()::text = customer_id::text
  )
  WITH CHECK (
    auth.role() = 'authenticated' AND
    auth.uid()::text = customer_id::text
  );

-- Remove anonymous insert policy (handled by service role)
```

### 3. Orders Table
```sql
-- Current: Multiple permissive policies
-- Recommended: Role-based access with strict controls

CREATE POLICY "Service role full access to orders"
  ON public.orders FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Customers view their own orders"
  ON public.orders FOR SELECT
  USING (
    auth.role() = 'authenticated' AND
    auth.uid()::text = customer_id::text
  );

CREATE POLICY "Drivers manage assigned orders"
  ON public.orders FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.drivers
      WHERE drivers.user_id = auth.uid()
        AND drivers.id = orders.driver_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.drivers
      WHERE drivers.user_id = auth.uid()
        AND drivers.id = orders.driver_id
    )
  );
```

### 4. Drivers Table
```sql
-- Current: Authenticated users can view all drivers (too permissive)
-- Recommended: Restrict to own record and service role

CREATE POLICY "Service role full access to drivers"
  ON public.drivers FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Drivers manage own profile"
  ON public.drivers FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users view driver list"
  ON public.drivers FOR SELECT
  USING (auth.role() = 'authenticated');
```

### 5. Audit Tables (dispatch_events, webhook_events)
```sql
-- Current: Read access for authenticated users
-- Recommended: More restrictive audit access

CREATE POLICY "Service role full access to dispatch_events"
  ON public.dispatch_events FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Read-only access to own events"
  ON public.dispatch_events FOR SELECT
  USING (
    auth.role() = 'authenticated' AND
    (
      -- Customers see events for their orders
      EXISTS (
        SELECT 1 FROM public.orders
        WHERE orders.id = dispatch_events.order_id
          AND orders.customer_id::text = auth.uid()::text
      ) OR
      -- Drivers see events for their orders
      EXISTS (
        SELECT 1 FROM public.orders o
        JOIN public.drivers d ON d.id = o.driver_id
        WHERE o.id = dispatch_events.order_id
          AND d.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Service role full access to webhook_events"
  ON public.webhook_events FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');
```

## 🚨 Implementation Plan

### Phase 1: Policy Updates (Immediate)
1. Update consolidated schema with new policies
2. Test policies in development environment
3. Deploy to staging for validation

### Phase 2: Enhanced Security (Week 2)
1. Add audit triggers for policy violations
2. Implement session management checks
3. Add IP-based access controls where appropriate

### Phase 3: Monitoring & Alerts (Week 3)
1. Set up monitoring for policy violations
2. Create alerts for suspicious access patterns
3. Regular security reviews

## 🧪 Testing Strategy

### Unit Tests
```sql
-- Test customer access
SELECT * FROM customers WHERE id = 'test-customer-id';

-- Test quote access
SELECT * FROM quotes WHERE customer_id = 'test-customer-id';

-- Test order access
SELECT * FROM orders WHERE customer_id = 'test-customer-id';
```

### Integration Tests
- Create test user accounts for each role
- Verify access controls work correctly
- Test edge cases (deleted users, invalid sessions)

### Security Tests
- Attempt SQL injection through quote form
- Test unauthorized data access
- Verify rate limiting prevents brute force

## 📊 Monitoring & Alerting

### Key Metrics to Monitor
- Policy violation attempts
- Failed authentication attempts
- Unusual access patterns
- Rate limit violations

### Alert Thresholds
- >10 policy violations per hour → Investigate
- >5 failed auth attempts per minute → Block IP
- Unusual access patterns → Manual review

## 🔐 Additional Security Recommendations

### 1. Session Management
```sql
-- Add session validation to policies
auth.jwt() ->> 'exp' > extract(epoch from now())::text
```

### 2. Rate Limiting at Database Level
```sql
-- Use the rate limiting functions already implemented
SELECT check_rate_limit('user-id', 'table-access', 100, 60);
```

### 3. Audit Logging
```sql
-- Trigger to log all access attempts
CREATE OR REPLACE FUNCTION audit_access()
RETURNS trigger AS $$
BEGIN
  INSERT INTO access_audit_log (table_name, operation, user_id, timestamp)
  VALUES (TG_TABLE_NAME, TG_OP, auth.uid(), now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

## 📋 Migration Checklist

- [ ] Review current policies with stakeholders
- [ ] Create backup of current RLS configuration
- [ ] Test new policies in development environment
- [ ] Update consolidated schema with new policies
- [ ] Deploy to staging for user acceptance testing
- [ ] Monitor for issues during initial rollout
- [ ] Update documentation with new security model
- [ ] Train team on new access controls

## 🔗 References

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Security Best Practices](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [OWASP Access Control Guidelines](https://owasp.org/www-project-top-ten/2017/A5_2017-Broken_Access_Control)