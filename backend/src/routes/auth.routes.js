import {Router} from 'express';
import {loginUser, registerUser, logoutUser, verifyEmail, logoutUserAll, refreshAccessToken, resendEmailOtp} from "../controllers/auth.controller.js"
import { verifyJWT } from '../middleware/auth.middleware.js';

const authRouter = Router();

authRouter.post("/register",registerUser);
authRouter.post("/login",loginUser);
authRouter.post("/verify-email",verifyEmail);
authRouter.post("/resend-email-otp",resendEmailOtp);
authRouter.get("/logout",verifyJWT,logoutUser);
authRouter.get("/logout-all",verifyJWT,logoutUserAll);
authRouter.get("/refresh-token",verifyJWT, refreshAccessToken);

export default authRouter;