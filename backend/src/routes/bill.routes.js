import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { isAdmin } from "../middleware/admin.middleware.js";
import { createBill, deleteBill, getAllBills, getBillsSummary, getTenantBills, markAsPaid, updateBill } from "../controllers/bill.controller.js";

const billRouter = Router();

billRouter.use(verifyJWT);

billRouter.post("/",isAdmin,createBill);
billRouter.get("/", isAdmin, getAllBills);
billRouter.get("/summary",isAdmin,getBillsSummary);
billRouter.patch("/:billId",isAdmin,updateBill);
billRouter.patch("/:billId/mark-paid",isAdmin,markAsPaid);
billRouter.delete("/:billId",deleteBill);

billRouter.get("/tenant/:tenantId",getTenantBills);
billRouter.get("/:billId",getBillById);

export default billRouter;