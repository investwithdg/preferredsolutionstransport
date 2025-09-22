# 🏥 Weekly Health Checks

This document outlines the weekly maintenance checklist for the Preferred Solutions Transport platform to ensure production health and reliability.

## 📅 Schedule

- **Frequency**: Weekly (every Monday morning)
- **Responsible**: Development team
- **Estimated Time**: 30-45 minutes

## 🔧 Environment Setup

### Prerequisites
- [ ] All environment variables are properly configured
- [ ] Database is accessible and up-to-date
- [ ] Development server can start without errors
- [ ] Stripe webhook endpoint is configured and tested

## 🏃‍♂️ Automated Checks

### 1. Smoke Tests
```bash
# Run comprehensive smoke tests
./scripts/smoke.sh

# Expected results:
# ✅ Health check passed
# ✅ Quote creation successful
# ✅ Checkout session creation successful
# ✅ Rate limiting working
# ✅ Input validation working
```

### 2. Health Check API
```bash
# Test health endpoint directly
curl http://localhost:3000/api/health | jq '.'

# Expected results:
# - status: "ok" or "degraded"
# - checks.database: true
# - checks.environment: true
# - responseTime: < 1000ms
```

### 3. Production Build Test
```bash
# Test production build
npm run build

# Expected results:
# ✅ No TypeScript errors
# ✅ No build warnings
# ✅ All API routes compile successfully
```

## 🔍 Manual Verification

### 4. Database Health
- [ ] Check Supabase dashboard for any issues
- [ ] Verify recent migrations are applied
- [ ] Check database performance metrics
- [ ] Verify RLS policies are active

### 5. API Endpoint Testing
- [ ] `/api/quote` - Create test quote
- [ ] `/api/checkout` - Generate checkout session
- [ ] `/api/health` - System health check
- [ ] `/api/stripe/webhook` - Webhook processing (if accessible)

### 6. Error Monitoring
- [ ] Check Sentry dashboard for new errors (if configured)
- [ ] Review server logs for warnings/errors
- [ ] Verify error rates are within acceptable thresholds

### 7. Security Check
- [ ] Environment variables are not exposed
- [ ] Rate limiting is functioning
- [ ] Input validation is working
- [ ] RLS policies are restrictive

## 📊 Performance Monitoring

### 8. Response Times
- [ ] Health check: < 500ms
- [ ] Quote creation: < 2s
- [ ] Checkout session: < 3s
- [ ] Database queries: < 100ms average

### 9. Resource Usage
- [ ] Server memory usage < 80%
- [ ] Database CPU usage < 70%
- [ ] No memory leaks detected
- [ ] Storage usage within limits

## 🔄 Data Integrity

### 10. Database Consistency
- [ ] No orphaned records in orders/quotes
- [ ] All orders have valid customer references
- [ ] Quote expiry is working correctly
- [ ] Webhook events are being processed

### 11. Business Logic
- [ ] Pricing calculations are accurate
- [ ] Order status transitions work correctly
- [ ] Customer deduplication is working
- [ ] Email uniqueness is enforced

## 🚨 Alert Thresholds

### Critical Issues (Immediate Action Required)
- [ ] Health check fails
- [ ] Database connectivity lost
- [ ] >5% error rate in API endpoints
- [ ] Webhook processing failures
- [ ] Security vulnerabilities detected

### Warning Issues (Monitor & Plan)
- [ ] Response times > 2s
- [ ] Memory usage > 70%
- [ ] Rate limiting frequently triggered
- [ ] Database performance degradation

## 📋 Weekly Report Template

```markdown
# Weekly Health Check Report - [Date]

## Summary
- **Overall Status**: ✅ Healthy / ⚠️ Degraded / ❌ Critical
- **Issues Found**: [count]
- **Actions Taken**: [summary]

## Automated Tests
- [ ] Smoke tests: [✅/❌]
- [ ] Health API: [✅/❌]
- [ ] Build test: [✅/❌]

## Manual Checks
- [ ] Database health: [✅/❌]
- [ ] API endpoints: [✅/❌]
- [ ] Error monitoring: [✅/❌]
- [ ] Security: [✅/❌]

## Performance
- Response times: [metrics]
- Resource usage: [metrics]

## Issues & Actions
[Detail any issues found and actions taken]

## Next Steps
[Plan for upcoming week]
```

## 🛠️ Tools & Commands

### Quick Health Check
```bash
# One-liner health check
curl -s http://localhost:3000/api/health | jq '.status'
```

### Database Monitoring
```bash
# Check recent activity
psql -h [db-host] -U [user] -d [database] -c "
SELECT
  (SELECT COUNT(*) FROM orders WHERE created_at > NOW() - INTERVAL '24 hours') as orders_24h,
  (SELECT COUNT(*) FROM quotes WHERE created_at > NOW() - INTERVAL '24 hours') as quotes_24h,
  (SELECT COUNT(*) FROM dispatch_events WHERE created_at > NOW() - INTERVAL '24 hours') as events_24h;
"
```

### Log Analysis
```bash
# Check for recent errors in logs
tail -n 100 /var/log/application.log | grep -i error

# Check webhook processing
tail -n 50 /var/log/webhook.log
```

## 📞 Escalation

### When to Escalate
- Critical issues affecting production
- Security vulnerabilities
- Data loss or corruption
- Service downtime > 5 minutes

### Escalation Contacts
- **Primary**: [Dev Lead Name] - [contact info]
- **Secondary**: [Tech Lead Name] - [contact info]
- **Emergency**: [On-call Number]

## 📚 References

- [Production Deployment Guide](README.md)
- [Database Schema](supabase/schema.sql)
- [API Documentation](README.md#api-routes)
- [Monitoring Setup](README.md#security--best-practices)