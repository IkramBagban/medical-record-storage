import request from "supertest";
import app, { server } from "..";
import { prisma } from "../utils/db";
import { generateToken } from "../utils/jwt";
import { cleanupAllTables, multilingualTestData } from "./helpers/common";
import { PlanLimitStatus, SubscriptionStatus } from "@prisma/client";

jest.mock("../services/s3", () => ({
  s3Service: {
    generateUploadUrl: jest
      .fn()
      .mockResolvedValue("https://mock-upload-url.com"),
    getDownloadUrl: jest
      .fn()
      .mockReturnValue("https://mock-download-url.com/file.pdf"),
    generateFileKey: jest.fn().mockReturnValue("mock-key"),
    verifyFileExists: jest.fn().mockResolvedValue(true),
    getFileSize: jest.fn().mockResolvedValue(1234),
    deleteFile: jest.fn().mockResolvedValue(undefined),
  },
}));

describe("Records API", () => {
  let patientToken: string;
  let caregiverToken: string;
  let patientId: string;
  let caregiverId: string;
  let recordId: string;

  beforeAll(async () => {
    await cleanupAllTables();
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

    await prisma.$transaction([
      prisma.subscription.create({
        data: {
          userId: patient.id,
          planType: patient.accountType,
          status: SubscriptionStatus.ACTIVE,
          planLimit: {
            create: {
              totalRecords: 0,
              status: PlanLimitStatus.ACTIVE,
              userId: patient.id,
            },
          },
        },
      }),
      prisma.subscription.create({
        data: {
          userId: caregiver.id,
          planType: caregiver.accountType,
          status: SubscriptionStatus.ACTIVE,
          planLimit: {
            create: {
              totalRecords: 0,
              status: PlanLimitStatus.ACTIVE,
              userId: caregiver.id,
            },
          },
        },
      }),
    ]);

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
    await cleanupAllTables;
    await prisma.$disconnect();
    server.close();
  });

  describe("Multilingual Records API", () => {
    let multilingualRecordIds: string[] = [];

    beforeAll(async () => {
      await prisma.record.deleteMany({
        where: {
          OR: multilingualTestData.map((data) => ({
            title: data.title,
          })),
        },
      });
    });

    afterAll(async () => {
      if (multilingualRecordIds.length > 0) {
        await prisma.record.deleteMany({
          where: {
            id: {
              in: multilingualRecordIds,
            },
          },
        });
      }
    });

    describe("POST /records/upload-url - Multilingual Support", () => {
      it("should generate upload URL for Spanish metadata", async () => {
        const spanishData = multilingualTestData[0];
        const uploadData = {
          title: spanishData.title,
          type: spanishData.type,
          language: spanishData.language,
          tags: spanishData.tags,
          recordDate: "2024-07-06T10:30:00.000Z",
          fileName: spanishData.fileName,
          fileSize: 2048576,
          mimeType: "application/pdf",
        };

        const response = await request(app)
          .post("/api/v1/records/upload-url")
          .set("Cookie", `authToken=${patientToken}`)
          .send(uploadData);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.uploadUrl).toBeDefined();
        expect(response.body.fileKey).toBeDefined();
      }, 10000);

      it("should generate upload URL for Arabic metadata (RTL)", async () => {
        const arabicData = multilingualTestData[9];
        const uploadData = {
          title: arabicData.title,
          type: arabicData.type,
          language: arabicData.language,
          tags: arabicData.tags,
          recordDate: "2024-07-06T10:30:00.000Z",
          fileName: arabicData.fileName,
          fileSize: 1024576,
          mimeType: "application/pdf",
        };

        const response = await request(app)
          .post("/api/v1/records/upload-url")
          .set("Cookie", `authToken=${patientToken}`)
          .send(uploadData);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.uploadUrl).toBeDefined();
        expect(response.body.fileKey).toBeDefined();
      }, 10000);

      it("should generate upload URL for Japanese metadata", async () => {
        const japaneseData = multilingualTestData[6];
        const uploadData = {
          title: japaneseData.title,
          type: japaneseData.type,
          language: japaneseData.language,
          tags: japaneseData.tags,
          recordDate: "2024-07-06T10:30:00.000Z",
          fileName: japaneseData.fileName,
          fileSize: 1024576,
          mimeType: "application/pdf",
        };

        const response = await request(app)
          .post("/api/v1/records/upload-url")
          .set("Cookie", `authToken=${patientToken}`)
          .send(uploadData);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.uploadUrl).toBeDefined();
        expect(response.body.fileKey).toBeDefined();
      }, 10000);

      it("should handle special characters in filenames", async () => {
        const germanData = multilingualTestData[2];
        const uploadData = {
          title: germanData.title,
          type: germanData.type,
          language: germanData.language,
          tags: germanData.tags,
          recordDate: "2024-07-06T10:30:00.000Z",
          fileName: germanData.fileName, // Contains 'ö' character
          fileSize: 1024576,
          mimeType: "image/jpeg",
        };

        const response = await request(app)
          .post("/api/v1/records/upload-url")
          .set("Cookie", `authToken=${patientToken}`)
          .send(uploadData);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.uploadUrl).toBeDefined();
        expect(response.body.fileKey).toBeDefined();
      }, 10000);
    });

    describe("POST /records/upload - Multilingual Records Creation", () => {
      it("should create records with multilingual metadata", async () => {
        for (const testData of multilingualTestData) {
          const uploadData = {
            title: testData.title,
            type: testData.type,
            language: testData.language,
            tags: testData.tags,
            recordDate: "2024-07-06T10:30:00.000Z",
            fileName: testData.fileName,
            fileSize: 1024576,
            mimeType:
              testData.type === "SCAN" ? "image/jpeg" : "application/pdf",
            fileKey: `medical-records/test/multilingual_${testData.language}_${Date.now()}.${testData.type === "SCAN" ? "jpg" : "pdf"}`,
            description: testData.description,
          };

          const response = await request(app)
            .post("/api/v1/records/upload")
            .set("Cookie", `authToken=${patientToken}`)
            .send(uploadData);

          expect(response.status).toBe(201);
          expect(response.body.success).toBe(true);
          expect(response.body.record).toBeDefined();
          expect(response.body.record.title).toBe(testData.title);
          expect(response.body.record.language).toBe(testData.language);
          expect(response.body.record.tags).toEqual(testData.tags);
          expect(response.body.record.fileName).toBe(testData.fileName);

          multilingualRecordIds.push(response.body.record.id);
        }
      }, 100000);

      it("should handle mixed language tags", async () => {
        const mixedLanguageData = {
          title: "Mixed Language Medical Report",
          type: "OTHER",
          language: "en",
          tags: ["blood", "sangre", "血液", "دم", "кровь"],
          recordDate: "2024-07-06T10:30:00.000Z",
          fileName: "mixed_language_report.pdf",
          fileSize: 1024576,
          mimeType: "application/pdf",
          fileKey: `medical-records/test/mixed_${Date.now()}.pdf`,
        };

        const response = await request(app)
          .post("/api/v1/records/upload")
          .set("Cookie", `authToken=${patientToken}`)
          .send(mixedLanguageData);

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.record.tags).toEqual(mixedLanguageData.tags);

        multilingualRecordIds.push(response.body.record.id);
      }, 100000);
    });

    describe("GET /records - Multilingual Filtering", () => {
      it("should search records by multilingual tags", async () => {
        const response = await request(app)
          .get("/api/v1/records?tags=血液")
          .set("Cookie", `authToken=${patientToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.records).toBeDefined();

        const foundRecord = response.body.records.find((r: any) =>
          r.tags.includes("血液"),
        );
        expect(foundRecord).toBeDefined();
      }, 10000);

      it("should search records by Arabic tags", async () => {
        const response = await request(app)
          .get("/api/v1/records?tags=دم")
          .set("Cookie", `authToken=${patientToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.records).toBeDefined();

        const foundRecord = response.body.records.find((r: any) =>
          r.tags.includes("دم"),
        );
        expect(foundRecord).toBeDefined();
      }, 10000);

      it("should search records by title in different languages", async () => {
        const response = await request(app)
          .get("/api/v1/records?search=血液検査")
          .set("Cookie", `authToken=${patientToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.records).toBeDefined();

        const foundRecord = response.body.records.find((r: any) =>
          r.title.includes("血液検査"),
        );
        expect(foundRecord).toBeDefined();
      }, 50000);

      it("should handle special characters in search", async () => {
        const response = await request(app)
          .get("/api/v1/records?search=röntgen")
          .set("Cookie", `authToken=${patientToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.records).toBeDefined();

        const foundRecord = response.body.records.find((r: any) =>
          r.title.toLowerCase().includes("röntgen"),
        );
        expect(foundRecord).toBeDefined();
      }, 50000);
    });

    describe("GET /records/:id - Multilingual Record Retrieval", () => {
      it("should retrieve record with Chinese metadata", async () => {
        const chineseRecordId = multilingualRecordIds[8]; // Chinese record
        const response = await request(app)
          .get(`/api/v1/records/${chineseRecordId}`)
          .set("Cookie", `authToken=${patientToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.record).toBeDefined();
        expect(response.body.record.title).toBe("CT扫描报告");
        expect(response.body.record.language).toBe("zh");
        expect(response.body.record.tags).toContain("CT");
      }, 10000);

      it("should retrieve record with Hindi metadata", async () => {
        const hindiRecordId = multilingualRecordIds[10]; // Hindi record
        const response = await request(app)
          .get(`/api/v1/records/${hindiRecordId}`)
          .set("Cookie", `authToken=${patientToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.record).toBeDefined();
        expect(response.body.record.title).toBe("एक्स-रे रिपोर्ट");
        expect(response.body.record.language).toBe("hi");
        expect(response.body.record.tags).toContain("एक्स-रे");
      }, 10000);

      it("should retrieve record with Thai metadata", async () => {
        const thaiRecordId = multilingualRecordIds[11]; // Thai record
        const response = await request(app)
          .get(`/api/v1/records/${thaiRecordId}`)
          .set("Cookie", `authToken=${patientToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.record).toBeDefined();
        expect(response.body.record.title).toBe("ผลตรวจเลือด");
        expect(response.body.record.language).toBe("th");
        expect(response.body.record.tags).toContain("เลือด");
      }, 10000);
    });

    describe("Multilingual Data Validation", () => {
      it("should validate minimum title length for multilingual content", async () => {
        const uploadData = {
          title: "短", // Very short Chinese title
          type: "OTHER",
          language: "zh",
          tags: ["测试"],
          recordDate: "2024-07-06T10:30:00.000Z",
          fileName: "test.pdf",
          fileSize: 1024,
          mimeType: "application/pdf",
          fileKey: "medical-records/test/short_title.pdf",
        };

        const response = await request(app)
          .post("/api/v1/records/upload")
          .set("Cookie", `authToken=${patientToken}`)
          .send(uploadData);

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      }, 10000);

      it("should handle very long multilingual titles", async () => {
        const longTitle =
          "详细的医学检查报告包括血液检查、尿液检查、心电图检查、胸部X光检查以及其他各种医学检查项目的综合分析报告文档";
        const uploadData = {
          title: longTitle,
          type: "LAB_REPORT",
          language: "zh",
          tags: ["详细", "检查", "综合"],
          recordDate: "2024-07-06T10:30:00.000Z",
          fileName: "详细检查报告.pdf",
          fileSize: 1024576,
          mimeType: "application/pdf",
          fileKey: "medical-records/test/long_title.pdf",
        };

        const response = await request(app)
          .post("/api/v1/records/upload")
          .set("Cookie", `authToken=${patientToken}`)
          .send(uploadData);

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.record.title).toBe(longTitle);

        multilingualRecordIds.push(response.body.record.id);
      });

      it("should handle emoji in metadata", async () => {
        const uploadData = {
          title: "Heart Health Report ❤️ 心脏健康报告",
          type: "LAB_REPORT",
          language: "en",
          tags: ["heart", "❤️", "健康", "report"],
          recordDate: "2024-07-06T10:30:00.000Z",
          fileName: "heart_report_❤️.pdf",
          fileSize: 1024576,
          mimeType: "application/pdf",
          fileKey: "medical-records/test/emoji_test.pdf",
        };

        const response = await request(app)
          .post("/api/v1/records/upload")
          .set("Cookie", `authToken=${patientToken}`)
          .send(uploadData);

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.record.title).toContain("❤️");
        expect(response.body.record.tags).toContain("❤️");

        multilingualRecordIds.push(response.body.record.id);
      }, 10000);
    });

    describe("Multilingual Edge Cases", () => {
      it("should handle empty tags array with multilingual titles", async () => {
        const uploadData = {
          title: "Пустые теги тест",
          type: "OTHER",
          language: "ru",
          tags: [],
          recordDate: "2024-07-06T10:30:00.000Z",
          fileName: "пустые_теги.pdf",
          fileSize: 1024,
          mimeType: "application/pdf",
          fileKey: "medical-records/test/empty_tags.pdf",
        };

        const response = await request(app)
          .post("/api/v1/records/upload")
          .set("Cookie", `authToken=${patientToken}`)
          .send(uploadData);

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.record.tags).toEqual([]);

        multilingualRecordIds.push(response.body.record.id);
      }, 10000);
    });
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
        .set("Cookie", `authToken=${patientToken}`)
        .send(uploadData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.uploadUrl).toBeDefined();
      expect(response.body.fileKey).toBeDefined();
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
        .set("Cookie", `authToken=${patientToken}`)
        .send(uploadData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain(
        "Invalid file type. Only images, PDFs, and text files are allowed",
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
        .set("Cookie", `authToken=${patientToken}`)
        .send(uploadData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain(
        "File size too large. Maximum size is 10MB",
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
        .set("Cookie", `authToken=${patientToken}`)
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
        .set("Cookie", `authToken=${caregiverToken}`)
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
        .set("Cookie", `authToken=${caregiverToken}`)
        .send(uploadData);

      expect(response.status).toBe(403);
      expect(response.body.error).toContain(
        "You don't have access to upload records for this patient",
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
        .set("Cookie", `authToken=${patientToken}`)
        .send(uploadData);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("File key is required");
    });
  });

  describe("GET /records", () => {
    it("should get user's records", async () => {
      const response = await request(app)
        .get("/api/v1/records")
        .set("Cookie", `authToken=${patientToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.records).toBeDefined();
      expect(Array.isArray(response.body.records)).toBe(true);
      expect(response.body.pagination).toBeDefined();
    });

    it("should filter records by type", async () => {
      const response = await request(app)
        .get("/api/v1/records?type=SCAN")
        .set("Cookie", `authToken=${patientToken}`);

      expect(response.status).toBe(200);
      expect(response.body.records.every((r: any) => r.type === "SCAN")).toBe(
        true,
      );
    });

    it("should filter records by date range", async () => {
      const response = await request(app)
        .get(
          "/api/v1/records?dateFrom=2024-07-01T00:00:00.000Z&dateTo=2024-07-31T23:59:59.999Z",
        )
        .set("Cookie", `authToken=${patientToken}`);

      expect(response.status).toBe(200);
      expect(response.body.records).toBeDefined();
    });

    it("should filter records by tags", async () => {
      const response = await request(app)
        .get("/api/v1/records?tags=chest,x-ray")
        .set("Cookie", `authToken=${patientToken}`);

      expect(response.status).toBe(200);
      expect(response.body.records).toBeDefined();
    });

    it("should allow caregiver to get patient records", async () => {
      const response = await request(app)
        .get(`/api/v1/records?userId=${patientId}`)
        .set("Cookie", `authToken=${caregiverToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.records).toBeDefined();
    });

    it("should reject caregiver without access", async () => {
      const anotherPatient = await prisma.user.create({
        data: {
          email: "another2@test.com",
          name: "Another Patient 2",
          accountType: "FREEMIUM",
          role: "PATIENT",
        },
      });

      const response = await request(app)
        .get(`/api/v1/records?userId=${anotherPatient.id}`)
        .set("Cookie", `authToken=${caregiverToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toContain("don't have access");

      // Cleanup
      await prisma.user.delete({ where: { id: anotherPatient.id } });
    });

    it("should support pagination", async () => {
      const response = await request(app)
        .get("/api/v1/records?page=1&limit=5")
        .set("Cookie", `authToken=${patientToken}`);

      expect(response.status).toBe(200);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(5);
      expect(response.body.pagination.totalCount).toBeDefined();
      expect(response.body.pagination.totalPages).toBeDefined();
    });
  });

  describe("GET /records/:id", () => {
    it("should get specific record with download URL", async () => {
      const response = await request(app)
        .get(`/api/v1/records/${recordId}`)
        .set("Cookie", `authToken=${patientToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.record).toBeDefined();
      expect(response.body.record.id).toBe(recordId);
      expect(response.body.record.downloadUrl).toBeDefined();
    });

    it("should allow caregiver to get patient's record", async () => {
      const response = await request(app)
        .get(`/api/v1/records/${recordId}`)
        .set("Cookie", `authToken=${caregiverToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.record.id).toBe(recordId);
    });

    it("should return 404 for non-existent record", async () => {
      const response = await request(app)
        .get("/api/v1/records/non-existent-id")
        .set("Cookie", `authToken=${patientToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toContain("Record not found");
    });

    it("should reject unauthorized access", async () => {
      const unauthorizedUser = await prisma.user.create({
        data: {
          email: "unauthorized@test.com",
          name: "Unauthorized User",
          accountType: "FREEMIUM",
          role: "PATIENT",
        },
      });

      const unauthorizedToken = generateToken({
        id: unauthorizedUser.id,
        email: unauthorizedUser.email,
        role: unauthorizedUser.role,
      });

      const response = await request(app)
        .get(`/api/v1/records/${recordId}`)
        .set("Cookie", `authToken=${unauthorizedToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toContain("don't have access");

      await prisma.user.delete({ where: { id: unauthorizedUser.id } });
    });
  });

  describe("DELETE /records/:id", () => {
    it("should soft delete record", async () => {
      const response = await request(app)
        .delete(`/api/v1/records/${recordId}`)
        .set("Cookie", `authToken=${patientToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain("deleted successfully");

      // verif if record is soft deleted
      const deletedRecord = await prisma.record.findUnique({
        where: { id: recordId },
      });
      expect(deletedRecord?.isDeleted).toBe(true);
    });

    it("should not allow caregiver to delete patient's record", async () => {
      const record = await prisma.record.create({
        data: {
          title: "Test Record for Deletion",
          type: "OTHER",
          language: "en",
          tags: [],
          fileKey: "test-key",
          fileName: "test.pdf",
          fileSize: 1024,
          mimeType: "application/pdf",
          recordDate: new Date(),
          ownerId: patientId,
          uploaderId: patientId,
        },
      });

      const response = await request(app)
        .delete(`/api/v1/records/${record.id}`)
        .set("Cookie", `authToken=${caregiverToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toContain("Record not found");
    });

    it("should return 404 for already deleted record", async () => {
      const response = await request(app)
        .delete(`/api/v1/records/${recordId}`)
        .set("Cookie", `authToken=${patientToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toContain("Record not found");
    });
  });
});
