import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    billId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bill",
      required: [true, "Bill reference is required"],
      index: true,
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Tenant reference is required"],
      index: true,
    },
    razorpayOrderId: {
      type: String,
      required: [true, "Razorpay order ID is required"],
      unique: true,
      trim: true,
    },
    razorpayPaymentId: {
      type: String,
      unique: true,
      sparse: true, // allows multiple null values without violating unique
      trim: true,
    },
    razorpaySignature: {
      type: String,
      select: false, // never returned in queries unless explicitly requested
    },
    amount: {
      type: Number,
      required: [true, "Payment amount is required"],
      min: [1, "Amount must be greater than zero"],
    },
    currency: {
      type: String,
      default: "INR",
      uppercase: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "success", "failed", "refunded"],
      default: "pending",
      index: true,
    },
    receiptUrl: {
      type: String,
      trim: true,
    },
    paidAt: {
      type: Date,
      default: null,
    },
    failureReason: {
      type: String,
      trim: true,
    },
    paymentMethod: {
      type: String,
      // ✅ "other" acts as a safe catch-all for new Razorpay methods
      enum: ["upi", "card", "netbanking", "wallet", "emi", "other"],
    },

    // ✅ Added: track refund metadata if status moves to "refunded"
    refundedAt: {
      type: Date,
      default: null,
    },
    refundReason: {
      type: String,
      trim: true,
    },
    refundId: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

// Fetch all payments for a specific bill quickly
paymentSchema.index({ billId: 1, status: 1 });

// Dashboard query: all payments by tenant sorted by date
paymentSchema.index({ tenantId: 1, createdAt: -1 });

// ✅ Auto-set paidAt when status transitions to "success"
paymentSchema.pre("save", function (next) {
  if (this.isModified("status")) {
    if (this.status === "success" && !this.paidAt) {
      this.paidAt = new Date();
    }
    // ✅ Bug fix: clear paidAt if somehow reverted (defensive)
    if (this.status !== "success" && this.status !== "refunded") {
      this.paidAt = null;
    }
  }
  next();
});

// ✅ Bug fix: validate required fields before marking success
paymentSchema.methods.markSuccess = async function ({
  razorpayPaymentId,
  razorpaySignature,
  paymentMethod,
  receiptUrl,
}) {
  if (!razorpayPaymentId || !razorpaySignature) {
    throw new Error("razorpayPaymentId and razorpaySignature are required to mark success");
  }

  // ✅ Prevent overwriting an already-completed payment
  if (this.status === "success") {
    throw new Error("Payment is already marked as successful");
  }

  this.razorpayPaymentId = razorpayPaymentId;
  this.razorpaySignature = razorpaySignature;
  this.status            = "success";
  this.paymentMethod     = paymentMethod || "other";
  if (receiptUrl) this.receiptUrl = receiptUrl;

  // paidAt is set by pre-save hook
  return this.save();
};

paymentSchema.methods.markFailed = async function (reason = "Unknown error") {
  // ✅ Don't overwrite a successful payment with failed
  if (this.status === "success") {
    throw new Error("Cannot mark a successful payment as failed");
  }
  this.status        = "failed";
  this.failureReason = reason;
  return this.save();
};

// ✅ Added: markRefunded method for refund flow
paymentSchema.methods.markRefunded = async function ({ refundId, reason } = {}) {
  if (this.status !== "success") {
    throw new Error("Only successful payments can be refunded");
  }
  this.status       = "refunded";
  this.refundedAt   = new Date();
  this.refundReason = reason || "Refund initiated";
  if (refundId) this.refundId = refundId;
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
    refundedAt:        this.refundedAt,
    refundReason:      this.refundReason,
    createdAt:         this.createdAt,
    updatedAt:         this.updatedAt,
  };
};

export const Payment = mongoose.model("Payment", paymentSchema);