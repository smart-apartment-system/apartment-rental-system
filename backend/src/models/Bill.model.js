import mongoose from "mongoose";

const billSchema = new mongoose.Schema(
  {
    flatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Flat",
      required: true,
      index: true,
    },

    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    month: {
      type: String,
      required: true,
      trim: true,
    },

    rentAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    electricityBill: {
      type: Number,
      default: 0,
      min: 0,
    },

    maintainence: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalAmount: {
      type: Number,
      min: 0,
    },

    dueDate: {
      type: Date,
      required: true,
    },

    paidOn: {
      type: Date,
      default: null,
    },

    status: {
      type: String,
      enum: ["pending", "paid", "late"],
      default: "pending",
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// 🔥 Prevent duplicate bill for same flat + month
billSchema.index({ flatId: 1, month: 1 }, { unique: true });


// 🔥 Auto-calculate + status logic
billSchema.pre("save", function (next) {
  this.totalAmount =
    this.rentAmount + this.electricityBill + this.maintainence;

  if (this.paidOn) {
    this.status = "paid";
  } else if (this.dueDate < new Date()) {
    this.status = "late";
  }

  next();
});


// 🔥 Safe API response
billSchema.methods.toPublicJSON = function () {
  return {
    _id: this._id,
    flatId: this.flatId,
    tenantId: this.tenantId,
    month: this.month,
    rentAmount: this.rentAmount,
    electricityBill: this.electricityBill,
    maintainence: this.maintainence,
    totalAmount: this.totalAmount,
    dueDate: this.dueDate,
    paidOn: this.paidOn,
    status: this.status,
    isActive: this.isActive,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const Bill = mongoose.model("Bill", billSchema);