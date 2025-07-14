# API Documentation

> Base URL: `http://localhost:3000/api/v1`
> Replace `{{API_URL}}` with `http://localhost:3000/api/v1` in all endpoints.

---

##  Auth

###  Signup – Send OTP

`POST {{API_URL}}/auth/signup/send-otp`

**Body:**

```json
{
  "email": "bagbanikram@gmail.com"
}
```

🔸 Sends an OTP to the provided email.

---

###  Signup – Verify OTP

`POST {{API_URL}}/auth/signup/verify`

**Body:**

```json
{
  "name": "Ikram",
  "email": "bagbanikram@gmail.com",
  "accountType": "FREEMIUM", // or "PREMIUM"
  "role": "PATIENT", // or "CAREGIVER", "DEPENDENT"
  "otp": "123456"
}
```

---

###  Login – Send OTP

`POST {{API_URL}}/auth/login/send-otp`

**Body:**

```json
{
  "email": "bagbanikram@gmail.com"
}
```

🔸 Sends an OTP to the provided email.

---

###  Login – Verify OTP

`POST {{API_URL}}/auth/login/verify`

**Body:**

```json
{
  "email": "bagbanikram@gmail.com",
  "otp": "880643"
}
```

---

##  Records

###  Upload Record URL

`POST {{API_URL}}/records/upload-url`

**Body:**

```json
{
  "title": "Blood Test Report",
  "type": "LAB_REPORT", 
  "language": "en", 
  "tags": ["blood", "cholesterol", "diabetes"],
  "recordDate": "2024-07-06T10:30:00.000Z",
  "fileName": "Ikrambagban-cv.pdf",
  "fileSize": 137991,
  "mimeType": "application/pdf"
}
```

🔸 Returns:

```json
{
  "uploadUrl": "https://s3-upload-url...",
  "fileKey": "s3-file-key"
}
```

 Use the `uploadUrl` to upload the file via a `PUT` request to S3.

---

###  Get All Records

`GET {{API_URL}}/records`

🔹 Optional Query Parameters:

```
type, dateFrom, dateTo, tags, userId, page=1, limit=10
```

📌 Example:

```
GET {{API_URL}}/records?type=LAB_REPORT&tags=blood
```

---

###  Get Single Record

`GET {{API_URL}}/records/:id`

---

###  Delete Record

`DELETE {{API_URL}}/records/:id`
🔸 Performs a **soft delete** on the record.

---

##  Caregiver Requests

###  Send Caregiver Request

`POST {{API_URL}}/caregiver/request`

**Body:**

```json
{
  "email": "bagbanikram@gmail.com"
}
```

 User must be of type `CAREGIVER`.

---

###  Approve/Reject Caregiver Request

`PATCH {{API_URL}}/caregiver/approve`

**Body:**

```json
{
  "status": "APPROVED", // or "REJECTED"
  "requestId": "cmd0iruyk001vv7k4opf2furz"
}
```

 User must be `PATIENT` or `DEPENDENT`.

---

###  Get My Caregiver Requests

`GET {{API_URL}}/caregiver/requests`

---

##  Emergency Records

###  Generate Emergency Record

`POST {{API_URL}}/emergency/generate`

**Body:**

```json
{
  "title": "this is the title of emergency",
  "description": "this is the description of emergency",
  "recordIds": [
    "cmctda0yt000nv7hsdy0xtgdz",
    "cmctda0yt000ov7hs34ssvtmi",
    "cmctda0yt000pv7hs0o34abxr"
  ]
}
```

📌 User must be `PATIENT` or `DEPENDENT`.

---

###  Get Emergency Record by QR

`GET {{API_URL}}/emergency/:qrToken`

---

##  OCR (Text Extraction)

###  Upload OCR File

`POST {{API_URL}}/ocr/upload`

**Body:**

```json
{
  "fileName": "ikram.pdf",
  "fileSize": 133991,
  "mimeType": "application/pdf"
}
```

It returns a pre-signed URL. Use it in a `PUT` request to upload the file.
After processing, the extracted data is saved in the database.

---

### Get OCR Results

`GET {{API_URL}}/ocr`

---

## User Info

### Get Logged-in User Info

`GET {{API_URL}}/me`
