
import type {Request , Response , NextFunction} from "express";

export function notFound(_req: Request , res : Response){
    res.status(404).json({
        error : "Route not found"
    })
}
export function errorHandler(
    err : any,
    _req : Request,
    res: Response,
    next : NextFunction

){
    const status = err.status ?? err.statusCode;
    if(err.type === "entity.parsed.failed"){
        return res.status(400).json({
            error: "Request body is not valid JSON"
        });
    }
    if(err.type === "entity.too.large"){
        return res.status(413).json({
            error : "Request body is too large"
        })
    };
    if(typeof status === "number" && status >= 400 && status < 500){
         return res.status(status).json({ error: "Bad request" });
    }
    console.error(err);
    res.status(500).json({
        error : "Something went wrong"
    })
}