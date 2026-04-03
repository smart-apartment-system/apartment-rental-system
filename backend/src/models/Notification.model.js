import mongoose from "mongoose";

// ─── Constants ────────────────────────────────────────────────────────────────

export const NOTIFICATION_TYPES = [
    "reminder",
    "payment",
    "alert",
    "announcement",
    "chat",
];

export const NOTIFICATION_CHANNELS = ["email", "sms", "push"];

export const NOTIFICATION_PRIORITIES = ["low", "medium", "high", "critical"];

// ─── Delivery Status Schema ───────────────────────────────────────────────────

const deliveryStatusSchema = new mongoose.Schema(
    {
        channel: {
            type: String,
            enum: NOTIFICATION_CHANNELS,
            required: true,
        },
        status: {
            type: String,
            enum: ["pending", "sent", "delivered", "failed"],
            default: "pending",
        },
        sentAt: { type: Date },
        deliveredAt: { type: Date },
        failReason: { type: String, trim: true },
    },
    { _id: false }
);

// ─── Metadata Schema ──────────────────────────────────────────────────────────

const metadataSchema = new mongoose.Schema(
    {
        relatedModel: {
            type: String,
            enum: ["Bill", "Payment", "Flat", "Apartment", "User"],
        },
        relatedId: mongoose.Schema.Types.ObjectId,

        amountDue: { type: Number },
        dueDate: { type: Date },
        flatNumber: { type: String, trim: true },
        billMonth: { type: String, trim: true },
    },
    { _id: false }
);

// ─── Main Notification Schema ─────────────────────────────────────────────────

const notificationSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Recipient user ID is required"],
        },

        type: {
            type: String,
            enum: NOTIFICATION_TYPES,
            required: true,
            default: "alert",
        },

        message: {
            type: String,
            required: true,
            trim: true,
            maxlength: 500,
        },

        title: {
            type: String,
            trim: true,
            maxlength: 100,
        },

        // ✅ Ensure at least one delivery channel
        deliveryStatus: {
            type: [deliveryStatusSchema],
            validate: {
                validator: function (val) {
                    return val.length > 0;
                },
                message: "At least one delivery channel is required",
            },
        },

        priority: {
            type: String,
            enum: NOTIFICATION_PRIORITIES,
            default: "medium",
        },

        isRead: {
            type: Boolean,
            default: false,
        },

        readAt: {
            type: Date,
        },

        // ✅ Default expiry (30 days)
        expiresAt: {
            type: Date,
            default: () =>
                new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },

        metadata: {
            type: metadataSchema,
            default: () => ({}),
        },

        // Optional (future use)
        isDeleted: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ userId: 1, type: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// ─── Middleware ───────────────────────────────────────────────────────────────

notificationSchema.pre("save", function (next) {
    if (this.isModified("isRead") && this.isRead && !this.readAt) {
        this.readAt = new Date();
    }
    next();
});

// ─── Instance Methods ─────────────────────────────────────────────────────────

notificationSchema.methods.markAsRead = async function () {
    if (this.isRead) return this;
    this.isRead = true;
    this.readAt = new Date();
    return this.save();
};

notificationSchema.methods.updateDelivery = async function (
    channel,
    status,
    failReason = null
) {
    const entry = this.deliveryStatus.find((d) => d.channel === channel);

    if (entry) {
        entry.status = status;

        if (status === "sent" || status === "delivered") {
            entry.sentAt = new Date();
        }

        if (status === "delivered") {
            entry.deliveredAt = new Date();
        }

        if (failReason) entry.failReason = failReason;
    } else {
        this.deliveryStatus.push({
            channel,
            status,
            sentAt: status !== "failed" ? new Date() : undefined,
            failReason: failReason || undefined,
        });
    }

    this.markModified("deliveryStatus");
    return this.save();
};

// ─── Response Sanitization ────────────────────────────────────────────────────

notificationSchema.methods.toPublicJSON = function () {
    return {
        _id: this._id,
        userId: this.userId,
        type: this.type,
        title: this.title,
        message: this.message,
        priority: this.priority,
        isRead: this.isRead,
        readAt: this.readAt,
        deliveryStatus: this.deliveryStatus,
        metadata: this.metadata,
        expiresAt: this.expiresAt,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt,
    };
};

// ─── Static Methods ───────────────────────────────────────────────────────────

notificationSchema.statics.getUnreadCount = async function (userId) {
    return this.countDocuments({ userId, isRead: false });
};

notificationSchema.statics.markAllAsRead = async function (userId) {
    return this.updateMany(
        { userId, isRead: false },
        { $set: { isRead: true, readAt: new Date() } }
    );
};

// ─── Model Export ─────────────────────────────────────────────────────────────

export const Notification = mongoose.model(
    "Notification",
    notificationSchema
);