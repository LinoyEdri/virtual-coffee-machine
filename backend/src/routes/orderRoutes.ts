import { Router } from "express";
import * as ordersController from "../controllers/ordersController";

const router = Router();

router.post("/", ordersController.createOrder);

export default router;