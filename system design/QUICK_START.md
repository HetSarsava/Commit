# 🚀 Quick Start Guide (No Database Setup Needed!)

Get your CRM running in **2 minutes** with mock data - no PostgreSQL required!

---

## ✅ What You Need

- **Node.js 18+** - [Download](https://nodejs.org/) if you don't have it

That's it! No database, no Docker, no complex setup.

---

## 🏃 Start in 3 Steps

### 1️⃣ Backend Setup

```bash
cd learning-system-design-backend

# Install dependencies (takes ~30 seconds)
npm install

# Start the server
npm run dev
```

✅ Backend running at: **http://localhost:5000**

You should see:
```
✅ Mock database connected (in-memory) - No PostgreSQL needed!
🚀 Server running on port 5000
```

### 2️⃣ Frontend Setup

Open a **NEW terminal** (keep backend running):

```bash
cd learning-system-design-frontend

# Install dependencies (takes ~30 seconds)
npm install

# Start the server
npm run dev
```

✅ Frontend running at: **http://localhost:5173**

### 3️⃣ Login & Test

1. Open browser: **http://localhost:5173**
2. Login with:
   - **Email:** `admin@example.com`
   - **Password:** `admin123`

🎉 You're in! The system is using in-memory mock data.

---

## 📊 Available Demo Users

| Role | Email | Password | Access |
|------|-------|----------|--------|
| **Admin** | admin@example.com | admin123 | Full access |
| **Sales** | sales1@example.com | sales123 | Sales features only |
| **Sales** | sales2@example.com | sales123 | Sales features only |

---

## 📦 What's Included (Mock Data)

- **3 Users** (Admin + 2 Sales reps)
- **5 Sample Leads** (Hotels, Schools, Hospitals, etc.)
- **3 Products** (Shirts, Pants, Uniform sets)
- All CRUD operations work normally!

The data persists in memory while the server is running. When you restart, it resets to the original sample data.

---

## 🧪 Test the API

### Via Browser

- Health check: http://localhost:5000/health
- API info: http://localhost:5000/

### Via curl

```bash
# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'

# Copy the token from response, then:
curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Via Postman/Insomnia

Test these endpoints:

**Auth:**
- POST `/api/auth/login` - Login
- GET `/api/auth/me` - Get current user

**Leads:**
- GET `/api/leads` - Get all leads
- POST `/api/leads` - Create new lead
- GET `/api/leads/:id` - Get single lead
- PUT `/api/leads/:id` - Update lead
- DELETE `/api/leads/:id` - Delete lead (Admin only)
- GET `/api/leads/stats` - Statistics

---

## 🔄 How Mock Data Works

### Backend (`learning-system-design-backend/`)

The backend uses an **in-memory database** instead of PostgreSQL:

- **Mock data:** `src/data/mockData.js` - Sample users, leads, products
- **Mock database:** `src/data/mockDatabase.js` - Simulates Prisma operations
- **Configuration:** `src/config/database.js` - Switches between mock/real DB

### API Endpoints

All APIs work exactly the same whether using mock or real data:

```javascript
// Frontend calls the same API
const { leads } = await leadsAPI.getLeads();

// Backend uses mock data (for now)
// Later, switch to PostgreSQL - frontend code doesn't change!
```

---

## 🔄 Add/Edit Mock Data

Want to customize the sample data?

Edit `learning-system-design-backend/src/data/mockData.js`:

```javascript
// Add a new lead
mockData.leads.push({
  id: 'lead-6',
  companyName: 'Your Company',
  contactPerson: 'John Doe',
  mobile: '+919876540006',
  email: 'john@company.com',
  // ... more fields
});
```

Save the file and restart the backend.

---

## 💾 When to Switch to Real Database?

Switch to PostgreSQL when:
- You want data to persist between restarts
- You're ready to deploy to production
- You need advanced queries/performance
- Multiple people need to access the same data

### How to Switch

1. **Install PostgreSQL**
   ```bash
   brew install postgresql@16
   brew services start postgresql@16
   createdb crm_db
   ```

2. **Update `.env`**
   ```env
   USE_MOCK_DB=false
   DATABASE_URL="postgresql://YOUR_USERNAME@localhost:5432/crm_db"
   ```

3. **Run Migrations**
   ```bash
   npm run prisma:generate
   npm run prisma:migrate
   npm run prisma:seed
   ```

4. **Restart Backend**
   ```bash
   npm run dev
   ```

Done! Your app now uses PostgreSQL with the exact same data.

---

## 🎯 Next Steps - Build Features

Now you can start building without worrying about database setup:

### Phase 1: Dashboard UI
1. Convert `Amit-Uniform-UI-Prototype/dashboard-ui.html` to React
2. Connect to `/api/leads/stats` endpoint
3. Show KPIs (total leads, new leads, hot leads)

### Phase 2: Lead Management UI
1. Convert `lead-management-ui.html` to React
2. List leads with filters (status, priority, source)
3. Create/edit lead forms
4. Lead detail view with history

### Phase 3: More Features
- Customer management
- Product catalogue
- Quotations & invoicing
- WhatsApp integration

---

## 🐛 Troubleshooting

### Backend won't start

**Error: "Port 5000 already in use"**

Something else is using port 5000. Change it:

Edit `backend/.env`:
```env
PORT=5001
```

Then update `frontend/.env`:
```env
VITE_API_URL=http://localhost:5001/api
```

### Frontend shows "Network Error"

1. Check backend is running (should see logs in terminal)
2. Visit http://localhost:5000/health - should show "ok"
3. Check frontend `.env` has correct API URL

### Login fails with "Invalid credentials"

Use exact credentials:
- Email: `admin@example.com` (lowercase)
- Password: `admin123`

Check backend terminal for error messages.

---

## 📁 Project Structure

```
learning-system-design-backend/
├── src/
│   ├── data/
│   │   ├── mockData.js         ← Sample data
│   │   └── mockDatabase.js     ← Mock Prisma client
│   ├── config/
│   │   └── database.js         ← Switches mock/real DB
│   ├── controllers/            ← Business logic
│   ├── routes/                 ← API routes
│   └── server.js               ← Entry point
└── .env                        ← USE_MOCK_DB=true

learning-system-design-frontend/
├── src/
│   ├── api/                    ← API calls
│   ├── pages/                  ← Login, Dashboard
│   ├── context/                ← Auth state
│   └── App.jsx                 ← Routes
└── .env                        ← API URL
```

---

## ✅ Quick Reference

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start development server |
| `npm install` | Install dependencies |
| Backend at | http://localhost:5000 |
| Frontend at | http://localhost:5173 |
| Login | admin@example.com / admin123 |

---

## 🎉 You're Ready!

Start building your CRM features. When you're ready for a real database, just:
1. Install PostgreSQL
2. Change `USE_MOCK_DB=false` in `.env`
3. Run migrations

Your frontend code won't change at all! 🚀
