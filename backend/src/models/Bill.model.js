import mongoose from "mongoose";

const billSchema = new mongoose.Schema(
  {
    flatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Flat",
      required: [true, "Flat reference is required"],
      index: true,
    },

    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Tenant reference is required"],
      index: true,
    },

    // Validated format: "YYYY-MM"
    month: {
      type: String,
      required: [true, "Month is required"],
      trim: true,
      match: [/^\d{4}-(0[1-9]|1[0-2])$/, "Month must be in YYYY-MM format"],
    },

    rentAmount: {
      type: Number,
      required: [true, "Rent amount is required"],
      min: [0, "Rent amount cannot be negative"],
    },

    electricityBill: {
      type: Number,
      default: 0,
      min: [0, "Electricity bill cannot be negative"],
    },

    maintenance: {
      type: Number,
      default: 0,
      min: [0, "Maintenance cannot be negative"],
    },

    totalAmount: {
      type: Number,
      min: 0,
    },

    dueDate: {
      type: Date,
      required: [true, "Due date is required"],
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

    // ✅ Added: optional admin note e.g. "Meter fault – estimate used"
    note: {
      type: String,
      trim: true,
      maxlength: [300, "Note cannot exceed 300 characters"],
    },
  },
  { timestamps: true }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

// Prevent duplicate bill per flat + tenant + month
billSchema.index({ flatId: 1, tenantId: 1, month: 1 }, { unique: true });

// Common filter/dashboard queries
billSchema.index({ status: 1, isActive: 1 });
billSchema.index({ dueDate: 1, status: 1 });

// ─── Shared derived-field calculator ─────────────────────────────────────────

/**
 * Mutates `doc` with computed totalAmount and status.
 * Accepts a plain object or a Mongoose document.
 */
function computeDerivedFields(doc) {
  doc.totalAmount =
    (doc.rentAmount      || 0) +
    (doc.electricityBill || 0) +
    (doc.maintenance     || 0);

  if (doc.paidOn) {
    doc.status = "paid";
  } else if (new Date(doc.dueDate) < new Date()) {
    // ✅ Bug fix: wrap in new Date() so ISO strings from updates compare correctly
    doc.status = "late";
  } else {
    doc.status = "pending";
  }
}

// ─── Pre-save (create / .save()) ─────────────────────────────────────────────

billSchema.pre("save", function (next) {
  computeDerivedFields(this);
  next();
});

// ─── Pre findOneAndUpdate ─────────────────────────────────────────────────────

billSchema.pre("findOneAndUpdate", async function (next) {
  // ✅ Bug fix: Mongoose may wrap updates in $set internally — always unwrap
  const rawUpdate = this.getUpdate();
  const update    = rawUpdate.$set || rawUpdate;

  // Fetch current DB values for fields not being updated
  const existing = await this.model.findOne(this.getQuery()).lean();
  if (!existing) return next();

  // Merge: incoming value wins, otherwise keep existing DB value
  const merged = {
    rentAmount:      update.rentAmount      ?? existing.rentAmount,
    electricityBill: update.electricityBill ?? existing.electricityBill,
    maintenance:     update.maintenance     ?? existing.maintenance,
    paidOn:          update.paidOn          ?? existing.paidOn,
    dueDate:         update.dueDate         ?? existing.dueDate,
  };

  computeDerivedFields(merged);

  // Write computed values back into the actual update object
  if (rawUpdate.$set) {
    rawUpdate.$set.totalAmount = merged.totalAmount;
    rawUpdate.$set.status      = merged.status;
  } else {
    rawUpdate.totalAmount = merged.totalAmount;
    rawUpdate.status      = merged.status;
  }

  next();
});

// ─── Instance methods ─────────────────────────────────────────────────────────

billSchema.methods.toPublicJSON = function () {
  return {
    _id:             this._id,
    flatId:          this.flatId,
    tenantId:        this.tenantId,
    month:           this.month,
    rentAmount:      this.rentAmount,
    electricityBill: this.electricityBill,
    maintenance:     this.maintenance,
    totalAmount:     this.totalAmount,
    dueDate:         this.dueDate,
    paidOn:          this.paidOn,
    status:          this.status,
    isActive:        this.isActive,
    note:            this.note,
    createdAt:       this.createdAt,
    updatedAt:       this.updatedAt,
  };
};

const Bill = mongoose.model("Bill", billSchema);
export default Bill;