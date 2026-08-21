import { Router } from "express";
import * as reportsController from "../controllers/reportsController";

const router = Router();

router.get("/monthly", reportsController.getMonthlyReport);

export default router;