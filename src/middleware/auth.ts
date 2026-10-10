import jwt from "jsonwebtoken"

import type { Request, Response, NextFunction } from "express";

declare global {
    namespace Express {
      interface Request {
        user?: { id: string; role: string };
      }
    }
  }

export function signToken(user : {id : string; role: string}){
    return jwt.sign(user,process.env.JWT_SECRET! , {expiresIn : "6d"})

}
export function requireAuth(req:Request , res: Response, next:NextFunction){
    const header = req.headers.authorization;

    if(!header){
        return res.status(401).json({
            message : "please login first"
        })
    }
    const token = header.replace("Bearer ", " ").trim();
    try{
        const data = jwt.verify(token , process.env.JWT_SECRET!)as {
            id: string, 
            role : string
        };
        req.user = {
            id:  data.id, 
            role : data.role
        }
        next();
    } catch (err: any) {
        console.log("JWT error:", err.message);
        console.log("Header starts with:", header.slice(0, 20));
        return res.status(401).json({ error: "Invalid or expired token" });
      }
}

export function requireRole(role : string){
    return(req:Request, res:Response ,next:NextFunction) => {
        if(req.user?.role !== role){
            return res.status(403).json({
                message : "You are not allowed to do this"
            })
        }
        next();
    };
}