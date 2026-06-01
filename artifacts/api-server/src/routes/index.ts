import { Router, type IRouter } from "express";
import healthRouter from "./health";
import bridgeRouter from "./bridge";

const router: IRouter = Router();

router.use(healthRouter);
router.use(bridgeRouter);

export default router;
