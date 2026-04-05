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

    // ✅ Validated format: "YYYY-MM"
    month: {
      type: String,
      required: true,
      trim: true,
      match: [/^\d{4}-(0[1-9]|1[0-2])$/, "Month must be in YYYY-MM format"],
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

    maintenance: {
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
      index: true,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

// Prevent duplicate bill per flat+tenant+month
billSchema.index({ flatId: 1, tenantId: 1, month: 1 }, { unique: true });

// ✅ Shared helper — calculates total and status from doc fields
function computeDerivedFields(doc) {
  doc.totalAmount =
    (doc.rentAmount || 0) +
    (doc.electricityBill || 0) +
    (doc.maintenance || 0);

  if (doc.paidOn) {
    doc.status = "paid";
  } else if (doc.dueDate < new Date()) {
    doc.status = "late";
  } else {
    doc.status = "pending";
  }
}

// Pre-save: runs on create + bill.save()
billSchema.pre("save", function (next) {
  computeDerivedFields(this);
  next();
});

// ✅ Fixed: pre findOneAndUpdate now fetches the existing doc
// so partial updates don't zero out other fields
billSchema.pre("findOneAndUpdate", async function (next) {
  const update = this.getUpdate();
  const docToUpdate = await this.model.findOne(this.getQuery());

  if (!docToUpdate) return next();

  // Merge existing values with incoming update values
  const rentAmount = update.rentAmount ?? docToUpdate.rentAmount;
  const electricityBill = update.electricityBill ?? docToUpdate.electricityBill;
  const maintenance = update.maintenance ?? docToUpdate.maintenance;
  const paidOn = update.paidOn ?? docToUpdate.paidOn;
  const dueDate = update.dueDate ?? docToUpdate.dueDate;

  update.totalAmount = (rentAmount || 0) + (electricityBill || 0) + (maintenance || 0);

  if (paidOn) {
    update.status = "paid";
  } else if (dueDate < new Date()) {
    update.status = "late";
  } else {
    update.status = "pending";
  }

  next();
});

// Consistent public shape used across all controllers
billSchema.methods.toPublicJSON = function () {
  return {
    _id: this._id,
    flatId: this.flatId,
    tenantId: this.tenantId,
    month: this.month,
    rentAmount: this.rentAmount,
    electricityBill: this.electricityBill,
    maintenance: this.maintenance,
    totalAmount: this.totalAmount,
    dueDate: this.dueDate,
    paidOn: this.paidOn,
    status: this.status,
    isActive: this.isActive,
  };
};

const Bill = mongoose.model("Bill", billSchema);
export default Bill;