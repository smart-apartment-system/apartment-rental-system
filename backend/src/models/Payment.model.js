import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
    {
        billId:{
            type: mongoose.Schema.Types.ObjectId,
            ref: "Bill",
            required: [true, "Bill reference is required"],
            index: true
        },
        tenantId:{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Tenant reference is required"],
            index: true,
        },
        razorpayOrderId:{
            type: String,
            required: [true, "Razorpay order ID is required"],
            unique: true,
            trim: true
        },
        razorpayPaymentId:{
            type: String,
            unique: true,
            sparse: true, // sparse: allows multiple null values without violating unique
            trim: true
        },
        razorpaySignature: {
            type: String,
            select: false,
        },
        amount:{
            type: Number,
            required: [true, "Payment amount is required"],
            min: [1, "Amount must be greater than zero"],
        },
        currency: {
            type: String,
            default: "INR",
            uppercase: true,
            trim: true
        },
        status:{
            type: String,
            enum: ["pending", "success", "failed", "refunded"],
            default: "pending"
        },
        receiptUrl:{
            type: String,
            trim: true
        },
        paidAt:{
            type: Date
        },
        failureReason: {
            type: String,
            trim: true,
        },
        paymentMethod: {
            type: String,
            enum: ["upi", "card", "netbanking", "wallet", "emi", "other"],
        },
    },
    {timestamps: true}
)
// Fetch all payments for a specific bill quickly (e.g. payment history page)
paymentSchema.index({ billId: 1, status: 1 });

// Dashboard query: all payments by a tenant sorted by date
paymentSchema.index({ tenantId: 1, createdAt: -1 });

paymentSchema.pre("save", function (next) {
    if (this.isModified("status") && this.status === "success" && !this.paidAt) {
        this.paidAt = new Date();
    }
    next();
});

paymentSchema.methods.markSuccess = async function ({
    razorpayPaymentId,
    razorpaySignature,
    receiptUrl,
}) {
    this.razorpayPaymentId = razorpayPaymentId;
    this.razorpaySignature = razorpaySignature;
    this.receiptUrl        = receiptUrl;
    this.status            = "success";
    // paidAt is set automatically by the pre-save hook above
    return this.save();
};

paymentSchema.methods.markFailed = async function (reason = "Unknown error") {
    this.status        = "failed";
    this.failureReason = reason;
    return this.save();
};

paymentSchema.methods.toPublicJSON = function () {
    return {
        _id:               this._id,
        billId:            this.billId,
        tenantId:          this.tenantId,
        razorpayOrderId:   this.razorpayOrderId,
        razorpayPaymentId: this.razorpayPaymentId,
        amount:            this.amount,
        currency:          this.currency,
        status:            this.status,
        receiptUrl:        this.receiptUrl,
        failureReason:     this.failureReason,
        paymentMethod:     this.paymentMethod,
        paidAt:            this.paidAt,
        createdAt:         this.createdAt,
        updatedAt:         this.updatedAt,
    };
};
export const Payment = mongoose.model("Payment",paymentSchema);