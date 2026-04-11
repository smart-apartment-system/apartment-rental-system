import { Router } from "express";
import {
    createVisitorEntry,
    approveVisitor,
    rejectVisitor,
    checkInVisitor,
    checkOutVisitor,
    getVisitorsByFlat,
    getActiveVisitors
} from "../controllers/visitor.controller.js";

import { verifyJWT } from "../middlewares/auth.middleware.js";

const visitorRouter = Router();


visitorRouter.use(verifyJWT);


visitorRouter.post("/", createVisitorEntry);


visitorRouter.patch("/approve/:visitorId", approveVisitor);
visitorRouter.patch("/reject/:visitorId", rejectVisitor);

visitorRouter.patch("/check-in/:visitorId", checkInVisitor);
visitorRouter.patch("/check-out/:visitorId", checkOutVisitor);


visitorRouter.get("/flat/:flatId", getVisitorsByFlat);

visitorRouter.get("/active", getActiveVisitors);

export default visitorRouter;