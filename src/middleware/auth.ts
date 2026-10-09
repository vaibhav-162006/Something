import jwt from "jsonwebtoken"

export function signToken(user : {id : string; role: string}){
    return jwt.sign(user,process.env.JWT_SECRET! , {expiresIn : "6d"})

}
export function requireAuth(req , res, next){
    const header = req.headers.authorization;

    if(!header){
        return res.status(401).json({
            message : "please login first"
        })
    }
    const token = header.replace("Bearer ", " ");
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
    } catch {
        return res.status(401).json({
            error : "Invalid or expired token"
        })
    }
}

export function requireRole(role : string){
    return(req, res ,next) => {
        if(req.user?.role !== role){
            return res.status(403).json({
                message : "You are not allowed to do this"
            })
        }
        next();
    };
}