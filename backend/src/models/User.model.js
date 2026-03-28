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
        email:{
            type: String,
            required: [true, "Email is required"],
            unique: true,
            trim:true,
            lowercase:true,
            match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"],
        },
        passwordHash:{
            type: String,
            required: [true, "Password is required"],
            select:false
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

userSchema.pre("save",async function(next){
    if(!this.isModified('passwordHash')){
        return next();
    }
    this.passwordHash = await bcrypt.hash(this.passwordHash,10);
    next();
});

userSchema.methods.comparePassword = async function (plainPassword) {
    return bcrypt.compare(plainPassword, this.passwordHash);
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

userSchema.methods.generateTemporaryToken = function(){
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

userSchema.methods.toPublicJSON = function () {
    return {
        _id:             this._id,
        name:            this.name,
        email:           this.email,
        phone:           this.phone,
        role:            this.role,
        flatId:          this.flatId,
        isEmailVerified: this.isEmailVerified,
        createdAt:       this.createdAt,
        updatedAt:       this.updatedAt,
    };
};

export const User = mongoose.model("User", userSchema);