import { Router } from "express";
import ordersRoutes from "./ordersRoutes"
import histogramsRoutes from "./histogramsRoutes"
import reportsRoutes from "./reportsRoute";

const router = Router();

router.use("/orders", ordersRoutes);
router.use("/histogram", histogramsRoutes);
router.use("/reports", reportsRoutes);

export default router;