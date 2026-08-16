import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    success: true,
    message: "Coffee Machine Backend is running"
  });
});

app.listen(PORT, () => {
  console.log(`Backend server is running on port ${PORT}`);
});
