import mongoose, { Schema } from "mongoose";

const staffSchema = new Schema(
    {
        name: {
        type: String,
        required: true,
        trim: true,
        },

        role: {
        type: String,
        enum: ["security", "cleaner", "manager"],
        default: "security",
        index: true,
        },

        phone: {
        type: String,
        required: true,
        match: [/^\+?[1-9]\d{7,14}$/, "Invalid phone number"],
        index: true,
        },

        apartmentId: {
        type: Schema.Types.ObjectId,
        ref: "Apartment",
        required: true,
        index: true,
        },

        shift: {
        type: String,
        enum: ["morning", "evening", "night"],
        default: "morning",
        },

        salary: {
        type: Number,
        min: 0,
        },

        joiningDate: {
        type: Date,
        default: Date.now,
        },

        isActive: {
        type: Boolean,
        default: true,
        index: true,
        },
    },
    { timestamps: true }
);



staffSchema.index({ apartmentId: 1, role: 1 });


staffSchema.virtual("profile").get(function () {
    return `${this.name} (${this.role})`;
});



staffSchema.methods.deactivate = async function () {
    this.isActive = false;
    return this.save();
};



staffSchema.methods.toPublicJSON = function () {
    return {
        _id: this._id,
        name: this.name,
        role: this.role,
        phone: this.phone,
        shift: this.shift,
        salary: this.salary,
        isActive: this.isActive,
        apartmentId: this.apartmentId,
    };
};


const Staff = mongoose.model("Staff", staffSchema);
export default Staff;