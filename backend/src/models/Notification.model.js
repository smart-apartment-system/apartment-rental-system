import mongoose from "mongoose";



export const NOTIFICATION_TYPES = [
    "reminder",       // upcoming bill due date
    "payment",        // payment success / failure confirmation
    "alert",          // overdue, eviction notice, system alert
    "announcement",   // society-wide broadcast from owner
    "chat",           // new chat message received
];

export const NOTIFICATION_CHANNELS = ["email", "sms", "push"];

export const NOTIFICATION_PRIORITIES = ["low", "medium", "high", "critical"];


const deliveryStatusSchema = new mongoose.Schema(
    {
        channel: {
            type:     String,
            enum:     NOTIFICATION_CHANNELS,
            required: true,
        },
        status: {
            type:    String,
            enum:    ["pending", "sent", "delivered", "failed"],
            default: "pending",
        },
        sentAt:      { type: Date },
        deliveredAt: { type: Date },
        failReason:  { type: String, trim: true },  // e.g. "Invalid phone number"
    },
    { _id: false }
);


const metadataSchema = new mongoose.Schema(
    {
        relatedModel: {
            type: String,
            enum: ["Bill", "Payment", "Flat", "Apartment", "User"],
        },
        relatedId: {
            type: mongoose.Schema.Types.ObjectId,
        },

        // Structured data for rendering rich notifications without string parsing
        amountDue:   { type: Number },              // for reminder / alert types
        dueDate:     { type: Date },                // for reminder types
        flatNumber:  { type: String, trim: true },  // for context in push body
        billMonth:   { type: String, trim: true },  // e.g. "2025-07"
    },
    { _id: false }
    );

    // ─── Main notification schema ─────────────────────────────────────────────────
    const notificationSchema = new mongoose.Schema(
    {
        // FIX: was missing required — a notification with no recipient is undeliverable
        userId: {
            type:     mongoose.Schema.Types.ObjectId,
            ref:      "User",
            required: [true, "Recipient user ID is required"],
        },

        // FIX: was "Enum" (capital E) — Mongoose silently ignored it,
        // any string passed through with zero validation
        type: {
            type:     String,
            enum:     NOTIFICATION_TYPES,
            required: [true, "Notification type is required"],
            default:  "alert",
        },

        // FIX: added required — an empty notification should never be saveable
        message: {
            type:     String,
            required: [true, "Notification message is required"],
            trim:     true,
            maxlength: [500, "Message cannot exceed 500 characters"],
        },

        // Short subject line for email / push title — separate from full message body
        title: {
            type:    String,
            trim:    true,
            maxlength: [100, "Title cannot exceed 100 characters"],
        },

        // FIX: replaced single channel String with delivery tracking array.
        // Now a single notification can target multiple channels and track
        // each channel's delivery outcome independently.
        deliveryStatus: {
            type:    [deliveryStatusSchema],
            default: [],
        },

        // FIX: added — low-priority welcome vs critical overdue need different
        // handling in the UI and reminder service scheduling
        priority: {
            type:    String,
            enum:    NOTIFICATION_PRIORITIES,
            default: "medium",
        },

        // Read state
        isRead: {
            type:    Boolean,
            default: false,
        },
        // FIX: added — isRead:true tells you it was read, readAt tells you when.
        // Useful for analytics: how long do tenants take to read alerts?
        readAt: {
            type: Date,
        },

        // FIX: added — notifications shouldn't live forever. A rent reminder for
        // last month is irrelevant once paid. TTL index below auto-deletes expired docs.
        expiresAt: {
            type: Date,
        },

        // FIX: structured context replacing the pattern of encoding IDs in message strings
        metadata: {
            type:    metadataSchema,
            default: () => ({}),
        },
    },
    { timestamps: true }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

// FIX: was missing — "fetch my notifications" did a full collection scan
notificationSchema.index({ userId: 1, createdAt: -1 });

// Fetch unread count badge (runs on every page load — must be fast)
notificationSchema.index({ userId: 1, isRead: 1 });

// Filter by type for a user (e.g. "show only payment notifications")
notificationSchema.index({ userId: 1, type: 1 });

// TTL index — MongoDB automatically hard-deletes documents after expiresAt.
// Notifications without expiresAt (null) are never auto-deleted.
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });


// ─── Pre-save hook ────────────────────────────────────────────────────────────

// Auto-set readAt when isRead is toggled to true
notificationSchema.pre("save", function (next) {
    if (this.isModified("isRead") && this.isRead && !this.readAt) {
        this.readAt = new Date();
    }
    next();
});



notificationSchema.methods.markAsRead = async function () {
    if (this.isRead) return this;  // idempotent — no-op if already read
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
        if (status === "sent" || status === "delivered") entry.sentAt = new Date();
        if (status === "delivered") entry.deliveredAt = new Date();
        if (failReason) entry.failReason = failReason;
    } else {
        this.deliveryStatus.push({
        channel,
        status,
        sentAt:      status !== "failed" ? new Date() : undefined,
        failReason:  failReason || undefined,
        });
    }

    this.markModified("deliveryStatus");
    return this.save();
};


notificationSchema.methods.toPublicJSON = function () {
    return {
        _id:            this._id,
        userId:         this.userId,
        type:           this.type,
        title:          this.title,
        message:        this.message,
        priority:       this.priority,
        isRead:         this.isRead,
        readAt:         this.readAt,
        deliveryStatus: this.deliveryStatus,
        metadata:       this.metadata,
        expiresAt:      this.expiresAt,
        createdAt:      this.createdAt,
        updatedAt:      this.updatedAt,
    };
};



notificationSchema.statics.getUnreadCount = async function (userId) {
    return this.countDocuments({ userId, isRead: false });
};

notificationSchema.statics.markAllAsRead = async function (userId) {
    return this.updateMany(
        { userId, isRead: false },
        { $set: { isRead: true, readAt: new Date() } }
    );
};

export const Notification = mongoose.model("Notification", notificationSchema);