import request from "supertest";
import app, { server } from "..";
import { prisma } from "../utils/db";
import { generateToken } from "../utils/jwt";

describe("Records API", () => {
  let patientToken: string;
  let caregiverToken: string;
  let patientId: string;
  let caregiverId: string;
  let recordId: string;

  beforeAll(async () => {
    await prisma.record.deleteMany();
    await prisma.caregiverRequest.deleteMany();
    await prisma.user.deleteMany();
    const [patient, caregiver] = await prisma.$transaction([
      prisma.user.create({
        data: {
          email: "patient@test.com",
          name: "Test Patient",
          accountType: "FREEMIUM",
          role: "PATIENT",
        },
      }),

      prisma.user.create({
        data: {
          email: "caregiver@test.com",
          name: "Test Caregiver",
          accountType: "PREMIUM",
          role: "CAREGIVER",
        },
      }),
    ]);
    console.log("Patient and caregiver created: ", {
      patientId: patient.id,
      caregiverId: caregiver.id,
    });

    patientId = patient.id;
    caregiverId = caregiver.id;

    patientToken = generateToken({
      id: patient.id,
      email: patient.email,
      role: patient.role,
    });

    caregiverToken = generateToken({
      id: caregiver.id,
      email: caregiver.email,
      role: caregiver.role,
    });

    await prisma.caregiverRequest.create({
      data: {
        caregiverId,
        patientId,
        status: "APPROVED",
      },
    });
  }, 30000); 

  afterAll(async () => {
    await prisma.record.deleteMany();
    await prisma.caregiverRequest.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
    server.close();
  });

  describe("POST /records/upload-url", () => {
    it("should generate upload URL for valid request", async () => {
      const uploadData = {
        title: "Blood Test Report",
        type: "LAB_REPORT",
        language: "en",
        tags: ["blood", "cholesterol"],
        recordDate: "2024-07-06T10:30:00.000Z",
        fileName: "blood_test.pdf",
        fileSize: 2048576,
        mimeType: "application/pdf",
      };

      const response = await request(app)
        .post("/api/v1/records/upload-url")
        .set("Authorization", `Bearer ${patientToken}`)
        .send(uploadData);
      console.log(
        "upload-url Response body: ================================ ",
        response.body
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.uploadUrl).toBeDefined();
      expect(response.body.fileKey).toBeDefined();
      expect(response.body.fileKey).toMatch(/^medical-records\//);
    });

    it("should reject invalid file type", async () => {
      const uploadData = {
        title: "Malicious File",
        type: "OTHER",
        language: "en",
        tags: [],
        recordDate: "2024-07-06T10:30:00.000Z",
        fileName: "malicious.exe",
        fileSize: 1024,
        mimeType: "application/x-executable",
      };

      const response = await request(app)
        .post("/api/v1/records/upload-url")
        .set("Authorization", `Bearer ${patientToken}`)
        .send(uploadData);
      console.log(
        "should reject invalid file type Response body: ================================ ",
        response.body
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain(
        "Invalid file type. Only images, PDFs, and text files are allowed"
      );
    });

    it("should reject file size too large", async () => {
      const uploadData = {
        title: "Large File",
        type: "OTHER",
        language: "en",
        tags: [],
        recordDate: "2024-07-06T10:30:00.000Z",
        fileName: "large.pdf",
        fileSize: 15 * 1024 * 1024, // 15MB
        mimeType: "application/pdf",
      };

      const response = await request(app)
        .post("/api/v1/records/upload-url")
        .set("Authorization", `Bearer ${patientToken}`)
        .send(uploadData);
      console.log(
        "should reject file size too large Response body: ================================ ",
        response.body
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain(
        "File size too large. Maximum size is 10MB"
      );
    });

    it("should require authentication", async () => {
      const response = await request(app)
        .post("/api/v1/records/upload-url")
        .send({});

      expect(response.status).toBe(401);
    });
  });

  describe("POST /records/upload", () => {
    it("should create record after successful upload", async () => {
      const uploadData = {
        title: "X-Ray Report",
        type: "SCAN",
        language: "en",
        tags: ["chest", "x-ray"],
        recordDate: "2024-07-06T10:30:00.000Z",
        fileName: "chest_xray.jpg",
        fileSize: 1024576,
        mimeType: "image/jpeg",
        fileKey: "medical-records/test/1720261800000_abc123.jpg",
      };

      const response = await request(app)
        .post("/api/v1/records/upload")
        .set("Authorization", `Bearer ${patientToken}`)
        .send(uploadData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.record).toBeDefined();
      expect(response.body.record.title).toBe("X-Ray Report");
      expect(response.body.record.type).toBe("SCAN");
      expect(response.body.record.ownerId).toBe(patientId);
      expect(response.body.record.uploaderId).toBe(patientId);

      recordId = response.body.record.id;
    });

    it("should allow caregiver to upload for patient", async () => {
      const uploadData = {
        title: "Prescription",
        type: "PRESCRIPTION",
        language: "en",
        tags: ["medication", "diabetes"],
        recordDate: "2024-07-06T10:30:00.000Z",
        fileName: "prescription.pdf",
        fileSize: 512000,
        mimeType: "application/pdf",
        fileKey: "medical-records/test/1720261800001_def456.pdf",
        ownerId: patientId,
      };

      const response = await request(app)
        .post("/api/v1/records/upload")
        .set("Authorization", `Bearer ${caregiverToken}`)
        .send(uploadData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.record.ownerId).toBe(patientId);
      expect(response.body.record.uploaderId).toBe(caregiverId);
    });

    it("should reject caregiver without access", async () => {
      const anotherPatient = await prisma.user.create({
        data: {
          email: "another@test.com",
          name: "Another Patient",
          accountType: "FREEMIUM",
          role: "PATIENT",
        },
      });

      const uploadData = {
        title: "Unauthorized Upload",
        type: "OTHER",
        language: "en",
        tags: [],
        recordDate: "2024-07-06T10:30:00.000Z",
        fileName: "test.pdf",
        fileSize: 1024,
        mimeType: "application/pdf",
        fileKey: "medical-records/test/unauthorized.pdf",
        ownerId: anotherPatient.id,
      };

      const response = await request(app)
        .post("/api/v1/records/upload")
        .set("Authorization", `Bearer ${caregiverToken}`)
        .send(uploadData);

      expect(response.status).toBe(403);
      expect(response.body.error).toContain(
        "You don't have access to upload records for this patient"
      );

      await prisma.user.delete({ where: { id: anotherPatient.id } });
    });

    it("should require fileKey", async () => {
      const uploadData = {
        title: "Missing File Key",
        type: "OTHER",
        language: "en",
        tags: [],
        recordDate: "2024-07-06T10:30:00.000Z",
        fileName: "test.pdf",
        fileSize: 1024,
        mimeType: "application/pdf",
      };

      const response = await request(app)
        .post("/api/v1/records/upload")
        .set("Authorization", `Bearer ${patientToken}`)
        .send(uploadData);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("File key is required");
    });
  });
});
