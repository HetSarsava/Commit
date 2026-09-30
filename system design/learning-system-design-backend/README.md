# Learning System Design - Backend

Backend API for the CRM system with WhatsApp automation, catalogue management, billing, and digital marketing.

## 🚀 Quick Start (No Database Needed!)

```bash
npm install
npm run dev
```

✅ That's it! The backend uses **mock in-memory data** by default - no PostgreSQL setup required.

---

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** PostgreSQL (optional - mock data by default)
- **ORM:** Prisma
- **Authentication:** JWT

---

## Features

- ✅ Mock in-memory database (development mode)
- ✅ User authentication & authorization (JWT)
- ✅ Role-based access control (Admin, Sales, Accounts, Production, Purchase, Marketing)
- ✅ Lead management with pipeline tracking
- ✅ Activity logging
- ⏳ Customer management
- ⏳ Product & catalogue system
- ⏳ Quotation & sales order management
- ⏳ GST billing & invoicing

---

## Installation

### Option 1: Quick Start with Mock Data (Recommended)

No database setup required!

```bash
# 1. Install dependencies
npm install

# 2. Start server
npm run dev
```

Server starts at: **http://localhost:5000**

The `.env` file is already configured with `USE_MOCK_DB=true`.

### Option 2: Use Real PostgreSQL Database

For production or if you want persistent data:

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

4. **Start Server**
   ```bash
   npm run dev
   ```

---

## Configuration

### Environment Variables (`.env`)

```env
# Database Mode
USE_MOCK_DB=true              # true = mock data, false = PostgreSQL

# Server
PORT=5000
NODE_ENV=development

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# Frontend URL
CLIENT_URL=http://localhost:5173
```

---

## Mock Data

When `USE_MOCK_DB=true`, the backend includes:

### Demo Users

| Email | Password | Role |
|-------|----------|------|
| admin@example.com | admin123 | ADMIN |
| sales1@example.com | sales123 | SALES |
| sales2@example.com | sales123 | SALES |

### Sample Data
- **5 Leads** (Hotels, Schools, Hospitals, Tech companies)
- **3 Products** (Shirts, Pants, Uniform sets)
- Full CRUD operations work normally

**Note:** Data resets when server restarts. For persistent data, switch to PostgreSQL.

### Customizing Mock Data

Edit `src/data/mockData.js` to add/modify sample data:

```javascript
mockData.leads.push({
  id: 'lead-6',
  companyName: 'Your Company',
  // ... your data
});
```

---

## API Endpoints

### Health Check
- `GET /health` - Server health status

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user (requires token)
- `PUT /api/auth/profile` - Update profile
- `PUT /api/auth/change-password` - Change password

### Leads
- `GET /api/leads` - Get all leads (with filters)
- `POST /api/leads` - Create lead
- `GET /api/leads/:id` - Get single lead
- `PUT /api/leads/:id` - Update lead
- `DELETE /api/leads/:id` - Delete lead (Admin only)
- `GET /api/leads/stats` - Get lead statistics

### Query Parameters (Leads)

```
GET /api/leads?status=NEW&priority=HIGH&search=hotel&page=1&limit=20
```

| Parameter | Description | Example |
|-----------|-------------|---------|
| status | Filter by status | NEW, CONTACTED, QUOTATION |
| priority | Filter by priority | LOW, MEDIUM, HIGH, HOT |
| source | Filter by source | WEBSITE, WHATSAPP, INDIAMART |
| salesPersonId | Filter by sales person | user-123 |
| search | Search across multiple fields | "hotel" |
| page | Page number | 1 |
| limit | Results per page | 20 |

---

## Testing the API

### Using curl

```bash
# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'

# Get leads (replace TOKEN)
curl http://localhost:5000/api/leads \
  -H "Authorization: Bearer YOUR_TOKEN"

# Create lead
curl -X POST http://localhost:5000/api/leads \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "Test Company",
    "contactPerson": "John Doe",
    "mobile": "+919876543210",
    "email": "john@test.com",
    "source": "WEBSITE",
    "status": "NEW"
  }'
```

### Using Postman

1. **Login** - POST `/api/auth/login` with body:
   ```json
   {
     "email": "admin@example.com",
     "password": "admin123"
   }
   ```

2. Copy the `token` from response

3. Add to all requests:
   - Header: `Authorization`
   - Value: `Bearer YOUR_TOKEN`

---

## Database Schema

View the complete schema in `prisma/schema.prisma`

### Main Models:
- **Users** - Authentication & roles
- **Leads** - Lead management with pipeline
- **Customers** - Customer profiles
- **Products** - Product catalogue
- **Quotations** - Quotations & pricing
- **SalesOrders** - Sales orders
- **Invoices** - GST billing
- **Payments** - Payment tracking
- **Inventory** - Stock management
- **Production** - Production workflow
- **Activities** - Audit log

---

## Project Structure

```
learning-system-design-backend/
├── src/
│   ├── config/
│   │   └── database.js          # DB config (mock/real)
│   ├── controllers/             # Business logic
│   │   ├── authController.js
│   │   └── leadController.js
│   ├── data/                    # Mock data (when USE_MOCK_DB=true)
│   │   ├── mockData.js          # Sample data
│   │   └── mockDatabase.js      # Mock Prisma client
│   ├── middleware/              # Express middleware
│   │   ├── auth.js
│   │   └── errorHandler.js
│   ├── routes/                  # API routes
│   │   ├── authRoutes.js
│   │   └── leadRoutes.js
│   ├── services/                # External services (future)
│   ├── utils/                   # Helper functions
│   └── server.js                # Express app entry
├── prisma/
│   ├── schema.prisma            # Database schema
│   └── seed.js                  # Seed script (for real DB)
├── .env                         # Configuration
├── package.json
└── README.md
```

---

## Useful Commands

```bash
# Development
npm run dev                    # Start with nodemon (auto-reload)
npm start                      # Start production server

# Database (only needed if USE_MOCK_DB=false)
npm run prisma:generate        # Generate Prisma Client
npm run prisma:migrate         # Run migrations
npm run prisma:studio          # Open database GUI
npm run prisma:seed            # Seed database
```

---

## Switching from Mock to Real Database

When you're ready for persistent data:

1. **Install PostgreSQL** (if not installed)
2. **Create database**: `createdb crm_db`
3. **Update `.env`**: Set `USE_MOCK_DB=false`
4. **Run migrations**: `npm run prisma:migrate`
5. **Seed data**: `npm run prisma:seed`
6. **Restart server**: `npm run dev`

That's it! Your API endpoints stay the same - frontend code doesn't change.

---

## Next Steps

1. ✅ Backend API running with mock data
2. 🔄 Build frontend UI (Dashboard, Leads)
3. ⏳ Add more API endpoints (Products, Customers, Quotations)
4. ⏳ Integrate WhatsApp Business API
5. ⏳ Add file upload (product images, documents)
6. ⏳ Implement job queues for automation
7. ⏳ Switch to PostgreSQL when ready for production

---

## Troubleshooting

### Port already in use

Change `PORT=5001` in `.env`, then update frontend `.env` with new API URL.

### Mock data not loading

Check `src/data/mockData.js` exists and verify `.env` has `USE_MOCK_DB=true`.

### Cannot find module errors

Run `npm install` again.

---

## Support

Check the main [QUICK_START.md](../QUICK_START.md) for complete setup instructions.
