import mongoose, { Schema } from "mongoose";

const maintenanceRequestSchema = new Schema(
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

        title: {
        type: String,
        required: true,
        trim: true,
        },

        description: {
        type: String,
        trim: true,
        },

        status: {
        type: String,
        enum: ["pending", "in-progress", "resolved", "rejected"],
        default: "pending",
        index: true,
        },

        priority: {
        type: String,
        enum: ["low", "medium", "high"],
        default: "low",
        index: true,
        },

        assignedTo: {
        type: Schema.Types.ObjectId,
        ref: "Staff",
        default: null,
        },

        attachments: [
        {
            url: String, // image/pdf
        },
        ],

        remarks: {
        type: String, // admin/staff notes
        },

        resolvedAt: {
        type: Date,
        default: null,
        },

        isActive: {
        type: Boolean,
        default: true,
        },
    },
    { timestamps: true }
);



maintenanceRequestSchema.index({ apartmentId: 1, status: 1 });
maintenanceRequestSchema.index({ tenantId: 1, createdAt: -1 });



maintenanceRequestSchema.virtual("isResolved").get(function () {
    return this.status === "resolved";
});



maintenanceRequestSchema.methods.markResolved = async function () {
    this.status = "resolved";
    this.resolvedAt = new Date();
    return this.save();
};



maintenanceRequestSchema.methods.toPublicJSON = function () {
    return {
        _id: this._id,
        title: this.title,
        description: this.description,
        status: this.status,
        priority: this.priority,
        tenantId: this.tenantId,
        flatId: this.flatId,
        apartmentId: this.apartmentId,
        assignedTo: this.assignedTo,
        attachments: this.attachments,
        remarks: this.remarks,
        resolvedAt: this.resolvedAt,
        createdAt: this.createdAt,
    };
};


const MaintenanceRequest = mongoose.model(
    "MaintenanceRequest",
    maintenanceRequestSchema
);

export default MaintenanceRequest;