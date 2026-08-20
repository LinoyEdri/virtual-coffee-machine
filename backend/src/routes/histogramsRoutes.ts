import { Router } from "express";
import * as histogramController from "../controllers/histogramController";

const router = Router();

router.get("/", histogramController.getHistogram);

export default router;