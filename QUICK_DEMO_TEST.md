# Quick Demo Test Guide

## 🚀 Quick Start

The development server should now be starting with demo mode enabled.

### Check Server Status

Wait about 10-15 seconds, then open your browser to:
```
http://localhost:3000
```

## ✅ Quick Visual Checks (30 seconds)

### 1. Page Loads ✓
- Yellow warning banner at the top
- Floating demo widget in bottom-right corner

### 2. Widget Works ✓
- Click the chevron to expand/collapse
- Should show current role (default: Customer)

### 3. Role Switching ✓
Click the role dropdown and select each:
- **Customer** (User icon, blue) → navigates to /
- **Dispatcher** (Package icon, purple) → navigates to /dispatcher  
- **Driver** (Truck icon, green) → navigates to /driver
- **Admin** (Shield icon, orange) → navigates to /admin

### 4. Driver Selection ✓
- Switch to Driver role
- Driver selector dropdown should appear
- Select "John Smith (Demo)"
- Widget should show: "Driver: demo-driver-1"

### 5. Quick Actions ✓
- Click "Quick Actions" button
- Click "1. Start as Customer → Quote" - should go to /quote
- Click "Create Test Order" - page should reload
- Click "Reset All Demo Data" - data should clear

## 🎯 Key Features to Verify

| Feature | Expected Behavior | Status |
|---------|------------------|--------|
| Demo Banner | Yellow warning at top | ⬜ |
| Demo Widget | Visible bottom-right | ⬜ |
| Role Switch | Changes icon & navigates | ⬜ |
| Driver Select | Shows when Driver role | ⬜ |
| Quick Actions | Menu expands/collapses | ⬜ |
| State Persist | Survives page refresh | ⬜ |
| Create Order | Reloads page | ⬜ |
| Reset Data | Clears localStorage | ⬜ |

## 🔍 Check Browser Console

Open DevTools (F12) and verify:
- No red errors
- No yellow warnings
- localStorage has:
  - `demo-role`
  - `demo-driver-id` (when driver selected)

## 📱 Test Complete Flow (2 minutes)

1. **As Customer**: Click "Get a Quote" → See quote form
2. **As Dispatcher**: Switch to Dispatcher → See orders to assign
3. **As Driver**: Switch to Driver → Select John Smith → See assigned orders
4. **As Admin**: Switch to Admin → See all orders/metrics

## ✨ Success Criteria

✅ All 4 roles work  
✅ Navigation happens automatically  
✅ Widget UI is smooth and responsive  
✅ No console errors  
✅ State persists on refresh  

## 🐛 If Something's Wrong

### Banner not showing?
- Check: `NEXT_PUBLIC_DEMO_MODE=true` in environment
- Restart server with: `NEXT_PUBLIC_DEMO_MODE=true npm run dev`

### Widget not responding?
- Check browser console for errors
- Try refreshing the page
- Clear localStorage and refresh

### Role switching broken?
- Check if JavaScript is enabled
- Verify routes exist (/dispatcher, /driver, /admin)
- Check console for router errors

## 📊 Test Results Summary

**Automated Code Tests**: ✅ 42/42 PASSED  
**Manual UI Tests**: ⬜ Pending

**Issues Found**: _________________________

**Overall Status**: _________________________

---

**Quick Test Completed**: YES / NO  
**Date**: _______________  
**Notes**: _________________________

