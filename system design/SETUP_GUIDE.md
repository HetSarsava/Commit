# 🚀 Complete Setup Guide - Learning System Design

This is a full-stack CRM application based on the Amit Uniform requirements with:
- **Backend:** Node.js + Express + PostgreSQL + Prisma
- **Frontend:** React + Vite
- **Features:** CRM, Lead Management, Authentication, Role-based Access

---

## 📁 Project Structure

```
system design/
├── learning-system-design-backend/     # Node.js API
├── learning-system-design-frontend/    # React UI
├── Amit-Uniform-UI-Prototype/          # Original HTML prototypes
└── SystemDesignRequirement.pdf         # Requirements document
```

---

## 🛠️ Setup Instructions

### Prerequisites

1. **Node.js 18+** - [Download](https://nodejs.org/)
2. **PostgreSQL 14+** - [Download](https://www.postgresql.org/download/)
3. **Git** (optional)

---

## 🔧 Backend Setup

### Step 1: Install Dependencies

```bash
cd learning-system-design-backend
npm install
```

### Step 2: Set Up PostgreSQL

**Option A: Install PostgreSQL locally (Recommended for Mac)**

```bash
# Install via Homebrew
brew install postgresql@16

# Start PostgreSQL
brew services start postgresql@16

# Create database
createdb crm_db
```

**Option B: Use Docker (if you want)**

```bash
# Install Docker Desktop first, then:
docker-compose up -d
```

### Step 3: Configure Environment

Create `.env` file:

```bash
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/crm_db?schema=public"
JWT_SECRET=your-super-secret-jwt-key-change-this
PORT=5000
```

**Important:** If you installed PostgreSQL locally without setting a password, use:
```env
DATABASE_URL="postgresql://YOUR_USERNAME@localhost:5432/crm_db?schema=public"
```

Replace `YOUR_USERNAME` with your Mac username (run `whoami` to find it).

### Step 4: Run Database Migrations

```bash
# Generate Prisma Client
npm run prisma:generate

# Run migrations to create tables
npm run prisma:migrate

# Seed database with sample data
npm run prisma:seed
```

### Step 5: Start Backend Server

```bash
npm run dev
```

✅ Backend should be running at: **http://localhost:5000**

Test it: Open http://localhost:5000/health in your browser

---

## 🎨 Frontend Setup

### Step 1: Install Dependencies

Open a **NEW terminal window** (keep backend running):

```bash
cd learning-system-design-frontend
npm install
```

### Step 2: Configure Environment

Create `.env` file:

```bash
cp .env.example .env
```

The `.env` file should have:

```env
VITE_API_URL=http://localhost:5000/api
```

### Step 3: Start Frontend Server

```bash
npm run dev
```

✅ Frontend should be running at: **http://localhost:5173**

---

## 🎯 Testing the Application

### 1. Open the App

Go to: **http://localhost:5173**

You'll see the login page.

### 2. Login with Demo Credentials

Try these accounts (created by the seed script):

| Role | Email | Password |
|------|-------|----------|
| **Admin** | admin@example.com | admin123 |
| **Sales** | sales1@example.com | sales123 |
| **Sales** | sales2@example.com | sales123 |

### 3. After Login

You'll be redirected to a simple dashboard (placeholder for now).

---

## 📊 Database Management

### View Database in Browser

```bash
cd learning-system-design-backend
npm run prisma:studio
```

Opens Prisma Studio at: **http://localhost:5555**

Here you can:
- Browse all tables
- View/edit data
- See relationships

### Database Schema

The database includes these main tables:
- **users** - User accounts with roles
- **leads** - Lead management pipeline
- **customers** - Customer profiles
- **products** - Product catalogue
- **quotations** - Quotations & pricing
- **salesOrders** - Sales orders
- **invoices** - GST billing
- **payments** - Payment tracking
- **inventory** - Stock management
- **production** - Production workflow

---

## 🔍 API Testing

You can test the API using:

### 1. Browser (for GET requests)

- Health check: http://localhost:5000/health
- API root: http://localhost:5000/

### 2. curl (Terminal)

```bash
# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'

# This returns a JWT token - copy it for next requests

# Get leads (replace YOUR_TOKEN with the token from login)
curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Postman/Insomnia (Recommended)

Import these endpoints:

**Auth Endpoints:**
- POST `/api/auth/login` - Login
- POST `/api/auth/register` - Register
- GET `/api/auth/me` - Get current user

**Lead Endpoints:**
- GET `/api/leads` - Get all leads
- POST `/api/leads` - Create lead
- GET `/api/leads/:id` - Get single lead
- PUT `/api/leads/:id` - Update lead
- DELETE `/api/leads/:id` - Delete lead (Admin only)
- GET `/api/leads/stats` - Get statistics

---

## 🚨 Troubleshooting

### Backend won't start

**Error: "Can't connect to database"**

1. Check PostgreSQL is running:
   ```bash
   brew services list
   # Look for postgresql - should say "started"
   ```

2. Check database exists:
   ```bash
   psql -l | grep crm_db
   ```

3. Try connecting manually:
   ```bash
   psql crm_db
   ```

**Error: "Port 5000 already in use"**

Change the port in backend `.env`:
```env
PORT=5001
```

Then update frontend `.env`:
```env
VITE_API_URL=http://localhost:5001/api
```

### Frontend shows blank page

1. Open browser console (F12) - check for errors
2. Verify backend is running at http://localhost:5000
3. Check CORS - backend should allow frontend origin

### Login fails

1. Check backend logs for errors
2. Verify database was seeded:
   ```bash
   npm run prisma:studio
   # Check if users table has data
   ```

3. Try registering a new user instead

### CORS errors

Make sure backend `.env` has:
```env
CLIENT_URL=http://localhost:5173
```

---

## 📝 Next Steps - Development Roadmap

Based on the SystemDesignRequirement.pdf, here's what to build next:

### Phase 1 (Current Status)
- ✅ Backend API foundation
- ✅ Database schema
- ✅ Authentication system
- ✅ Lead management APIs
- ✅ Frontend foundation
- ✅ Login page

### Phase 2 (Next Steps)
1. **Dashboard UI**
   - Convert `dashboard-ui.html` to React
   - Show KPIs (leads, sales, orders)
   - Add charts/graphs
   
2. **Lead Management UI**
   - Convert `lead-management-ui.html` to React
   - Lead list with filters
   - Lead details page
   - Create/edit lead forms
   - Pipeline view

3. **Customer Management**
   - Customer list & profiles
   - Customer history
   - Connected to leads

### Phase 3
- Product catalogue CRUD
- Catalogue builder
- PDF generation
- Shareable catalogue links

### Phase 4
- Quotation management
- Proforma invoice
- Sales order
- GST invoice generation

### Phase 5
- WhatsApp Business API integration
- Automated messages
- AI assistant

### Phase 6
- Payment tracking
- Inventory management
- Production workflow
- Dispatch tracking

---

## 🎨 Converting HTML Prototypes to React

Your existing HTML files can be converted to React:

### Example: Lead Management Page

1. **Copy HTML structure** → JSX
2. **Extract CSS** → component CSS file
3. **Add state management**
   ```javascript
   const [leads, setLeads] = useState([]);
   const [loading, setLoading] = useState(false);
   ```

4. **Connect to API**
   ```javascript
   useEffect(() => {
     const fetchLeads = async () => {
       const { leads } = await leadsAPI.getLeads();
       setLeads(leads);
     };
     fetchLeads();
   }, []);
   ```

5. **Add interactions** (filters, search, create, edit)

---

## 📚 Resources

### Documentation
- [Prisma Docs](https://www.prisma.io/docs)
- [Express.js](https://expressjs.com/)
- [React Docs](https://react.dev/)
- [Vite Docs](https://vitejs.dev/)

### Learn More
- Node.js REST API best practices
- React hooks & state management
- JWT authentication
- PostgreSQL & Prisma ORM

---

## 🤝 Getting Help

1. Check the README files in backend/frontend folders
2. Look at code comments
3. Use Prisma Studio to inspect database
4. Check browser console for frontend errors
5. Check terminal for backend errors

---

## ✅ Quick Start Checklist

- [ ] PostgreSQL installed and running
- [ ] Backend dependencies installed (`npm install`)
- [ ] Backend `.env` configured
- [ ] Database migrated and seeded
- [ ] Backend running on port 5000
- [ ] Frontend dependencies installed
- [ ] Frontend `.env` configured  
- [ ] Frontend running on port 5173
- [ ] Can login with demo credentials
- [ ] Prisma Studio opens successfully

---

## 🎉 Success!

If everything is working:
- Backend: http://localhost:5000
- Frontend: http://localhost:5173
- Prisma Studio: http://localhost:5555 (when running)

You now have a complete full-stack CRM application ready for development!

**Next:** Start building the Dashboard UI and Lead Management pages.
