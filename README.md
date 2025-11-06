# Preferred Solutions Transport - Delivery Platform

A modern, full-service delivery platform built with Next.js, Supabase, and Stripe. This platform provides end-to-end delivery management from quote request to proof of delivery.

## 🎯 Core Features

### Customer Experience
- **Quote Request**: Distance-based pricing with automatic Google Maps distance calculation
- **Secure Payments**: Stripe integration with webhook automation
- **Order Tracking**: Live map tracking with driver location and ETA
- **Track Portal**: Public order lookup for customers and guests
- **Customer Dashboard**: Order history and active order management

### Operations & Management
- **Dispatcher Queue**: Real-time view of orders ready for dispatch
- **Driver Assignment**: Dispatchers can assign available drivers to orders
- **Driver Dashboard**: Drivers can view assigned orders and update their status
- **Admin Dashboard**: Complete management interface for users, drivers, orders, pricing, logs, and system health checks
- **Order Management**: Automatic order creation after successful payment

### Real-Time Features & Notifications
- **📧 Email Notifications**: Automated emails via HubSpot for order confirmation, driver assignment, and status updates
- **🗺️ Live Driver Tracking**: Real-time Google Maps integration showing driver location with automatic ETA calculation
- **📱 PWA Support**: Installable mobile app with offline capabilities and background sync

### Integrations & Infrastructure
- **HubSpot Sync**: Automatic contact and deal creation with configurable pipelines and stages
- **Database**: Full audit trail and event logging with Row Level Security
- **API Infrastructure**: Rate limiting, validation, and comprehensive endpoints
- **Deployment Ready**: Vercel deployment configuration included

## 🛠 Tech Stack

- **Frontend**: Next.js 15 (App Router) + TypeScript + Tailwind CSS + PWA
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Database**: Supabase (PostgreSQL with Row Level Security)
- **Auth**: Supabase Auth with @supabase/ssr
- **Maps**: Google Maps via @react-google-maps/api
- **Payments**: Stripe Checkout + Webhooks
- **CRM**: HubSpot API integration
- **Deployment**: Vercel

## 🚀 Getting Started

### 1. Prerequisites
- Node.js v20+
- npm v10+
- Supabase account
- Stripe account
- Google Maps API key
- HubSpot account (optional)

### 2. Initial Setup
Clone the repository and install dependencies:
```bash
git clone <repository-url>
cd preferredsolutionstransport
npm install
```

### 3. Environment Configuration
Copy the example environment file and fill in your credentials.
```bash
cp env.example .env.local
```
See `env.example` for a full list of required and optional variables.

### 4. Database Setup
For a new project, follow the detailed **[Supabase Setup Guide](docs/SUPABASE_SETUP.md)**. This guide will walk you through setting up your database schema, roles, and storage from scratch.

### 5. Run Development Server
```bash
npm run dev
```
The application will be available at `http://localhost:3000`.

### 6. Test Users
To test the different roles, you'll need to create test users. Follow the **[Test Users Setup Guide](docs/TESTING.md#test-users-setup)** to create admin, dispatcher, driver, and customer users.

## 📚 Documentation

This project's documentation is organized into several key areas to help you find the information you need.

- **[Architecture](docs/ARCHITECTURE.md)**: A deep dive into the data flow, HubSpot integration, and overall system architecture.
- **[Deployment](docs/DEPLOYMENT.md)**: Guides for deploying to Vercel, including setup, configuration, and troubleshooting common issues.
- **[Supabase Setup](docs/SUPABASE_SETUP.md)**: A detailed guide for setting up your Supabase project from scratch.
- **[Implementation Details](docs/IMPLEMENTATION.md)**: Technical explanations of key features like authentication, HubSpot sync, and real-time functionality.
- **[Proof of Delivery](docs/PROOF_OF_DELIVERY.md)**: A guide to the proof of delivery system.
- **[Testing Guide](docs/TESTING.md)**: A comprehensive guide to testing the application, including setting up test users, end-to-end flows, and integration testing.
- **[Contributing Guide](CONTRIBUTING.md)**: Guidelines for contributing to the project, including dependency management, Git workflow, and code style.
- **[Design System](DESIGN_SYSTEM.md)**: Documentation for the UI components, styling, and design principles.

## 📝 License
This project is licensed under the MIT License.
