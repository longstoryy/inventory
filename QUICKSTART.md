# Quick Start Guide

## Prerequisites
- PostgreSQL database (or Supabase account) ✅ (Already configured!)
- Node.js installed
- npm/yarn

## Setup Steps

### 1. Database Configuration ✅ DONE
Your `.env.local` already has:
- DATABASE_URL (Supabase)
- JWT_SECRET  
- JWT_EXPIRES_IN

### 2. Generate Prisma Client & Push Schema

There's a Windows-specific issue with `prisma generate`. Try these steps:

**Option A: Use PowerShell as Administrator**
```bash
# Clean and regenerate
npx prisma generate --no-engine

# Push schema to database
npx prisma db push --skip-generate
```

**Option B: If still failing, manually install engines**
```bash
npm install @prisma/engines
npx prisma generate
```

**Option C: Use WSL (Windows Subsystem for Linux)**
```bash
wsl
cd /mnt/c/Users/LongStory\ GH/Desktop/inventory
npx prisma generate
npx prisma db push
```

### 3. Seed Database (After successful push)
```bash
npm run db:seed
```

This creates:
- Demo organization
- Admin user: `admin@agrochem.com` / `admin123`
- Manager user: `manager@agrochem.com` / `manager123`
- 3 sample customers
- 4 sample products with batches

### 4. Restart Dev Server
```bash
# Stop current server (Ctrl+C)
npm run dev
```

## API Endpoints Ready

### Authentication
- `POST /api/auth/register` - Register new user + organization
- `POST /api/auth/login` - Login (returns JWT token)

### Products & Inventory
- `GET /api/products` - List products
- `POST /api/products` - Create product
- `GET /api/batches` - List batches
- `POST /api/batches` - Create batch

### Sales
- `GET /api/sales` - List sales
- `POST /api/sales` - Create sale (with automatic stock deduction)

### Customers
- `GET /api/customers` - List customers
- `POST /api/customers` - Create customer

### Returns
- `GET /api/returns` - List returns
- `POST /api/returns` - Create return (with stock restatement)

### Expenses
- `GET /api/expenses` - List expenses
- `POST /api/expenses` - Create expense

## Testing with Postman/Thunder Client

### 1. Register
```http
POST http://localhost:3000/api/auth/register
Content-Type: application/json

{
  "organizationName": "My Company",
  "email": "test@example.com",
  "password": "password123",
  "name": "Test User"
}
```

### 2. Login
```http
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "password123"
}
```

Copy the `token` from response.

### 3. Use Token for Authenticated Requests
```http
GET http://localhost:3000/api/products
Authorization: Bearer YOUR_TOKEN_HERE
```

## Troubleshooting

### Prisma Generate Fails
- Try running as Administrator
- Or use WSL
- Or build from another machine and copy `node_modules/.prisma` folder

### Database Connection Issues
- Verify Supabase database is accessible
- Check connection string in `.env.local`

### Authorization Errors
- Make sure to include `Authorization: Bearer <token>` header
- Token expires in 7 days by default

## Next Steps

Once database is working:
1. Test all API endpoints
2. Update frontend to fetch real data
3. Add remaining features (reports, dashboard charts)
4. Deploy to production
