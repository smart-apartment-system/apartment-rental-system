import mongoose, { Schema } from "mongoose";

const documentSchema = new Schema(
    {
        userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
        },

        flatId: {
        type: Schema.Types.ObjectId,
        ref: "Flat",
        default: null,
        },

        leaseId: {
        type: Schema.Types.ObjectId,
        ref: "Lease",
        default: null,
        },

        documentType: {
        type: String,
        enum: ["aadhaar", "pan", "rent_agreement", "other"],
        default: "aadhaar",
        index: true,
        },

        fileUrl: {
        type: String,
        required: true,
        },

        fileName: {
        type: String,
        },

        fileSize: {
        type: Number, // in bytes
        },

        mimeType: {
        type: String, // image/pdf
        },

        status: {
        type: String,
        enum: ["pending", "verified", "rejected"],
        default: "pending",
        index: true,
        },

        verifiedBy: {
        type: Schema.Types.ObjectId,
        ref: "User", // admin
        default: null,
        },

        verifiedAt: {
        type: Date,
        default: null,
        },

        isActive: {
        type: Boolean,
        default: true,
        index: true,
        },
    },
    { timestamps: true }
);


documentSchema.index({ userId: 1, documentType: 1 });


documentSchema.methods.verify = async function (adminId) {
    this.status = "verified";
    this.verifiedBy = adminId;
    this.verifiedAt = new Date();
    return this.save();
};


documentSchema.methods.reject = async function () {
    this.status = "rejected";
    return this.save();
};


documentSchema.methods.toPublicJSON = function () {
    return {
        _id: this._id,
        userId: this.userId,
        documentType: this.documentType,
        fileUrl: this.fileUrl,
        fileName: this.fileName,
        status: this.status,
        verifiedAt: this.verifiedAt,
        createdAt: this.createdAt,
    };
};


const Document = mongoose.model("Document", documentSchema);
export default Document;