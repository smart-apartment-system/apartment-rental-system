import mongoose, { Schema } from "mongoose";

const expenseSchema = new Schema(
    {
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

        amount: {
        type: Number,
        required: true,
        min: 0,
        },

        category: {
        type: String,
        enum: [
            "repair",
            "electricity",
            "water",
            "staff",
            "maintenance",
            "security",
            "other",
        ],
        default: "other",
        index: true,
        },

        paymentMethod: {
        type: String,
        enum: ["cash", "upi", "bank_transfer"],
        default: "cash",
        },

        vendor: {
        name: String,
        phone: String,
        },

        date: {
        type: Date,
        default: Date.now,
        index: true,
        },

        notes: {
        type: String,
        trim: true,
        },

        receiptUrl: {
        type: String, // file upload link
        },

        isActive: {
        type: Boolean,
        default: true,
        index: true,
        },
    },
    { timestamps: true }
);



expenseSchema.index({ apartmentId: 1, date: -1 });
expenseSchema.index({ apartmentId: 1, category: 1 });



expenseSchema.virtual("monthYear").get(function () {
    const d = new Date(this.date);
    return `${d.getMonth() + 1}-${d.getFullYear()}`;
});



expenseSchema.methods.toPublicJSON = function () {
    return {
        _id: this._id,
        apartmentId: this.apartmentId,
        title: this.title,
        amount: this.amount,
        category: this.category,
        paymentMethod: this.paymentMethod,
        vendor: this.vendor,
        date: this.date,
        notes: this.notes,
        receiptUrl: this.receiptUrl,
    };
};


const Expense = mongoose.model("Expense", expenseSchema);
export default Expense;