import mongoose from "mongoose";

const flatSchema = new mongoose.Schema(
  {
    apartmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Apartment",
      required: true,
      index: true,
    },

    flatNumber: {
      type: String,
      required: [true, "Flat number is required"],
      trim: true,
      uppercase: true,
      match: [/^[A-Z0-9-]+$/, "Invalid flat number format"],
    },

    floor: {
      type: Number,
      required: true,
      min: 0,
      max: 200,
    },

    type: {
      type: String,
      enum: ["1BHK", "2BHK", "3BHK", "Studio"],
      required: true,
    },

    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    isOccupied: {
      type: Boolean,
      default: false,
      index: true,
    },

    baseRent: {
      type: Number,
      required: true,
      min: 0,
    },

    maintenanceCharge: {
      type: Number,
      default: 0,
      min: 0,
    },

    securityDeposit: {
      type: Number,
      default: 0,
      min: 0,
    },

    status: {
      type: String,
      enum: ["available", "occupied", "maintenance"],
      default: "available",
      index: true,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);


// 🔥 Compound Index
flatSchema.index({ apartmentId: 1, flatNumber: 1 }, { unique: true });


// 🔥 Auto Sync Occupancy + Status
flatSchema.pre("save", function (next) {
  this.isOccupied = !!this.tenantId;

  if (this.isOccupied) {
    this.status = "occupied";
  } else if (this.status !== "maintenance") {
    this.status = "available";
  }

  next();
});


// 🔥 Soft delete filter
flatSchema.pre(/^find/, function (next) {
  this.where({ deletedAt: null });
  next();
});


// 🔥 Virtual: Total Rent
flatSchema.virtual("totalRent").get(function () {
  return this.baseRent + this.maintenanceCharge;
});


// 🔥 Public Response
flatSchema.methods.toPublicJSON = function () {
  return {
    _id: this._id,
    apartmentId: this.apartmentId,
    flatNumber: this.flatNumber,
    floor: this.floor,
    type: this.type,
    tenantId: this.tenantId,
    isOccupied: this.isOccupied,
    status: this.status,
    baseRent: this.baseRent,
    maintenanceCharge: this.maintenanceCharge,
    totalRent: this.totalRent,
    securityDeposit: this.securityDeposit,
    isActive: this.isActive,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};


// 🔥 Static: Get Available Flats
flatSchema.statics.getAvailableFlats = function (apartmentId) {
  return this.find({
    apartmentId,
    isOccupied: false,
    status: "available",
  });
};


const Flat = mongoose.model("Flat", flatSchema);
export default Flat;