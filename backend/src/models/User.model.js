import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";


const paymentBehaviorSchema = new mongoose.Schema(
    {
        avgDaysLate : {
            type: Number,
            default: 0
        },
        lateCount:{
            type: Number,
            default: 0
        },
        earlyCount:{
            type: Number,
            default: 0
        },
        lastPaidOn: {
            type: Date
        },
        riskScore: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        }
    }, 
    {_id: false}
);

const userSchema = new mongoose.Schema(
    {
        name:{
            type: String,
            required: [true, "Name is required"],
            trim: true,
        },
        username:{
            type:String,
            required: [true, "username is required"],
            unique: true,
            trim:true,
            lowercase:true,
        },
        email:{
            type: String,
            required: [true, "Email is required"],
            unique: true,
            trim:true,
            lowercase:true,
            match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"],
        },
        password: {
            type: String,
            required: [true, "Password is required"],
            minlength: [6, "Password must be at least 6 characters"],
            select: false
        },
        role: {
            type: String,
            enum: ["owner","tenant","admin"],
            default: "owner"
        },

        phone:{
            type: String,
            required: [true, "Phone number is required"],
            unique: true,
            trim: true,
            match:    [/^\+?[1-9]\d{7,14}$/, "Please enter a valid phone number"],
        },
        flatId:{
            type: mongoose.Schema.Types.ObjectId,
            ref:  "Flat",
            default: null
        },
        isEmailVerified:{
            type: Boolean,
            default: false
        },
        forgotPasswordToken:{
            type: String,
            select: false,
        },
        forgotPasswordTokenExpiry:{
            type: Date,
            select: false,
        },
        refreshToken:{
            type: String,
            select: false,
        },
        emailVerificationToken:{
            type: String,
            select: false,
        },
        emailVerificationTokenExpiry:{
            type: Date,
            select: false,
        },
        paymentBehavior: {
        type: paymentBehaviorSchema,
        default: () => ({}),  
        },
    },
    {timestamps:true}
);

userSchema.index({ flatId: 1, role: 1 });
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ phone: 1 }, { unique: true });

userSchema.pre("save", async function () {
    if (this.isModified("email")) {
        this.email = this.email.toLowerCase();
    }

    if (this.isModified("username")) {
        this.username = this.username.toLowerCase();
    }

    if (this.isModified("password")) {
        this.password = await bcrypt.hash(this.password, 10);
    }
});

userSchema.methods.comparePassword = async function (plainPassword) {
    return bcrypt.compare(plainPassword, this.password);
};

userSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        {
        _id:   this._id,
        email: this.email,
        phone: this.phone,
        role:  this.role,   // include role so middleware can skip a DB lookup
        },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "1d" }
    );
};
userSchema.methods.isResetTokenExpired = function () {
    return this.forgotPasswordTokenExpiry < Date.now();
};

userSchema.methods.generateRefreshToken = function(){
    return jwt.sign(
        //payload
        {
            _id: this._id,
        },
        //secret key
        process.env.REFRESH_TOKEN_SECRET,
        //options
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY || "7d"
        }
    
    )
}

userSchema.methods.generateResetToken = function(){
    const unHashedToken= crypto.randomBytes(20).toString("hex");
    
    const hashedToken = crypto
        .createHash("sha256")
        .update(unHashedToken)
        .digest("hex")
    
    const tokenExpiry = new Date(Date.now() + 15 * 60 * 1000);// 15 minutes
    
    return {hashedToken,unHashedToken, tokenExpiry};
}

/**
 * Return a safe public representation of the user — call this before sending
 * responses so sensitive fields never accidentally leak.
 */

userSchema.methods.toJSON = function () {
    const user = this.toObject();
    delete user.password;
    delete user.refreshToken;
    delete user.forgotPasswordToken;
    return user;
};

const User = mongoose.model("User", userSchema);
export default User;