import express from "express";
import { errorHandler } from "./middlewares/error.middleware";
import v1Routes from "./routes/index";
import dotenv from "dotenv";
import { rateLimit } from "express-rate-limit";

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
app.use(express.json());
app.use("/api", v1Routes);
app.use(errorHandler);

app.get("/", (req, res) => {
  res.send("Working!");
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

export default app;
