# Learning System Design - Frontend

React frontend for the CRM system with WhatsApp automation, catalogue management, billing, and digital marketing.

## Tech Stack

- **Framework:** React 18
- **Build Tool:** Vite
- **Routing:** React Router DOM
- **HTTP Client:** Axios
- **Styling:** CSS (with custom design system)

## Prerequisites

- Node.js 18+ installed
- Backend API running on `http://localhost:5000`

## Installation

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Create a `.env` file:

```env
VITE_API_URL=http://localhost:5000/api
```

### 3. Start Development Server

```bash
npm run dev
```

Frontend will start at: **http://localhost:5173**

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@example.com | admin123 |
| Sales | sales1@example.com | sales123 |

## Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
```

## Features

- ✅ User authentication (Login/Logout)
- ✅ Protected routes
- ✅ JWT token management
- ✅ Custom design system
- ⏳ Dashboard (coming soon)
- ⏳ Lead management UI
