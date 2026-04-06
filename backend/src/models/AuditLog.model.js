import mongoose, { Schema } from "mongoose";

const auditLogSchema = new Schema(
    {
        userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
        },

        action: {
        type: String,
        required: true,
        index: true,
        },

        entityType: {
        type: String,
        enum: [
            "User",
            "Flat",
            "Apartment",
            "Bill",
            "Payment",
            "Lease",
            "Maintenance",
            "Visitor",
            "Expense",
            "Document",
        ],
        required: true,
        index: true,
        },

        entityId: {
        type: Schema.Types.ObjectId,
        required: true,
        },

        description: {
        type: String,
        trim: true,
        },

        metadata: {
        type: Schema.Types.Mixed, // flexible extra data
        },

        ipAddress: {
        type: String,
        },

        userAgent: {
        type: String,
        },

        status: {
        type: String,
        enum: ["success", "failed"],
        default: "success",
        },
    },
    { timestamps: true }
);



auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1 });
auditLogSchema.index({ action: 1 });



auditLogSchema.statics.logAction = function (data) {
    return this.create(data);
};



auditLogSchema.methods.toPublicJSON = function () {
    return {
        _id: this._id,
        userId: this.userId,
        action: this.action,
        entityType: this.entityType,
        entityId: this.entityId,
        description: this.description,
        status: this.status,
        createdAt: this.createdAt,
    };
};


const AuditLog = mongoose.model("AuditLog", auditLogSchema);
export default AuditLog;