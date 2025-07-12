import app from "../..";
import { prisma } from "../../utils/db";
import { createOtpVerification, createUser } from "./auth";
import request from "supertest";

export const testEmail = "ikrambagban.dev@gmail.com";
export const testOtp = "123456";

export const cleanupAuthTables = async () => {
  await prisma.$executeRawUnsafe(`DO $$
  DECLARE
    tabname text;
  BEGIN
    -- Loop through all user-defined tables
    FOR tabname IN
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
    LOOP
      -- Dynamically build and execute TRUNCATE CASCADE
      EXECUTE format('TRUNCATE TABLE "%I" CASCADE;', tabname);
    END LOOP;
  END $$;`);
};

export const cleanupRecordTables = async () => {
  await prisma.record.deleteMany();
  await prisma.caregiverRequest.deleteMany();
};

export const cleanupAllTables = async () => {
  await prisma.$transaction([
    prisma.caregiverRequest.deleteMany(),
    prisma.record.deleteMany(),
    prisma.otpVerification.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.oCRResult.deleteMany(),
    prisma.planLimit.deleteMany(),
    prisma.subscription.deleteMany(),
    prisma.emergencySnapshot.deleteMany(),
    prisma.user.deleteMany(),
  ]);
};

export const createUserAndVerify = async () => {
  await createUser({});
  const res = await createOtpVerification({});
  console.log("OTP verification created:", res);
  return await request(app).post("/api/v1/auth/login/verify").send({
    email: testEmail,
    otp: testOtp,
  });
};

export const multilingualTestData = [
  {
    language: "es",
    title: "Informe de Análisis de Sangre",
    type: "LAB_REPORT",
    tags: ["sangre", "colesterol", "glucosa"],
    fileName: "análisis_sangre.pdf",
    description: "Resultados del análisis de sangre completo del paciente",
  },
  {
    language: "fr",
    title: "Rapport d'IRM Cérébrale",
    type: "SCAN",
    tags: ["cerveau", "IRM", "neurologie"],
    fileName: "irm_cérébrale.jpg",
    description: "Imagerie par résonance magnétique du cerveau",
  },
  {
    language: "de",
    title: "Röntgenaufnahme der Brust",
    type: "SCAN",
    tags: ["röntgen", "brust", "lunge"],
    fileName: "röntgen_brust.jpg",
    description: "Röntgenuntersuchung des Brustkorbs",
  },
  {
    language: "it",
    title: "Prescrizione Medica",
    type: "PRESCRIPTION",
    tags: ["farmaci", "ipertensione", "cuore"],
    fileName: "prescrizione_medica.pdf",
    description: "Prescrizione per farmaci per l'ipertensione",
  },
  {
    language: "pt",
    title: "Exame de Ultrassom",
    type: "SCAN",
    tags: ["ultrassom", "abdômen", "diagnóstico"],
    fileName: "ultrassom_abdômen.jpg",
    description: "Exame de ultrassonografia abdominal",
  },
  {
    language: "ru",
    title: "Результаты МРТ",
    type: "SCAN",
    tags: ["МРТ", "позвоночник", "диагностика"],
    fileName: "мрт_позвоночник.jpg",
    description: "Магнитно-резонансная томография позвоночника",
  },
  {
    language: "ja",
    title: "血液検査結果",
    type: "LAB_REPORT",
    tags: ["血液", "検査", "健康診断"],
    fileName: "血液検査.pdf",
    description: "定期健康診断の血液検査結果",
  },
  {
    language: "ko",
    title: "심전도 검사",
    type: "SCAN",
    tags: ["심전도", "심장", "검사"],
    fileName: "심전도_검사.pdf",
    description: "심장 기능 검사를 위한 심전도 결과",
  },
  {
    language: "zh",
    title: "CT扫描报告",
    type: "SCAN",
    tags: ["CT", "扫描", "胸部"],
    fileName: "胸部CT.jpg",
    description: "胸部计算机断层扫描检查报告",
  },
  {
    language: "ar",
    title: "تقرير فحص الدم",
    type: "LAB_REPORT",
    tags: ["دم", "فحص", "صحة"],
    fileName: "فحص_الدم.pdf",
    description: "نتائج فحص الدم الشامل للمريض",
  },
  {
    language: "hi",
    title: "एक्स-रे रिपोर्ट",
    type: "SCAN",
    tags: ["एक्स-रे", "हड्डी", "जांच"],
    fileName: "एक्स_रे_रिपोर्ट.jpg",
    description: "हड्डी की एक्स-रे जांच की रिपोर्ट",
  },
  {
    language: "th",
    title: "ผลตรวจเลือด",
    type: "LAB_REPORT",
    tags: ["เลือด", "ตรวจสุขภาพ", "ผลลัพธ์"],
    fileName: "ผลตรวจเลือด.pdf",
    description: "ผลการตรวจเลือดประจำปี",
  },
];
