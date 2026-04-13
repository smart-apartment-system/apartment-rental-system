import {Router} from 'express';
import {loginUser, registerUser, logoutUser, verifyEmail, logoutUserAll, refreshAccessToken, resendEmailOtp, forgotPassword, verifyForgotPasswordOtp, resetPassword} from "../controllers/auth.controller.js"
import { verifyJWT } from '../middleware/auth.middleware.js';

const authRouter = Router();

authRouter.post("/register",registerUser);
authRouter.post("/verify-email",verifyEmail);
authRouter.post("/resend-otp",resendEmailOtp);

authRouter.post("/login",loginUser);
authRouter.get("/refresh-token", refreshAccessToken);

authRouter.get("/logout",verifyJWT,logoutUser);
authRouter.get("/logout-all",verifyJWT,logoutUserAll);

authRouter.post("/forgot-password", forgotPassword);
authRouter.post("/verify-reset-otp", verifyForgotPasswordOtp);
authRouter.post("/reset-password",resetPassword);

export default authRouter;