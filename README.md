# HealthAssist - Healthcare Appointment Management System

HealthAssist is a comprehensive web application for managing healthcare appointments, specialists, and patient information.

## Features

- User authentication (login/signup)
- Role-based access (Admin/Normal users)
- Appointment scheduling and management
- Specialist profiles
- Health checkup services
- Email notifications
- Secure payment processing with Stripe
- Health information resources

## Deployment with Docker

### Prerequisites

- Docker and Docker Compose installed on your system
- Gmail account with App Password enabled
- Stripe account for payment processing

### Setup Steps

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd healthassist
   ```

2. **Create environment file**

   Copy the example environment file and fill in your details:

   ```bash
   cp .env.example .env
   ```

   Update the `.env` file with your actual credentials:
   - Database credentials (you can keep the defaults for local development)
   - Gmail email and app password
   - Stripe secret key

3. **Build and start the containers**

   ```bash
   docker-compose up -d --build
   ```

   This will:
   - Build the application image
   - Start the PostgreSQL database
   - Start the web application
   - Connect all the services together

4. **Access the application**

   Once the containers are running, you can access the application at:
   
   ```
   http://localhost:5000
   ```

5. **View logs**

   To view the application logs:

   ```bash
   docker-compose logs -f web
   ```

### Stopping the Application

To stop the application:

```bash
docker-compose down
```

To stop and remove all data volumes (database data will be lost):

```bash
docker-compose down -v
```

## Default Admin Login

- Username: admin
- Password: admin123

## License

[Specify your license here]

## Contributors

[List contributors here]