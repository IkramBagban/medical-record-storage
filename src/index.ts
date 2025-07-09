import express, { Response } from "express";
import { errorHandler } from "./middlewares/error.middleware";
import v1Routes from "./routes/index";
import dotenv from "dotenv";
import { rateLimit } from "express-rate-limit";
import { authMiddleware } from "./middlewares/auth.middleware";
import { ExtendedRequest } from "./types/common";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    error: "Too many requests, please try again later.",
    success: false,
  },
});

app.use(limiter);
app.set("trust proxy", process.env.NODE_ENV === "production"); // if usin a reverse proxy
app.use(express.json());
app.use("/api", v1Routes);
app.get("/api/v1/me", authMiddleware, (req: ExtendedRequest, res: Response) => {
  res.json({
    message: "Authenticated user data",
    user: req.user,
  });
});
app.use(errorHandler);
app.get("/", (req, res) => {
  res.send("Working!");
});

export const server = app.listen(PORT, () => {
  console.info(`Server is running on http://localhost:${PORT}`);
});

export default app;
