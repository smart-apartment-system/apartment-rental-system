import mongoose, { Schema } from "mongoose";

const leaseSchema = new Schema(
    {
        tenantId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
        },

        flatId: {
        type: Schema.Types.ObjectId,
        ref: "Flat",
        required: true,
        index: true,
        },

        apartmentId: {
        type: Schema.Types.ObjectId,
        ref: "Apartment",
        required: true,
        index: true,
        },

        startDate: {
        type: Date,
        required: true,
        },

        endDate: {
        type: Date,
        required: true,
        validate: {
            validator: function (value) {
            return value > this.startDate;
            },
            message: "End date must be after start date",
        },
        },

        rentAmount: {
        type: Number,
        required: true,
        min: 0,
        },

        deposit: {
        type: Number,
        default: 0,
        min: 0,
        },

        paymentCycle: {
        type: String,
        enum: ["monthly", "quarterly", "yearly"],
        default: "monthly",
        },

        status: {
        type: String,
        enum: ["active", "expired", "terminated"],
        default: "active",
        index: true,
        },

        terminatedAt: {
        type: Date,
        default: null,
        },

        notes: {
        type: String,
        trim: true,
        },

        isActive: {
        type: Boolean,
        default: true,
        },
    },
    { timestamps: true }
);


leaseSchema.index(
    { flatId: 1, status: 1 },
    {
        unique: true,
        partialFilterExpression: { status: "active" },
    }
);


leaseSchema.virtual("durationDays").get(function () {
    const diff = this.endDate - this.startDate;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
});


leaseSchema.pre("save", function (next) {
    if (this.endDate < new Date() && this.status === "active") {
        this.status = "expired";
    }
    next();
});



leaseSchema.methods.terminate = async function () {
    this.status = "terminated";
    this.terminatedAt = new Date();
    return this.save();
};



leaseSchema.methods.toPublicJSON = function () {
    return {
        _id: this._id,
        tenantId: this.tenantId,
        flatId: this.flatId,
        apartmentId: this.apartmentId,
        startDate: this.startDate,
        endDate: this.endDate,
        rentAmount: this.rentAmount,
        deposit: this.deposit,
        paymentCycle: this.paymentCycle,
        status: this.status,
        durationDays: this.durationDays,
    };
};


const Lease = mongoose.model("Lease", leaseSchema);
export default Lease;