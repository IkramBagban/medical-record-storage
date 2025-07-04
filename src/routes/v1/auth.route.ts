import express from "express";
import {
  sendLoginOtp,
  verifyLogin,
  sendSignupOtp,
  verifySignup,
} from "../../controllers/v1/auth.controller";

const router = express.Router();

router.post("/signup/send-otp", sendSignupOtp);
router.post("/signup/verify", verifySignup);

router.post("/login/send-otp",   sendLoginOtp);
router.post("/login/verify", verifyLogin);

export default router;
