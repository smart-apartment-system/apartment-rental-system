import nodemailer from "nodemailer";
import env from "../config/env.js";
import { asyncHandler } from "./asyncHandler.js";

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth:{
        type: 'OAuth2',
        user: env.google.user,
        clientId: env.google.clientId,
        clientSecret:env.google.clientSecret,
        refreshToken: env.google.refreshToken
    }
});

transporter.verify((error,success)=>{
    if(error){
        console.error(`Errorconnecting to email server: ${error}`);
    }else{
        console.log(`Email server is ready to send messages`);
    }
});

export const sendEmail = asyncHandler(async(to, subject, text, html)=>{
    try{
        const info = await transporter.sendMail({
            from: `"Your Name" <${env.google.user}>`,
            to,
            subject,
            text,
            html
        })

        console.log('Message sent: %s', info.messageId);
        console.log('Preview URl: %s', nodemailer.getTestMessageUrl(info));
    }catch(error){
        console.error(`Error sending email: ${error}`)
    }
});