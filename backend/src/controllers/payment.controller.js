import crypto from "crypto";
import Razorpay from "razorpay";
import { Payment } from "../models/Payment.model.js";
import Bill from "../models/Bill.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import env from "../config/env.js";

const razorpay = new Razorpay({
    key_id: env.razorpay.razorpayKeyId,
    key_secret: env.razorpay.razorpayKeySecret
});

const PAYMENT_PAGE_SIZE = 20;

export const createOrder = asyncHandler(async(req,res)=>{
    const {billId} = req.body;
    const tenantId = req.user._id;

    if (!billId) throw new ApiError(400, "billId is required");

    const bill = await Bill.findById(billId);
    if(!bill){
        throw new ApiError(404, "Bill not found");
    }

    if(!bill.isActive){
        throw new ApiError(400,"Bill id deleted");
    }

    if(!bill.paidOn){
        throw new ApiError(400, "Bill is already paid");
    }

    if(!tenantId){
        throw new ApiError(400, "Tenant id is required");
    }

    const existingPending = await Payment.findOne({
        billId,
        status: "pending",
    });

    if(existingPending){
        return res.json(
            new ApiResponse(200, existingPending.toPublicJSON(), "Pending order already exists")
        );
    }

    const amountInPaise = Math.round(bill.totalAmount * 100);

    let razorpayOrder;
    try {
        razorpayOrder = await razorpay.orders.create({
            amount:   amountInPaise,
            currency: "INR",
            receipt:  `bill_${billId}`,
            notes: {
                billId:   billId.toString(),
                tenantId: tenantId.toString(),
            },
        });
    } catch (err) {
        throw new ApiError(502, `Razorpay order creation failed: ${err.message}`);
    }

    const payment = await Payment.create({
        billId,
        tenantId,
        razorpayOrderId: razorpayOrder.id,
        amount: bill.totalAmount,
        currency: "INR",
    });

    return res.status(201).json(
        new ApiResponse(201,{
            ...payment.toPublicJSON(),
            razorpayKeyId: env.razorpay.razorpayKeyId,
        },"Order created successfully")
    );
});

export const verifyPayment = asyncHandler(async(req,res)=>{
    const {
        razorpayOrderId, 
        razorpayPaymentId,
        razorpaySignature,
        paymentMethod
    } = req.body;

    if(!razorpayOrderId || !razorpayPaymentId || razorpaySignature){
        throw new ApiError(400, "razorpayOrderId, razorpayPaymentId, and razorpaySignature are required");
    }

    const expectedSignature = crypto
        .createHmac("sha256",env.razorpay.razorpayKeySecret)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest("hex");

    if(expectedSignature != razorpaySignature){
        throw new ApiError(400, "Invalid payment signature — possible tampered request");
    }

    const payment = await Payment.findOne({razorpayOrderId});
    if(!payment){
        throw new ApiError(404, "Payment record not found");
    }

    if(payment.status === 'success'){
        return res.json(new ApiResponse(200, payment.toPublicJSON(), "Payment already verified"));
    }

    await payment.markSuccess({razorpayPaymentId,razorpaySignature,paymentMethod});

    const bill = await Bill.findById(payment.billId);
    if(bill && !bill.paidOn){
        bill.paidOn == payment.paidAt;
        await bill.save();
    }

    return res.json(new ApiResponse(200, payment.toPublicJSON(), "Payment verified successfully"));
});

export const handleWebHook = asyncHandler(async(req,res)=>{
    const webHookSecret = env.razorpay.razorpayWebHookSecret;
    const receivedSig = req.headers["x-razorpay-signature"];
    const rawBody = JSON.stringify(req.body);

    const expectedSig = crypto
        .createHmac("sha256",webHookSecret)
        .update(rawBody)
        .digest("hex");

    if(expectedSig !== receivedSig){
        throw new ApiError(400, "Invalid webhook signature");
    }

    const { event, payload} = req.body;

    if(event === "payment.captured"){
        const rPayment = payload.payment.entity;
        const payment = await Payment.findOne({razorpayOrderId : rPayment.order_id});

        if(payment && payment.status !== "success"){
            await payment.marksuccess({
                razorpayPaymentId : rPayment.id,
                razorpaySignature: "",
                paymentMethod: rPayment.method || "other"
            });
        

            const bill = await Bill.findById(payment.billId);
            if(bill && !bill.paidOn){
                bill.paidOn = payment.paidAt;
                await bill.save();
            }
        }
    }

    if(event === "payment.failed"){
        const rPayment = payload.payment.entity;
        const payment = await Payment.findOne({razorpayOrderId: rPayment.order_id});

        if(payment && payment.status === "pending"){
            await payment.markFailed(
                rPayment.error_description || rPayment.error_code || "Payment failed"
            );
        }
    }
    return res.status(200).json({ received: true });
});

export const getPaymentsByBill = asyncHandler(async(req,res)=>{
    const { billId } = req.params;

    const payments = await Payment.find({ billId })
        .sort({ createdAt: -1 })
        .select("-razorpaySignature");

    return res.json(
        new ApiResponse(200, payments.map((p) => p.toPublicJSON()), "Payments for bill")
    );
});

export const getPaymentsByTenant = asyncHandler(async(req,res)=>{
    const { tenantId } = req.params;

    const isAdmin = req.user?.role === "admin";
    const isSelf  = req.user?._id.toString() === tenantId;
    if (!isAdmin && !isSelf) throw new ApiError(403, "Access denied");

    const page  = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(parseInt(req.query.limit) || PAYMENT_PAGE_SIZE, 100);
    const skip  = (page - 1) * limit;

    const [payment , total] = await Promise.all([
        Payment.find({ tenantId })
            .sort({createdAt: -1})
            .skip(skip)
            .limit(limit)
            .select("-razorpaySignature"),
        Payment.countDocuments({ tenantId }),
    ]);

    return res.json(
        new ApiResponse(200,{
            payments: payments.map((p)=>p.toPublicJSON()),
            pagination: {total, page, limit, pages: Math.ceil(total/limit)},
        }, "Tenant payments")
    );
});

export const getPaymentById = asyncHandler(async(req,res)=>{
    const { paymentId } = req.params;
 
    const payment = await Payment.findById(paymentId).select("-razorpaySignature");
    if (!payment) throw new ApiError(404, "Payment not found");
 
    const isAdmin = req.user?.role === "admin";
    const isSelf  = req.user?._id.toString() === payment.tenantId.toString();
    if (!isAdmin && !isSelf) throw new ApiError(403, "Access denied");
 
    return res.json(new ApiResponse(200, payment.toPublicJSON(), "Payment details"));
});


export const refundPayment = asyncHandler(async(req,res)=>{
    const { paymentId } = req.params;
    const { reason }    = req.body;
 
    const payment = await Payment.findById(paymentId);
    if (!payment) throw new ApiError(404, "Payment not found");
    if (payment.status !== "success") throw new ApiError(400, "Only successful payments can be refunded");
 
    // Initiate refund on Razorpay (amount in paise)
    let refund;
    try {
        refund = await razorpay.payments.refund(payment.razorpayPaymentId, {
        amount: Math.round(payment.amount * 100),
        notes: { reason: reason || "Refund initiated by admin" },
        });
    } catch (err) {
        throw new ApiError(502, `Razorpay refund failed: ${err.message}`);
    }
 
    await payment.markRefunded({ refundId: refund.id, reason });
 
    // Revert bill paid status
    const bill = await Bill.findById(payment.billId);
    if (bill) {
        bill.paidOn = null;
        await bill.save();
    }
 
    return res.json(new ApiResponse(200, payment.toPublicJSON(), "Payment refunded successfully"));
});