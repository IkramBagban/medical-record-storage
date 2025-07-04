import express from "express";
import { errorHandler } from "./middlewares/error.middleware";
import v1Routes from "./routes/index";
import dotenv from "dotenv";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

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