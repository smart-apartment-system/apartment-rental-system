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
    },

    floor: {
      type: Number,
      required: true,
      min: 0,
      max: 163,
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
    },

    baseRent: {
      type: Number,
      required: true,
      min: 0,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// 🔥 Prevent duplicate flat numbers in same apartment
flatSchema.index({ apartmentId: 1, flatNumber: 1 }, { unique: true });


// 🔥 Auto-sync occupancy
flatSchema.pre("save", function (next) {
  this.isOccupied = !!this.tenantId;
  next();
});


// 🔥 Safe response
flatSchema.methods.toPublicJSON = function () {
  return {
    _id: this._id,
    apartmentId: this.apartmentId,
    flatNumber: this.flatNumber,
    floor: this.floor,
    type: this.type,
    tenantId: this.tenantId,
    isOccupied: this.isOccupied,
    baseRent: this.baseRent,
    isActive: this.isActive,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const Flat = mongoose.model("Flat", flatSchema);