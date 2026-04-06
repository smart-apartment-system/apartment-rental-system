import mongoose, { Schema } from "mongoose";

const visitorSchema = new Schema(
    {
        flatId: {
        type: Schema.Types.ObjectId,
        ref: "Flat",
        required: true,
        index: true,
        },

        visitorName: {
        type: String,
        required: true,
        trim: true,
        },

        phone: {
        type: String,
        required: true,
        match: [/^\+?[1-9]\d{7,14}$/, "Invalid phone number"],
        },

        purpose: {
        type: String,
        required: true,
        trim: true,
        },

        entryTime: {
        type: Date,
        default: Date.now,
        },

        exitTime: {
        type: Date,
        default: null, 
        },

        status: {
        type: String,
        enum: ["pending", "approved", "rejected", "checked-in", "checked-out"],
        default: "pending",
        index: true,
        },

        approvedBy: {
        type: Schema.Types.ObjectId,
        ref: "User", 
        default: null,
        },

        vehicleNumber: {
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


visitorSchema.index({ flatId: 1, status: 1 });
visitorSchema.index({ createdAt: -1 });


visitorSchema.virtual("isInside").get(function () {
    return this.entryTime && !this.exitTime;
});


visitorSchema.methods.markExit = async function () {
    this.exitTime = new Date();
    this.status = "checked-out";
    return this.save();
};



visitorSchema.methods.toPublicJSON = function () {
    return {
        _id: this._id,
        visitorName: this.visitorName,
        phone: this.phone,
        purpose: this.purpose,
        status: this.status,
        entryTime: this.entryTime,
        exitTime: this.exitTime,
        flatId: this.flatId,
        isInside: this.isInside,
        vehicleNumber: this.vehicleNumber,
    };
};


const Visitor = mongoose.model("Visitor", visitorSchema);
export default Visitor;