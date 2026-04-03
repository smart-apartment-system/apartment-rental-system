import mongoose from "mongoose";
import slugify from "slugify";

// ─── ENUMS ────────────────────────────────────────────────────────────
export const AMENITY_OPTIONS = [
  "parking",
  "gym",
  "lift",
  "swimming_pool",
  "security",
  "power_backup",
  "water_supply_24x7",
  "cctv",
  "intercom",
  "garden",
  "clubhouse",
  "visitor_parking",
];

// ─── ADDRESS ──────────────────────────────────────────────────────────
const addressSchema = new mongoose.Schema(
  {
    line1: { type: String, required: true, trim: true },
    line2: { type: String, trim: true },
    city: { type: String, required: true, trim: true, index: true },
    state: { type: String, required: true, trim: true },
    pincode: {
      type: String,
      required: true,
      match: [/^\d{6}$/, "Invalid pincode"],
    },
    country: { type: String, default: "India" },

    // 🔥 NEW: Geo Location (for maps / nearby search)
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [lng, lat]
      },
    },
  },
  { _id: false }
);

// ─── CONTACT ──────────────────────────────────────────────────────────
const contactInfoSchema = new mongoose.Schema(
  {
    phone: { type: String },
    email: { type: String, lowercase: true },
    emergencyPhone: { type: String },
  },
  { _id: false }
);

// ─── MAIN SCHEMA ──────────────────────────────────────────────────────
const apartmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    // 🔥 NEW: slug for SEO/search
    slug: {
      type: String,
      unique: true,
      index: true,
    },

    address: {
      type: addressSchema,
      required: true,
    },

    totalFloors: {
      type: Number,
      required: true,
      min: 1,
      max: 200,
    },

    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    amenities: {
      type: [String],
      enum: AMENITY_OPTIONS,
      default: [],
      set: (arr) => [...new Set(arr)],
    },

    societyRegistrationNumber: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },

    contactInfo: {
      type: contactInfoSchema,
      default: () => ({}),
    },

    // 🔥 Counters
    totalFlats: { type: Number, default: 0 },
    occupiedFlats: { type: Number, default: 0 },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    deactivatedAt: Date,
    deletedAt: Date, // 🔥 NEW: soft delete tracking
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── INDEXES ──────────────────────────────────────────────────────────
apartmentSchema.index({ ownerId: 1, isActive: 1 });
apartmentSchema.index({ "address.city": 1 });
apartmentSchema.index({ slug: 1 });

// 🔥 FULL TEXT SEARCH
apartmentSchema.index({
  name: "text",
  "address.city": "text",
  "address.state": "text",
});

// 🔥 GEO INDEX
apartmentSchema.index({ "address.location": "2dsphere" });


// ─── PRE HOOKS ───────────────────────────────────────────────────────

// 🔥 Auto slug generation
apartmentSchema.pre("save", function (next) {
  if (this.isModified("name")) {
    this.slug = slugify(this.name, { lower: true }) + "-" + Date.now();
  }

  // deactivate timestamp
  if (this.isModified("isActive") && !this.isActive) {
    this.deactivatedAt = new Date();
  }

  next();
});

// 🔥 Soft delete filter (global)
apartmentSchema.pre(/^find/, function (next) {
  this.where({ deletedAt: null });
  next();
});


// ─── VIRTUALS ─────────────────────────────────────────────────────────

apartmentSchema.virtual("occupancyRate").get(function () {
  if (!this.totalFlats) return 0;
  return +(this.occupiedFlats / this.totalFlats).toFixed(2);
});

apartmentSchema.virtual("fullAddress").get(function () {
  const a = this.address;
  return [a.line1, a.line2, a.city, a.state, a.pincode]
    .filter(Boolean)
    .join(", ");
});


// ─── METHODS ─────────────────────────────────────────────────────────

apartmentSchema.methods.incrementOccupied = async function () {
  await this.updateOne({ $inc: { occupiedFlats: 1 } });
};

apartmentSchema.methods.decrementOccupied = async function () {
  await this.updateOne({ $inc: { occupiedFlats: -1 } });
};

apartmentSchema.methods.incrementTotalFlats = async function () {
  await this.updateOne({ $inc: { totalFlats: 1 } });
};

apartmentSchema.methods.decrementTotalFlats = async function () {
  await this.updateOne({ $inc: { totalFlats: -1 } });
};

apartmentSchema.methods.softDelete = async function () {
  this.deletedAt = new Date();
  this.isActive = false;
  return this.save();
};

apartmentSchema.methods.toPublicJSON = function () {
  return {
    _id: this._id,
    name: this.name,
    slug: this.slug,
    address: this.address,
    fullAddress: this.fullAddress,
    totalFloors: this.totalFloors,
    totalFlats: this.totalFlats,
    occupiedFlats: this.occupiedFlats,
    occupancyRate: this.occupancyRate,
    amenities: this.amenities,
    contactInfo: this.contactInfo,
    isActive: this.isActive,
    ownerId: this.ownerId,
  };
};


// ─── STATIC METHODS ───────────────────────────────────────────────────

// 🔥 Search apartments
apartmentSchema.statics.searchApartments = function (query) {
  return this.find({
    $text: { $search: query },
  });
};

// 🔥 Nearby apartments (future maps feature)
apartmentSchema.statics.getNearby = function (lng, lat, radius = 5000) {
  return this.find({
    "address.location": {
      $near: {
        $geometry: { type: "Point", coordinates: [lng, lat] },
        $maxDistance: radius,
      },
    },
  });
};


const Apartment = mongoose.model("Apartment", apartmentSchema);
export default Apartment;