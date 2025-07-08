import request from "supertest";
import app, { server } from "..";
import { prisma } from "../utils/db";
import { generateToken } from "../utils/jwt";
import { AccountType, User, UserRole } from "@prisma/client";

describe("Caregiver API", () => {
  let patientToken: string;
  let caregiverToken: string;
  let dependentToken: string;
  let anotherCaregiverToken: string;
  let patient: User;
  let caregiver: User;
  let dependent: User;
  let anotherCaregiver: User;
  let caregiverRequestId: string;

  beforeAll(async () => {
    await prisma.caregiverRequest.deleteMany();
    await prisma.record.deleteMany();
    await prisma.user.deleteMany();

    const [_patient, _caregiver, _dependent, _anotherCaregiver] =
      await prisma.$transaction([
        prisma.user.create({
          data: {
            email: "patient@test.com",
            name: "Test Patient",
            accountType: AccountType.FREEMIUM,
            role: UserRole.PATIENT,
          },
        }),
        prisma.user.create({
          data: {
            email: "caregiver@test.com",
            name: "Test Caregiver",
            accountType: AccountType.PREMIUM,
            role: UserRole.CAREGIVER,
          },
        }),
        prisma.user.create({
          data: {
            email: "dependent@test.com",
            name: "Test Dependent",
            accountType: AccountType.FREEMIUM,
            role: UserRole.DEPENDENT,
          },
        }),
        prisma.user.create({
          data: {
            email: "another-caregiver@test.com",
            name: "Another Caregiver",
            accountType: AccountType.PREMIUM,
            role: UserRole.CAREGIVER,
          },
        }),
      ]);

    console.log("Test users created: ", {
      patientId: _patient.id,
      caregiverId: _caregiver.id,
      dependentId: _dependent.id,
      anotherCaregiverId: _anotherCaregiver.id,
    });

    patient = _patient;
    caregiver = _caregiver;
    dependent = _dependent;
    anotherCaregiver = _anotherCaregiver;

    patientToken = generateToken({
      id: _patient.id,
      email: _patient.email,
      role: _patient.role,
    });

    caregiverToken = generateToken({
      id: _caregiver.id,
      email: _caregiver.email,
      role: _caregiver.role,
    });

    dependentToken = generateToken({
      id: _dependent.id,
      email: _dependent.email,
      role: _dependent.role,
    });

    anotherCaregiverToken = generateToken({
      id: _anotherCaregiver.id,
      email: _anotherCaregiver.email,
      role: _anotherCaregiver.role,
    });
  }, 30000);

  afterAll(async () => {
    await prisma.record.deleteMany();
    await prisma.caregiverRequest.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
    await server.close();
  });

  describe("POST /caregiver/request", () => {
    describe("should create a caregiver request", () => {
      it("when caregiver requests access to patient", async () => {
        const response = await request(app)
          .post("/api/v1/caregiver/request")
          .set("Authorization", `Bearer ${caregiverToken}`)
          .send({
            email: patient.email,
            message: "I would like to help manage your medical records.",
          });

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty(
          "message",
          "Caregiver access request sent successfully"
        );
        expect(response.body).toHaveProperty(
          "request",
          expect.objectContaining({
            id: expect.any(String),
            caregiverId: caregiver.id,
            patientId: patient.id,
          })
        );
        expect(response.body).toHaveProperty("success", true);

        caregiverRequestId = response.body.request.id;
      });

      it("when caregiver requests access to dependent", async () => {
        const response = await request(app)
          .post("/api/v1/caregiver/request")
          .set("Authorization", `Bearer ${caregiverToken}`)
          .send({
            email: dependent.email,
            message: "I would like to help manage your medical records.",
          });

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty(
          "message",
          "Caregiver access request sent successfully"
        );
        expect(response.body).toHaveProperty(
          "request",
          expect.objectContaining({
            id: expect.any(String),
            caregiverId: caregiver.id,
            patientId: dependent.id,
          })
        );
        expect(response.body).toHaveProperty("success", true);
      });
    });

    describe("should not create a caregiver request", () => {
      it("when patient tries to create a request", async () => {
        const response = await request(app)
          .post("/api/v1/caregiver/request")
          .set("Authorization", `Bearer ${patientToken}`)
          .send({
            email: caregiver.email,
            message: "Test message",
          });

        expect(response.status).toBe(403);
        expect(response.body).toHaveProperty(
          "error",
          "Only caregivers can request access"
        );
        expect(response.body).toHaveProperty("success", false);
      });

      it("when dependent tries to create a request", async () => {
        const response = await request(app)
          .post("/api/v1/caregiver/request")
          .set("Authorization", `Bearer ${dependentToken}`)
          .send({
            email: patient.email,
            message: "Test message",
          });

        expect(response.status).toBe(403);
        expect(response.body).toHaveProperty(
          "error",
          "Only caregivers can request access"
        );
        expect(response.body).toHaveProperty("success", false);
      });

      it("when caregiver tries to create a request for another caregiver", async () => {
        const response = await request(app)
          .post("/api/v1/caregiver/request")
          .set("Authorization", `Bearer ${caregiverToken}`)
          .send({
            email: anotherCaregiver.email,
            message: "Test message",
          });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty(
          "error",
          "Can only request access to patients or dependents"
        );
        expect(response.body).toHaveProperty("success", false);
      });

      it("when caregiver tries to create a request for non-existent user", async () => {
        const response = await request(app)
          .post("/api/v1/caregiver/request")
          .set("Authorization", `Bearer ${caregiverToken}`)
          .send({
            email: "nonexistent@test.com",
            message: "Test message",
          });

        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty("error", "Patient not found");
        expect(response.body).toHaveProperty("success", false);
      });

      it("when caregiver tries to create a duplicate request", async () => {
        const response = await request(app)
          .post("/api/v1/caregiver/request")
          .set("Authorization", `Bearer ${caregiverToken}`)
          .send({
            email: patient.email,
            message: "Duplicate request",
          });

        expect(response.status).toBe(409);
        expect(response.body).toHaveProperty("error", "Request already exists");
        expect(response.body).toHaveProperty("success", false);
      });

      it("when request body is invalid - invalid email format", async () => {
        const response = await request(app)
          .post("/api/v1/caregiver/request")
          .set("Authorization", `Bearer ${caregiverToken}`)
          .send({
            email: "invalid-email-format",
            message: "Test message",
          });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty("success", false);
      });
    });
  });

  describe("GET /caregiver/requests", () => {
    beforeAll(async () => {
      await prisma.caregiverRequest.create({
        data: {
          caregiverId: anotherCaregiver.id,
          patientId: patient.id,
          message: "Another caregiver request",
          status: "PENDING",
        },
      });
    });

    describe("should get caregiver requests", () => {
      it("when caregiver gets their sent requests", async () => {
        const response = await request(app)
          .get("/api/v1/caregiver/requests")
          .set("Authorization", `Bearer ${caregiverToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty(
          "message",
          "Caregiver requests retrieved successfully"
        );
        expect(response.body).toHaveProperty("success", true);
        expect(response.body).toHaveProperty("requests");
        expect(Array.isArray(response.body.requests)).toBe(true);

        response.body.requests.forEach((request: any) => {
          expect(request).toHaveProperty("caregiverId", caregiver.id);
          expect(request).toHaveProperty("patient");
          expect(request.patient).toHaveProperty("id");
          expect(request.patient).toHaveProperty("name");
          expect(request.patient).toHaveProperty("email");
          expect(request.patient).not.toHaveProperty("password");
        });
      });

      it("when patient gets their received requests", async () => {
        const response = await request(app)
          .get("/api/v1/caregiver/requests")
          .set("Authorization", `Bearer ${patientToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty(
          "message",
          "Caregiver requests retrieved successfully"
        );
        expect(response.body).toHaveProperty("success", true);
        expect(response.body).toHaveProperty("requests");
        expect(Array.isArray(response.body.requests)).toBe(true);

        response.body.requests.forEach((request: any) => {
          expect(request).toHaveProperty("patientId", patient.id);
          expect(request).toHaveProperty("caregiver");
          expect(request.caregiver).toHaveProperty("id");
          expect(request.caregiver).toHaveProperty("name");
          expect(request.caregiver).toHaveProperty("email");
          expect(request.caregiver).not.toHaveProperty("password");
        });

        expect(response.body.requests.length).toBeGreaterThanOrEqual(2);
      });

      it("when dependent gets their received requests", async () => {
        const response = await request(app)
          .get("/api/v1/caregiver/requests")
          .set("Authorization", `Bearer ${dependentToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty(
          "message",
          "Caregiver requests retrieved successfully"
        );
        expect(response.body).toHaveProperty("success", true);
        expect(response.body).toHaveProperty("requests");
        expect(Array.isArray(response.body.requests)).toBe(true);

        // Should include caregiver details
        response.body.requests.forEach((request: any) => {
          expect(request).toHaveProperty("patientId", dependent.id);
          expect(request).toHaveProperty("caregiver");
          expect(request.caregiver).toHaveProperty("id");
          expect(request.caregiver).toHaveProperty("name");
          expect(request.caregiver).toHaveProperty("email");
        });
      });
    });
  });

  describe("PATCH /caregiver/approve", () => {
    let approvalRequestId: string;

    //  to avoid the unique constraint issue
    beforeAll(async () => {

      await prisma.caregiverRequest.deleteMany({
        where: {
          caregiverId: anotherCaregiver.id,
          patientId: patient.id,
        },
      });

      const testRequest = await prisma.caregiverRequest.create({
        data: {
          caregiverId: anotherCaregiver.id,
          patientId: patient.id,
          message: "Request for approval testing",
          status: "PENDING",
        },
      });
      approvalRequestId = testRequest.id;
    });

    describe("should approve caregiver request", () => {
      it("when patient approves a pending request", async () => {
        const response = await request(app)
          .patch("/api/v1/caregiver/approve")
          .set("Authorization", `Bearer ${patientToken}`)
          .send({
            requestId: approvalRequestId,
            status: "APPROVED",
          });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty(
          "message",
          "Caregiver request approved successfully"
        );
        expect(response.body).toHaveProperty("success", true);
        expect(response.body).toHaveProperty("request");
        expect(response.body.request).toHaveProperty("status", "APPROVED");
        expect(response.body.request).toHaveProperty("caregiver");
        expect(response.body.request.caregiver).toHaveProperty("id");
        expect(response.body.request.caregiver).toHaveProperty("name");
        expect(response.body.request.caregiver).toHaveProperty("email");
      });

      it("when patient rejects a pending request", async () => {

        const testPatient = await prisma.user.create({
          data: {
            email: "testpatient2@test.com",
            name: "Test Patient 2",
            accountType: AccountType.FREEMIUM,
            role: UserRole.PATIENT,
          },
        });

        const testRequest = await prisma.caregiverRequest.create({
          data: {
            caregiverId: anotherCaregiver.id,
            patientId: testPatient.id,
            message: "Request for rejection testing",
            status: "PENDING",
          },
        });

        const testPatientToken = generateToken({
          id: testPatient.id,
          email: testPatient.email,
          role: testPatient.role,
        });

        const response = await request(app)
          .patch("/api/v1/caregiver/approve")
          .set("Authorization", `Bearer ${testPatientToken}`)
          .send({
            requestId: testRequest.id,
            status: "REJECTED",
          });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty(
          "message",
          "Caregiver request rejected successfully"
        );
        expect(response.body).toHaveProperty("success", true);
        expect(response.body.request).toHaveProperty("status", "REJECTED");

        // Clean up
        await prisma.caregiverRequest.delete({ where: { id: testRequest.id } });
        await prisma.user.delete({ where: { id: testPatient.id } });
      });

      it("when dependent approves a pending request", async () => {
        const testDependent = await prisma.user.create({
          data: {
            email: "testdependent2@test.com",
            name: "Test Dependent 2",
            accountType: AccountType.FREEMIUM,
            role: UserRole.DEPENDENT,
          },
        });

        const testRequest = await prisma.caregiverRequest.create({
          data: {
            caregiverId: anotherCaregiver.id,
            patientId: testDependent.id,
            message: "Request for dependent approval testing",
            status: "PENDING",
          },
        });

        const testDependentToken = generateToken({
          id: testDependent.id,
          email: testDependent.email,
          role: testDependent.role,
        });

        const response = await request(app)
          .patch("/api/v1/caregiver/approve")
          .set("Authorization", `Bearer ${testDependentToken}`)
          .send({
            requestId: testRequest.id,
            status: "APPROVED",
          });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty(
          "message",
          "Caregiver request approved successfully"
        );
        expect(response.body).toHaveProperty("success", true);
        expect(response.body.request).toHaveProperty("status", "APPROVED");

        // Clean up
        await prisma.caregiverRequest.delete({ where: { id: testRequest.id } });
        await prisma.user.delete({ where: { id: testDependent.id } });
      });
    });

    describe("should not approve caregiver request", () => {
      it("when caregiver tries to approve a request", async () => {
        const testPatient = await prisma.user.create({
          data: {
            email: "testpatient3@test.com",
            name: "Test Patient 3",
            accountType: AccountType.FREEMIUM,
            role: UserRole.PATIENT,
          },
        });

        const testRequest = await prisma.caregiverRequest.create({
          data: {
            caregiverId: caregiver.id,
            patientId: testPatient.id,
            message: "Request for caregiver approval testing",
            status: "PENDING",
          },
        });

        const response = await request(app)
          .patch("/api/v1/caregiver/approve")
          .set("Authorization", `Bearer ${caregiverToken}`)
          .send({
            requestId: testRequest.id,
            status: "APPROVED",
          });

        expect(response.status).toBe(403);
        expect(response.body).toHaveProperty(
          "error",
          "Only patients and dependents can approve requests"
        );
        expect(response.body).toHaveProperty("success", false);

        // Clean up
        await prisma.caregiverRequest.delete({ where: { id: testRequest.id } });
        await prisma.user.delete({ where: { id: testPatient.id } });
      });

      it("when request does not exist", async () => {
        const response = await request(app)
          .patch("/api/v1/caregiver/approve")
          .set("Authorization", `Bearer ${patientToken}`)
          .send({
            requestId: "non-existent-id",
            status: "APPROVED",
          });

        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty("error", "Request not found");
        expect(response.body).toHaveProperty("success", false);
      });

      it("when request has already been processed", async () => {
        const response = await request(app)
          .patch("/api/v1/caregiver/approve")
          .set("Authorization", `Bearer ${patientToken}`)
          .send({
            requestId: approvalRequestId,
            status: "APPROVED",
          });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty(
          "error",
          "Request has already been processed"
        );
        expect(response.body).toHaveProperty("success", false);
      });

      it("when request body is invalid - missing requestId", async () => {
        const response = await request(app)
          .patch("/api/v1/caregiver/approve")
          .set("Authorization", `Bearer ${patientToken}`)
          .send({
            status: "APPROVED",
          });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty("success", false);
        expect(response.body.error).toContain("requestId");
      });

      it("when request body is invalid - missing status", async () => {
        const response = await request(app)
          .patch("/api/v1/caregiver/approve")
          .set("Authorization", `Bearer ${patientToken}`)
          .send({
            requestId: approvalRequestId,
          });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty("success", false);
        expect(response.body.error).toContain("status");
      });

      it("when request body is invalid - invalid status", async () => {
        const newPatient = await prisma.user.create({
          data: {
            email: "newpatient@test.com", // Fixed email format
            role: UserRole.PATIENT,
            accountType: AccountType.FREEMIUM,
            name: "new test user",
          },
        });

        const newPatientToken = generateToken({
          id: newPatient.id,
          email: newPatient.email,
          role: newPatient.role,
        });

        const testRequest = await prisma.caregiverRequest.create({
          data: {
            caregiverId: caregiver.id,
            patientId: newPatient.id,
            message: "Request for invalid status testing",
            status: "PENDING",
          },
        });

        const response = await request(app)
          .patch("/api/v1/caregiver/approve")
          .set("Authorization", `Bearer ${newPatientToken}`)
          .send({
            requestId: testRequest.id,
            status: "INVALID_STATUS",
          });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty("success", false);

        await prisma.caregiverRequest.delete({
          where: {
            id: testRequest.id,
          },
        });
        await prisma.user.delete({
          where: {
            id: newPatient.id,
          },
        });
      });

      it("when user is not authenticated", async () => {
        const response = await request(app)
          .patch("/api/v1/caregiver/approve")
          .send({
            requestId: approvalRequestId,
            status: "APPROVED",
          });

        expect(response.status).toBe(401);
      });
    });
  });
});
