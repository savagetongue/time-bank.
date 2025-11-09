# ChronoBank: A Modern Time-Banking Platform

[cloudflarebutton]

ChronoBank is a sophisticated, minimalist time-banking and skill-sharing platform. It enables users to offer their skills and services in exchange for time credits, rather than traditional currency. The platform features a complete ecosystem including user authentication, service offer creation, a secure booking system with an escrow mechanism, a detailed ledger for tracking transactions, a rating and review system, and an admin-moderated dispute resolution process.

The entire application is built on a modern, serverless architecture using Cloudflare Workers for the backend API and a responsive React single-page application for the frontend, ensuring a fast, secure, and scalable user experience.

## Key Features

- **User Authentication:** Secure registration and login for members and service providers.
- **Offer Management:** Providers can create, edit, and manage their service offerings.
- **Secure Booking System:** Members can request services and book providers through a secure workflow.
- **Time Credit Escrow:** Time credits are held in escrow during a booking and released upon completion, ensuring fair exchange.
- **Transactional Ledger:** A detailed ledger tracks all time credit transactions (debits, credits, adjustments) for each user.
- **Ratings & Reviews:** A feedback system for members to rate and review providers after a completed service.
- **Dispute Resolution:** An integrated system for raising and resolving disputes, moderated by administrators.
- **Admin Panel:** A dedicated interface for administrators to manage disputes, adjust ledgers, and oversee the platform.

## Technology Stack

- **Frontend:** React, Vite, React Router, Zustand, Tailwind CSS, shadcn/ui
- **Backend:** Cloudflare Workers, Hono
- **Database:** MySQL
- **Tooling:** TypeScript, Wrangler, Bun

## Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

- [Bun](https://bun.sh/) installed on your machine.
- Access to a MySQL database.

### Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd chronobank
    ```

2.  **Install dependencies:**
    ```bash
    bun install
    ```

3.  **Configure local environment variables:**

    Create a `.dev.vars` file in the root of the project. This file is used by Wrangler for local development. **Do not commit this file to version control.**

    ```ini
    # .dev.vars

    DB_HOST="your_database_host"
    DB_PORT="3306"
    DB_USER="your_database_user"
    DB_PASS="your_database_password"
    DB_NAME="your_database_name"
    WORKER_API_KEY="generate_a_strong_random_key"
    ```

### Running the Application

To run the application in development mode, which starts both the Vite frontend and the Cloudflare Worker backend:

```bash
bun dev
```

The application will be available at `http://localhost:3000` (or the port specified in your environment).

## Deployment

This project is designed for easy deployment to the Cloudflare network.

### 1. Configure Secrets

Before deploying, you must add your database credentials and API key as secrets to your Cloudflare Worker. **Do not use the `.dev.vars` file for production.**

Use the `wrangler secret put` command for each variable:

```bash
wrangler secret put DB_HOST
wrangler secret put DB_PORT
wrangler secret put DB_USER
wrangler secret put DB_PASS
wrangler secret put DB_NAME
wrangler secret put WORKER_API_KEY
```

You will be prompted to enter the value for each secret securely.

### 2. Deploy

Once your secrets are configured, deploy the application with a single command:

```bash
bun deploy
```

Alternatively, you can deploy directly from your GitHub repository using the button below.

[cloudflarebutton]

## License

This project is licensed under the MIT License.