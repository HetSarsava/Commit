# 🚀 How to Run - Amit Uniform CRM System

**Quick Start Guide**  
**Last Updated:** 2026-09-27

---

## 📋 Prerequisites

Before you start, ensure you have:

### Required Software:
- ✅ **Node.js 18+** - [Download](https://nodejs.org/)
- ✅ **PostgreSQL 14+** - [Download](https://www.postgresql.org/)
- ✅ **npm or yarn** (comes with Node.js)

### Optional:
- Git (for version control)
- VS Code (recommended editor)
- Postman (for API testing)

---

## 🗂️ Project Structure

```
system design/
├── learning-system-design-backend/     # Backend API (Node.js + Express + Prisma)
├── learning-system-design-frontend/    # Frontend UI (React + Vite)
├── Amit-Uniform-UI-Prototype/          # HTML prototypes (reference)
├── SystemDesignRequirement.pdf         # Requirements
└── *.md files                          # Documentation
```

---

## ⚡ Quick Start (3 Steps)

### Step 1: Setup Database

```bash
# Install PostgreSQL (if not installed)
brew install postgresql@16  # macOS
# OR
# Download from: https://www.postgresql.org/download/

# Start PostgreSQL
brew services start postgresql@16

# Create database
createdb learning_system_design
```

### Step 2: Setup Backend

```bash
cd learning-system-design-backend

# Install dependencies
npm install

# Create .env file
cat > .env << 'EOF'
DATABASE_URL="postgresql://username:password@localhost:5432/learning_system_design"
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
PORT=5000
NODE_ENV=development
CLIENT_URL="http://localhost:5173"
EOF

# Note: Replace 'username' and 'password' with your PostgreSQL credentials

# Generate Prisma Client
npx prisma generate

# Create database tables
npx prisma db push

# Seed database with sample data
node prisma/seed.js

# Start backend server
npm start
```

**Backend will run on:** `http://localhost:5000`

### Step 3: Setup Frontend

```bash
# Open new terminal window
cd learning-system-design-frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

**Frontend will run on:** `http://localhost:5173`

---

## 🎯 Access the Application

### URLs:
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:5000
- **API Health Check:** http://localhost:5000/health

### Default Login Credentials:

**Admin Account:**
```
Email: admin@amituniform.com
Password: admin123
```

**Sales Account:**
```
Email: ravi.shah@amituniform.com
Password: ravi123
```

**Test Accounts Available:**
- admin@amituniform.com (ADMIN - Full access)
- ravi.shah@amituniform.com (SALES)
- priya.mehta@amituniform.com (SALES)
- amit.kumar@amituniform.com (PRODUCTION)
- rajesh.singh@amituniform.com (PURCHASE)
- neha.gupta@amituniform.com (MARKETING)

---

## 🔧 Detailed Setup

### Database Setup (PostgreSQL)

#### Option 1: Local PostgreSQL (Recommended)

```bash
# macOS
brew install postgresql@16
brew services start postgresql@16

# Create user (if needed)
createuser -s postgres

# Create database
createdb learning_system_design

# Verify connection
psql -d learning_system_design -c "SELECT version();"
```

#### Option 2: PostgreSQL in Docker

```bash
docker run --name postgres-crm \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=learning_system_design \
  -p 5432:5432 \
  -d postgres:16
```

#### Option 3: Cloud Database (Supabase/Neon)

1. Create free account at [Supabase](https://supabase.com) or [Neon](https://neon.tech)
2. Create new project
3. Copy connection string
4. Update DATABASE_URL in .env

---

### Backend Configuration

#### 1. Environment Variables

Create `.env` file in `learning-system-design-backend/`:

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/learning_system_design"

# JWT Authentication
JWT_SECRET="change-this-to-random-secret-key-in-production"

# Server
PORT=5000
NODE_ENV=development

# CORS
CLIENT_URL="http://localhost:5173"

# WhatsApp Business API (Optional - for production)
PHONE_NUMBER_ID=""
WHATSAPP_ACCESS_TOKEN=""
WEBHOOK_VERIFY_TOKEN=""
```

#### 2. Install Dependencies

```bash
cd learning-system-design-backend
npm install
```

**Key Packages Installed:**
- express - Web framework
- prisma - Database ORM
- bcryptjs - Password hashing
- jsonwebtoken - Authentication
- cors - Cross-origin requests
- xlsx, csv-writer, pdfkit - Export functionality

#### 3. Database Migrations

```bash
# Generate Prisma client
npx prisma generate

# Push schema to database (development)
npx prisma db push

# OR run migrations (production)
npx prisma migrate dev --name init

# Seed database with sample data
node prisma/seed.js
```

#### 4. Verify Backend

```bash
# Start server
npm start

# Should see:
# ╔═══════════════════════════════════════════╗
# ║  🚀 Server running on port 5000          ║
# ║  📝 Environment: development              ║
# ║  🔗 API: http://localhost:5000/api      ║
# ╚═══════════════════════════════════════════╝

# Test health endpoint
curl http://localhost:5000/health

# Should return:
# {"status":"ok","timestamp":"...","uptime":...}
```

---

### Frontend Configuration

#### 1. Install Dependencies

```bash
cd learning-system-design-frontend
npm install
```

**Key Packages:**
- react - UI library
- react-router-dom - Routing
- axios - HTTP client
- recharts - Charts/analytics

#### 2. Environment Variables (Optional)

Create `.env` file in `learning-system-design-frontend/`:

```env
VITE_API_URL=http://localhost:5000
```

#### 3. Start Development Server

```bash
npm run dev
```

**Output:**
```
VITE v5.x.x ready in xxx ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

#### 4. Verify Frontend

Open browser and navigate to:
- http://localhost:5173
- Should see login page
- Login with admin@amituniform.com / admin123

---

## 🎨 First Time Setup

### 1. Login

Visit http://localhost:5173 and login with:
```
Email: admin@amituniform.com
Password: admin123
```

### 2. Explore the System

**Dashboard:**
- View today's metrics
- See lead pipeline
- Check sales performance

**Leads:**
- 20 sample leads pre-loaded
- Try creating a new lead
- Move leads through pipeline stages

**Products:**
- Sample products available
- Create your own products
- Set pricing and inventory

**WhatsApp:**
- 15 conversations with dummy data
- Test inbox, templates, automation
- Try filtering and search

### 3. Create Your First Record

**Create a Lead:**
1. Click "Leads" in sidebar
2. Click "+ New Lead"
3. Fill in company details
4. Save

**Create a Product:**
1. Click "Products" in sidebar
2. Click "+ Add Product"
3. Upload image, set price
4. Save

**Create a Quotation:**
1. Click "Quotations" in sidebar
2. Click "+ New Quotation"
3. Select customer
4. Add products
5. Generate quotation

---

## 🐛 Troubleshooting

### Backend Issues

**Problem:** "Cannot find module 'xyz'"
```bash
cd learning-system-design-backend
rm -rf node_modules package-lock.json
npm install
```

**Problem:** "DATABASE_URL environment variable not set"
```bash
# Check .env file exists
cat .env

# Verify DATABASE_URL is set
echo $DATABASE_URL

# If missing, create .env file
```

**Problem:** "Port 5000 already in use"
```bash
# Find process using port 5000
lsof -ti:5000

# Kill the process
kill -9 $(lsof -ti:5000)

# Or change port in .env
PORT=5001
```

**Problem:** "Prisma Client not generated"
```bash
npx prisma generate
npx prisma db push
```

**Problem:** "Database connection failed"
```bash
# Check PostgreSQL is running
brew services list | grep postgresql

# Start PostgreSQL
brew services start postgresql@16

# Test connection
psql -d learning_system_design -c "SELECT 1;"
```

---

### Frontend Issues

**Problem:** "Cannot connect to backend"
```bash
# Check backend is running
curl http://localhost:5000/health

# If not, start backend
cd learning-system-design-backend
npm start
```

**Problem:** "Port 5173 already in use"
```bash
# Kill process on 5173
kill -9 $(lsof -ti:5173)

# Or Vite will automatically use next available port
```

**Problem:** "Login not working"
```bash
# Check backend logs
# Verify database has users (run seed)
cd learning-system-design-backend
node prisma/seed.js
```

**Problem:** "White screen / blank page"
```bash
# Check browser console for errors
# Clear cache and reload (Cmd+Shift+R)

# Rebuild frontend
cd learning-system-design-frontend
rm -rf node_modules .vite
npm install
npm run dev
```

---

### Database Issues

**Problem:** "Database does not exist"
```bash
createdb learning_system_design
```

**Problem:** "Role 'username' does not exist"
```bash
# Create PostgreSQL user
createuser -s postgres

# Or specify existing user in DATABASE_URL
```

**Problem:** "Too many clients already"
```bash
# Restart PostgreSQL
brew services restart postgresql@16
```

**Problem:** "Reset database"
```bash
# Drop and recreate
dropdb learning_system_design
createdb learning_system_design

# Re-run migrations
cd learning-system-design-backend
npx prisma db push
node prisma/seed.js
```

---

## 📦 Production Deployment

### Backend Deployment (Railway/Render/Heroku)

```bash
# Build command
npm install && npx prisma generate

# Start command
npm start

# Environment variables to set:
DATABASE_URL=postgresql://...
JWT_SECRET=random-secret-key
NODE_ENV=production
CLIENT_URL=https://your-frontend-url.com
```

### Frontend Deployment (Vercel/Netlify)

```bash
# Build command
npm run build

# Output directory
dist

# Environment variables:
VITE_API_URL=https://your-backend-url.com
```

---

## 🔒 Security Checklist

Before deploying to production:

- [ ] Change JWT_SECRET to a random 64-character string
- [ ] Update all default passwords
- [ ] Set strong database password
- [ ] Enable HTTPS
- [ ] Configure CORS properly
- [ ] Set NODE_ENV=production
- [ ] Review and limit API rate limits
- [ ] Enable database backups
- [ ] Set up monitoring
- [ ] Configure proper logging

---

## 📊 System Requirements

### Minimum:
- **CPU:** 2 cores
- **RAM:** 4 GB
- **Storage:** 10 GB
- **OS:** macOS, Windows, Linux

### Recommended:
- **CPU:** 4 cores
- **RAM:** 8 GB
- **Storage:** 20 GB SSD
- **OS:** macOS or Linux

---

## 🆘 Getting Help

### Check Logs:

**Backend Logs:**
```bash
cd learning-system-design-backend
npm start
# Watch terminal output
```

**Frontend Logs:**
```bash
# Browser Console (F12)
# Check for errors
```

### Useful Commands:

```bash
# Check Node version
node --version

# Check npm version
npm --version

# Check PostgreSQL version
psql --version

# View database tables
npx prisma studio

# Reset everything
# Backend:
cd learning-system-design-backend
rm -rf node_modules
npm install
npx prisma generate
npx prisma db push
node prisma/seed.js

# Frontend:
cd learning-system-design-frontend
rm -rf node_modules .vite
npm install
```

---

## ✅ Verification Checklist

After setup, verify:

- [ ] Backend health check returns "ok": http://localhost:5000/health
- [ ] Frontend loads: http://localhost:5173
- [ ] Can login with admin credentials
- [ ] Dashboard shows data
- [ ] Can create a new lead
- [ ] Can navigate between pages
- [ ] Sidebar navigation works
- [ ] No console errors

---

## 🎉 You're Ready!

Once everything is running:

1. **Explore** - Browse all modules (Dashboard, Leads, Products, etc.)
2. **Test** - Create sample records
3. **Customize** - Update company settings
4. **Learn** - Check USER_GUIDE.md for detailed usage

---

## 📚 Additional Resources

- **User Guide:** `USER_GUIDE.md` - How to use the system
- **Remaining Features:** `REMAINING_FEATURES_ANALYSIS.md` - What's left to build
- **API Documentation:** Backend `/api` endpoints
- **WhatsApp Integration:** `WHATSAPP_INTEGRATION_ARCHITECTURE.md`

---

## 💻 Development Commands

### Backend:
```bash
npm start          # Start server
npm run dev        # Start with nodemon (auto-reload)
npx prisma studio  # Open database GUI
npx prisma format  # Format schema file
```

### Frontend:
```bash
npm run dev        # Start dev server
npm run build      # Build for production
npm run preview    # Preview production build
npm run lint       # Run ESLint
```

---

**System Status:** ✅ Ready for Development & Testing

**Access:** http://localhost:5173  
**Login:** admin@amituniform.com / admin123

**Need help?** Check troubleshooting section above or review error logs.
