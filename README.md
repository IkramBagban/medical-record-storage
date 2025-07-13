# Medical Records Backend - Setup Instructions

## Prerequisites

Make sure the following tools are installed on your system:

* **Docker**
* **Docker Compose**
---

## API Setup

### 1. Navigate to the API directory

```bash
cd api
```

### 2. Create environment file

```bash
cp .env.example .env
```


---

### 3. Build the Docker image

```bash
docker build -t medical-records-backend-dev . -f docker/Dockerfile.dev
```

### 4. Run the Docker container

```bash
docker run --env-file .env -d -p 3000:3000 medical-records-backend-dev
```

### 5. Run Database Migrations

Run this inside the running container:

```bash
docker exec -it <container_id> sh
pnpm run db:migrate
```

Replace `<container_id>` with the actual ID of your running container.

---

### Docker Compose

```bash
docker-compose up --build
```

> ⚠️ **OCR feature will not work if you use local database**, as it requires a live database connection.
> To enable OCR, use a hosted DB like **NeonDB**.
> Create a database on Neon and update the `.env` file with the provided database URL.

---

## OCR Worker - Serverless Setup

### 1. Navigate to the OCR worker

```bash
cd ocr-worker
cp .env.example .env
```

### 2. Login to Serverless

```bash
pnpm serverless login
```

### 3. Deploy the OCR service

```bash
pnpm run db:generate
pnpm run deploy
```

### 4. Configure S3 Bucket Notification (if not set automatically):

Go to:
**AWS Console > S3 > Your Bucket > Properties > Event Notifications > Create Notification**

Fill in the following:

* **Event Name**: `ocr-event`
* **Prefix**: `ocr-files/`
* **Suffix**: *(leave empty)*
* **Destination**: Select `SQS`
* Choose `OcrQueue` from the dropdown

---

## Running Tests

### 1. Navigate to API

```bash
cd api
```

### 2. Add all required variables in `.env`

### 3. Run tests

```bash
pnpm run test
```
> test might fail because of timeout
