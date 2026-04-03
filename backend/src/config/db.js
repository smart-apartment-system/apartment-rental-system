import mongoose from "mongoose";
import env from "./env.js";
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(env.db.uri);

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;