import mongoose from "mongoose";

// ─── Allowed amenities ────────────────────────────────────────────────────────
// Centralised enum prevents "Gym" vs "gym" vs "GYM" inconsistencies.
// Add to this list as needed — single source of truth for frontend dropdowns too.
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

// ─── Address subdocument ──────────────────────────────────────────────────────
// Structured address makes city/pincode/state individually queryable and
// validatable — a flat string like "123 Main St, Mumbai" is opaque to queries.
const addressSchema = new mongoose.Schema(
  {
    line1: {
      type:     String,
      required: [true, "Address line 1 is required"],
      trim:     true,
    },
    line2: {
      type: String,
      trim: true,
    },
    city: {
      type:     String,
      required: [true, "City is required"],
      trim:     true,
    },
    state: {
      type:     String,
      required: [true, "State is required"],
      trim:     true,
    },
    pincode: {
      type:     String,
      required: [true, "Pincode is required"],
      trim:     true,
      match:    [/^\d{6}$/, "Pincode must be exactly 6 digits"],
    },
    country: {
      type:    String,
      default: "India",
      trim:    true,
    },
  },
  { _id: false }  // embedded — no separate _id needed
);

// ─── Contact info subdocument ─────────────────────────────────────────────────
// Society/building contact separate from the owner's personal profile.
// Tenants need an emergency/maintenance number that isn't the owner's mobile.
const contactInfoSchema = new mongoose.Schema(
  {
    phone: {
      type:  String,
      trim:  true,
      match: [/^\+?[1-9]\d{7,14}$/, "Please enter a valid phone number"],
    },
    email: {
      type:      String,
      trim:      true,
      lowercase: true,
      match:     [/^\S+@\S+\.\S+$/, "Please enter a valid email address"],
    },
    emergencyPhone: {
      type:  String,
      trim:  true,
      match: [/^\+?[1-9]\d{7,14}$/, "Please enter a valid phone number"],
    },
  },
  { _id: false }
);

// ─── Main apartment schema ────────────────────────────────────────────────────
const apartmentSchema = new mongoose.Schema(
  {
    name: {
      type:     String,
      required: [true, "Apartment name is required"],
      trim:     true,
    },

    // FIX: was a flat String — now a structured subdocument
    address: {
      type:     addressSchema,
      required: [true, "Address is required"],
    },

    totalFloors: {
      type:     Number,
      required: [true, "Total floors is required"],
      min:      [1,   "Must have at least 1 floor"],
      max:      [163, "Exceeds maximum supported floors"],  // FIX: no upper bound before
    },

    ownerId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: [true, "Owner reference is required"],
    },

    // FIX: was a free-form String array — now enum-guarded.
    // Set type prevents duplicate entries ("gym" twice).
    amenities: {
      type:    [String],
      enum:    AMENITY_OPTIONS,
      default: [],
      set:     (arr) => [...new Set(arr)],  // deduplicate on assignment
    },

    // Society registration / RERA number — uniquely identifies the property.
    // FIX: was missing — two same-named apartments were indistinguishable.
    societyRegistrationNumber: {
      type:   String,
      trim:   true,
      sparse: true,   // unique but optional (older buildings may not have one)
      unique: true,
    },

    // Society/building contact — separate from owner's personal profile.
    // FIX: was missing — tenants had no maintenance/emergency contact.
    contactInfo: {
      type:    contactInfoSchema,
      default: () => ({}),
    },

    // ── Occupancy counters ────────────────────────────────────────────────────
    // FIX: was missing — dashboard showed occupancy by running expensive
    // aggregations on the Flat collection on every request. These counters
    // are updated by the flat service whenever a flat is added or a tenant
    // is assigned/removed. Much cheaper to read.
    totalFlats: {
      type:    Number,
      default: 0,
      min:     0,
    },
    occupiedFlats: {
      type:    Number,
      default: 0,
      min:     0,
    },

    // FIX: soft delete — hard-deleting an apartment with active tenants is
    // destructive. Mark inactive instead; filter it out in queries.
    isActive: {
      type:    Boolean,
      default: true,
    },
    deactivatedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

// FIX: was missing — "fetch all my apartments" did a full collection scan
apartmentSchema.index({ ownerId: 1 });

// Search apartments by city (for admin dashboard / dynamic pricing feature)
apartmentSchema.index({ "address.city": 1 });

// Compound: active apartments owned by a user (most common query pattern)
apartmentSchema.index({ ownerId: 1, isActive: 1 });


// ─── Virtual ──────────────────────────────────────────────────────────────────

// Derived occupancy rate — computed on read, not stored.
// Access as apartment.occupancyRate (e.g. 0.75 = 75% occupied)
apartmentSchema.virtual("occupancyRate").get(function () {
  if (!this.totalFlats || this.totalFlats === 0) return 0;
  return parseFloat((this.occupiedFlats / this.totalFlats).toFixed(2));
});

// Computed full address string — useful for display and PDF generation
apartmentSchema.virtual("fullAddress").get(function () {
  const a = this.address;
  if (!a) return "";
  const parts = [a.line1, a.line2, a.city, a.state, a.pincode, a.country];
  return parts.filter(Boolean).join(", ");
});

// Include virtuals when converting to JSON (for API responses)
apartmentSchema.set("toJSON",   { virtuals: true });
apartmentSchema.set("toObject", { virtuals: true });


// ─── Pre-save hook ────────────────────────────────────────────────────────────

// Automatically set deactivatedAt timestamp when isActive is toggled off
apartmentSchema.pre("save", function (next) {
  if (this.isModified("isActive") && !this.isActive && !this.deactivatedAt) {
    this.deactivatedAt = new Date();
  }
  next();
});


// ─── Instance methods ─────────────────────────────────────────────────────────

/**
 * Increment occupiedFlats counter when a tenant is assigned to a flat.
 * Call this from flat.service.js instead of manually updating the counter.
 */
apartmentSchema.methods.incrementOccupied = async function () {
  if (this.occupiedFlats < this.totalFlats) {
    this.occupiedFlats += 1;
    await this.save();
  }
};

/**
 * Decrement occupiedFlats counter when a tenant vacates.
 */
apartmentSchema.methods.decrementOccupied = async function () {
  if (this.occupiedFlats > 0) {
    this.occupiedFlats -= 1;
    await this.save();
  }
};

/**
 * Soft-delete the apartment.
 * Preferred over hard delete — preserves historical bill and payment records.
 */
apartmentSchema.methods.deactivate = async function () {
  this.isActive      = false;
  this.deactivatedAt = new Date();
  return this.save();
};

/**
 * Safe public representation for API responses.
 * Strips internal fields, adds computed virtuals.
 */
apartmentSchema.methods.toPublicJSON = function () {
  return {
    _id:                       this._id,
    name:                      this.name,
    address:                   this.address,
    fullAddress:               this.fullAddress,
    totalFloors:               this.totalFloors,
    totalFlats:                this.totalFlats,
    occupiedFlats:             this.occupiedFlats,
    occupancyRate:             this.occupancyRate,
    amenities:                 this.amenities,
    contactInfo:               this.contactInfo,
    societyRegistrationNumber: this.societyRegistrationNumber,
    isActive:                  this.isActive,
    ownerId:                   this.ownerId,
    createdAt:                 this.createdAt,
    updatedAt:                 this.updatedAt,
  };
};

export const Apartment = mongoose.model("Apartment", apartmentSchema);