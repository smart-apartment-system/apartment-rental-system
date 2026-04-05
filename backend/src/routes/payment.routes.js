import {Router} from 'express';
import { createOrder, getPaymentById, getPaymentsByBill, getPaymentsByTenant, handleWebHook, refundPayment, verifyPayment } from '../controllers/payment.controller.js';
import { verifyJWT } from '../middleware/auth.middleware.js';
import { isAdmin } from '../middleware/admin.middleware.js';

const paymentRouter = Router();

paymentRouter.post("/webhook",handleWebHook);

paymentRouter.use(verifyJWT);

paymentRouter.post("/create-order",createOrder);
paymentRouter.post("/verify", verifyPayment);
paymentRouter.get("/bill/:billId",getPaymentsByBill);
paymentRouter.get("/tenant/:tenantId", getPaymentsByTenant);
paymentRouter.get("/:paymentId",getPaymentById);

// Admin Only
paymentRouter.post("/:paymentId/refund",isAdmin,refundPayment);


export default paymentRouter;