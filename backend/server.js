import app from "./src/app.js";
import dotenv from "dotenv";
import connectDB from "./src/config/db.js";

dotenv.config({
    path: "./.env"
});

const port = process.env.PORT || 3000;

connectDB()
    .then(()=>{
        app.listen(port,()=>{
            console.log(`Server is running on port ${port}`);
        });
        console.log("Database connected successfully");
    })
    .catch((error)=>{
        console.error("Database connection failed:",error);
        process.exit(1);
    });

app.get("/",(req,res)=>{
    res.send("API is working");
})
