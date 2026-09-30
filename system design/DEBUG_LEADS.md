# Debug: No Leads Showing

## Quick Checklist

### ✅ 1. Backend Running?
```bash
cd learning-system-design-backend
npm run dev
```

You should see:
```
✅ Mock database connected (in-memory)
🚀 Server running on port 5000
```

### ✅ 2. Frontend Running?
```bash
cd learning-system-design-frontend
npm run dev
```

You should see:
```
VITE ready in XXXms
Local: http://localhost:5173
```

### ✅ 3. Check Backend Health
Open: http://localhost:5000/health

Should show:
```json
{"status":"ok","timestamp":"...","uptime":123}
```

### ✅ 4. Browser Console Errors?

**Press F12** → Console tab

Look for errors like:
- ❌ `Network Error`
- ❌ `401 Unauthorized`
- ❌ `Cannot read property...`

### ✅ 5. Check Network Requests

**F12** → Network tab → Refresh page

Look for these requests:
- `GET /api/leads/stats` → Status 200
- `GET /api/leads?page=1&limit=5` → Status 200

Click on them to see response data.

---

## Common Issues & Fixes

### Issue 1: "401 Unauthorized"
**Problem:** Token expired or invalid

**Fix:**
1. Logout
2. Login again with: admin@example.com / admin123
3. Should work now

### Issue 2: "Network Error"
**Problem:** Backend not running or wrong URL

**Fix:**
1. Check backend is running (Terminal 1)
2. Check frontend `.env` has: `VITE_API_URL=http://localhost:5000/api`
3. Restart both servers

### Issue 3: Empty array `{"leads": []}`
**Problem:** Mock data not loading

**Fix:**
1. Stop backend (Ctrl+C)
2. Check: `backend/src/data/mockData.js` has 5 leads
3. Restart: `npm run dev`

### Issue 4: CORS Error
**Problem:** Backend blocking frontend requests

**Fix:**
1. Check backend `.env` has: `CLIENT_URL=http://localhost:5173`
2. Restart backend

### Issue 5: Page is blank/white
**Problem:** JavaScript error

**Fix:**
1. Open Console (F12)
2. Look for red errors
3. Share the error message

---

## Test Backend Directly

### Test with curl:

```bash
# 1. Login to get token
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'

# Copy the token from response

# 2. Get leads (replace YOUR_TOKEN)
curl http://localhost:5000/api/leads \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Should return 5 leads!

---

## Still Not Working?

### Share these details:

1. **Backend terminal output** - copy last 10 lines
2. **Frontend terminal output** - any errors?
3. **Browser console** - screenshot of errors (F12)
4. **Network tab** - what status codes do you see?

---

## Quick Reset (Nuclear Option)

If nothing works, restart everything:

```bash
# Stop both servers (Ctrl+C in both terminals)

# Terminal 1 - Backend
cd learning-system-design-backend
npm install
npm run dev

# Terminal 2 - Frontend  
cd learning-system-design-frontend
npm install
npm run dev

# Browser
# Clear cache: Ctrl+Shift+Delete
# Or hard refresh: Ctrl+Shift+R (Cmd+Shift+R on Mac)
# Go to: http://localhost:5173
# Login: admin@example.com / admin123
```

---

## Expected Behavior

When working correctly:

**Dashboard:**
- Shows 5 total leads
- Shows lead pipeline chart
- Shows 5 recent leads in table

**Leads Page:**
- Shows table with 5 leads:
  1. ABC Hotel Group
  2. XYZ School
  3. Tech Solutions Pvt Ltd
  4. Sunrise Restaurant Chain
  5. Green Valley Hospital

**Each lead has:**
- Company name
- Contact person
- Source badge
- Status badge
- Priority badge
- Budget in ₹

---

## Contact

If still stuck, share:
1. Screenshot of browser console (F12)
2. Screenshot of Network tab
3. Backend terminal output

I'll help you fix it!
