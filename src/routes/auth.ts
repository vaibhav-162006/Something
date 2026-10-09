
import { Router } from "express";
import { prisma } from "../db";
import { requireAuth, signToken } from "../middleware/auth";
import {z} from "zod"
const router = Router();

const registerSchema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(8),
    role : z.enum(["OWNER" , "CUSTOMER"]).default("CUSTOMER"),
});

const loginSchema = z.object({
    email : z.string().email(),
    password: z.string().min(1)
});
router.post("/register" , async(req , res) => {
const parsed = registerSchema.safeParse(req.body);
if(!parsed.success){
   return res.status(400).json({
     message : "Pls fill valid Credentials"
    })
}
    const {name , email , password , role} = parsed.data;
    const existing = await prisma.user.findUnique({
        where : { email }
    });
    if(existing) {
        return res.status(409).json({
            message : "Email already registered"
        })
    }
const passwordHash = await Bun.password.hash(password);
const user = await prisma.user.create({
    data : {name , email , passwordHash , role}
})
const token = signToken({
    id : user.id,
    role : user.role
})
res.status(201).json({
    token,
    user: {id : user.id , name : user.name , email : user.email , role : user.role}
})
});

router.post("/login" , async (req ,res) => {
    const parsed = loginSchema.safeParse(req.body);
    if(!parsed.success){
        return res.status(409).json({
            message : "User is not found "
        })
    }
    const{email , password} = parsed.data;
    const user = await prisma.user.findUnique({
        where : { email }
    });
    const valid = user && (await Bun.password.verify(password ,  user.passwordHash));
    if(!user || !valid){
        return res.status(401).json({
            error: "Invlaid email or password"
        });
    }
    const token = signToken({
        id : user.id,
        role: user.role,
    });
    res.json({
        token , 
        user : {id : user.id , name : user.name , email : user.email , role : user.role},
    })
})

router.get("/me" , requireAuth , async(req,res) => {
    const user = await prisma.user.findUnique({
        where : {id : req.user!.id},
        select : {id : true, name: true , email: true, role : true},
    })
    res.json({
        user
    })
})
export default router;