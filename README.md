# 📦 Robust Inventory Management System

A comprehensive, enterprise-grade inventory management system built for **warehouses**, **retail stores**, or **combined operations**.

![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql)
![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?logo=prisma)

---

## ✨ Features

### Core Inventory
- 📍 **Multi-Location Management** - Track stock across warehouses and stores
- 🔄 **Stock Transfers** - Move inventory between locations with approval workflows
- 📦 **Product Catalog** - Categories, variants (size/color), SKUs, barcodes
- ⚠️ **Low Stock Alerts** - Configurable reorder points with notifications

### Purchasing & Sales
- 🛒 **Purchase Orders** - Create, track, and receive from suppliers
- 💳 **POS Interface** - Quick sales with barcode scanning
- 👥 **Customer Management** - Profiles, purchase history, credit limits
- 🏭 **Supplier Management** - Contacts, products, performance tracking

### Returns & Expenses
- ↩️ **Product Returns (RMA)** - Full return workflow with refunds/exchanges
- 💰 **Expense Tracking** - Categories, receipts, budgets, recurring expenses

### Administration
- 🔐 **Role-Based Access Control** - Admin, Manager, Staff, Viewer roles
- 📊 **Dashboard & KPIs** - Real-time metrics and charts
- 📋 **Reports** - Stock levels, movements, valuation, profit analysis
- 📝 **Audit Trail** - Complete activity log for compliance

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14 (App Router), React 18, TypeScript |
| **Styling** | Vanilla CSS with custom design system |
| **Backend** | Next.js API Routes |
| **Database** | PostgreSQL via Prisma ORM |
| **Authentication** | NextAuth.js with JWT |
| **Validation** | Zod |
| **State Management** | TanStack Query (React Query) |
| **Charts** | Recharts |
| **Barcode Scanning** | html5-qrcode |

---

## 📁 Project Structure

```
inventory/
├── prisma/
│   └── schema.prisma          # Database schema
├── public/                    # Static assets
├── src/
│   ├── app/
│   │   ├── (auth)/            # Login, Register pages
│   │   ├── (dashboard)/       # Protected app pages
│   │   │   ├── products/
│   │   │   ├── inventory/
│   │   │   ├── transfers/
│   │   │   ├── pos/
│   │   │   ├── purchases/
│   │   │   ├── customers/
│   │   │   ├── suppliers/
│   │   │   ├── expenses/
│   │   │   ├── returns/
│   │   │   ├── reports/
│   │   │   └── settings/
│   │   └── api/               # API endpoints
│   ├── components/
│   │   ├── ui/                # Base components
│   │   ├── forms/
│   │   ├── tables/
│   │   └── charts/
│   ├── hooks/                 # Custom React hooks
│   ├── lib/                   # Utilities (prisma, auth, etc.)
│   └── types/                 # TypeScript types
└── tests/
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd inventory
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` with your database URL:
   ```
   DATABASE_URL="postgresql://user:password@localhost:5432/inventory"
   NEXTAUTH_SECRET="your-secret-key"
   NEXTAUTH_URL="http://localhost:3000"
   ```

4. **Set up database**
   ```bash
   npx prisma migrate dev --name init
   npx prisma generate
   ```

5. **Seed initial data** (optional)
   ```bash
   npm run seed
   ```

6. **Run development server**
   ```bash
   npm run dev
   ```

7. Open [http://localhost:3000](http://localhost:3000)

---

## 📊 Database Schema

```mermaid
erDiagram
    User ||--o{ Sale : creates
    User ||--o{ PurchaseOrder : creates
    User }o--|| Role : has
    
    Location ||--o{ StockLevel : contains
    Location ||--o{ Sale : "occurs at"
    
    Category ||--o{ Product : contains
    Product ||--o{ ProductVariant : "has variants"
    Product ||--o{ StockLevel : tracked
    
    Customer ||--o{ Sale : purchases
    Supplier ||--o{ PurchaseOrder : fulfills
    
    Sale ||--o{ SaleItem : contains
    Sale ||--o{ Return : "returned from"
```

---

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run e2e tests
npm run test:e2e

# Run with coverage
npm run test:coverage
```

---

## 📦 Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run prisma:studio` | Open Prisma Studio (DB GUI) |
| `npm run seed` | Seed database with sample data |

---

## 🔐 Default Users

After seeding, use these credentials:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@example.com | admin123 |
| Manager | manager@example.com | manager123 |
| Staff | staff@example.com | staff123 |

---

## 📄 License

MIT License - See [LICENSE](LICENSE) for details.

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
