import { Router } from "express";
import orderRoutes from "./orderRoutes";
import histogramRoutes from "./histogramRoutes";

const router = Router();

router.use("/orders", orderRoutes);
router.use("/histogram", histogramRoutes);

export default router;