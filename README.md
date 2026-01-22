# Salão24h API

Backend API for the Salão24h multi-tenant SaaS platform for beauty salon management.

## Quick Start

1. **Configure Database**
   ```bash
   # Create PostgreSQL database
   createdb salao24h
   ```

2. **Configure Environment**
   ```bash
   # Copy and edit .env file
   cp .env.example .env
   # Edit DB_USER, DB_PASSWORD, etc.
   ```

3. **Install Dependencies**
   ```bash
   npm install
   ```

4. **Seed Database**
   ```bash
   node src/seeders/seed.js
   ```

5. **Start Server**
   ```bash
   npm run dev
   ```

## Login Credentials

| User | Email | Password |
|------|-------|----------|
| Super Admin | admin@salao24h.com | admin |
| Gerente | gerente@salao24h.com | 123 |
| Concierge | concierge@salao24h.com | 123 |
| Profissional | fernanda@salao24h.com | 123 |

## API Endpoints

- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register new tenant
- `GET /api/auth/me` - Get current user
- `GET /api/plans` - List plans
- `GET /api/clients` - List clients (tenant-scoped)
- `GET /api/professionals` - List professionals
- `GET /api/services` - List services
- `GET /api/appointments` - List appointments
- `GET /api/finance` - List transactions
- `GET /api/admin/training-videos` - Training videos
- `GET /api/admin/banners` - Ad banners

## Architecture

```
src/
├── config/        # Database, CORS, app config
├── models/        # Sequelize models
├── features/      # Feature-based modules
│   ├── Auth/      # Authentication & JWT
│   ├── User/      # User management
│   ├── Tenant/    # Tenant (salon) management
│   ├── Plan/      # Subscription plans
│   ├── SuperAdmin/ # Training & Ads
│   ├── Client/    # Client management
│   ├── Professional/
│   ├── Service/
│   ├── Appointment/
│   └── Finance/
├── services/      # External integrations
│   ├── whatsapp.service.js
│   ├── ai.service.js
│   └── payment.service.js
└── routes/        # Central route mounting
```

## Multi-tenancy

All tenant-scoped data is filtered by `tenant_id`. The auth middleware injects:
- `req.userId` - Current user ID
- `req.tenantId` - Current tenant ID
- `req.isSuperAdmin` - Super admin flag
- `req.userRole` - User role
- `req.plan` - Tenant's plan with feature flags
