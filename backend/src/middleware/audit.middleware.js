import AuditLog from "../models/AuditLog.model.js";

export const auditLogger = (options = {}) => {
    return async (req, res, next) => {
        const startTime = Date.now();

        // Capture original send
        const originalSend = res.send;

        res.send = async function (data) {
        try {
            const duration = Date.now() - startTime;

            // Only log if user exists
            if (req.user) {
            await AuditLog.logAction({
                userId: req.user._id,

                action: options.action || req.method,

                entityType: options.entityType || "Unknown",

                entityId:
                req.params.id ||
                req.body?.id ||
                null,

                description:
                options.description ||
                `${req.method} ${req.originalUrl}`,

                metadata: {
                body: req.body,
                params: req.params,
                query: req.query,
                duration,
                },

                ipAddress: req.ip,
                userAgent: req.headers["user-agent"],

                status: res.statusCode < 400 ? "success" : "failed",
            });
            }
        } catch (err) {
            console.error("Audit log failed:", err.message);
        }

        return originalSend.call(this, data);
        };

        next();
    };
};