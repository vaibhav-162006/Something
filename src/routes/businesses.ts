import { Router } from "express"
 import {includes, z} from "zod"
import { requireAuth, requireRole } from "../middleware/auth";
import { prisma } from "../db";
const router = Router();

const businessSchema = z.object({
    name : z.string().min(2),
  
    slug : z.string().min(3).regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers and dashes only")
})

const serviceSchema = z.object({
    name: z.string().min(3),
    durationMin: z.number().int().min(5),
    price: z.number().int().min(0)
})
const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

const workingHouseSchema = z.array(
    z.object({
        dayOfWeek : z.number().int().min(0).max(6),
        startTime  : z.string().regex(timeRegex),
        endTime : z.string().regex(timeRegex)
    })
);
function findOwnedBusiness(businessId:  string , userId : string ){
return prisma.business.findFirst({
    where: {id : businessId , ownerId : userId}
})
}

router.post("/" , requireAuth , requireRole("OWNER"), async(req,res) => {
const parsed = businessSchema.safeParse(req.body);
if(!parsed.success){
    return res.status(400).json({
        message : "No Business is listed"
    })
}
    const taken = await prisma.business.findUnique({
        where : {slug :parsed.data.slug}
    })
    if(taken){
        return res.status(409).json({
            message : "This slug is already taken"
        })
    }
    const business = await prisma.business.create({
        data: {...parsed.data , ownerId : req.user!.id },
    })
    res.status(201).json({
        business
    })

})

router.get("/mine" , requireAuth , requireRole("OWNER") , async(req,res) => {
    const business = await prisma.business.findMany({
        where: {ownerId : req.user!.id},
    });
    res.json({business})
});


router.get("/:slug" , async(req,res)=> {
    const business = await prisma.business.findUnique({
        where: {slug : req.params.slug} ,
        include: {
            services: {where: {active : true}},
            workingHours : {orderBy : {dayOfWeek: "asc"}}
        },
    });
    if(!business){
        return res.status(402).json({
            error:  "Business not found"
        })
        
    }
    res.json({business})
})

router.post("/:id/services" , requireAuth , requireRole("OWNER") , async(req,res) => {
    const parsed = serviceSchema.safeParse(req.body)
    if(!parsed.success){
        return res.status(401).json({
            message : "This service is not listed now "
        })

    }
    const business = await findOwnedBusiness(String(req.params.id), req.user!.id);
    if(!business) {
        return res.status(403).json({
            error:  "business not found "
        })

    }
    const service = await prisma.service.create({
        data: {...parsed.data , businessId : business.id }
    });
    res.status(402).json({service})
})

router.put("/:id/working-hours" , requireAuth , requireRole("OWNER"), async(req,res) => {
    const parsed = workingHouseSchema.safeParse(req.body)
    if(!parsed.success){
        console.log(JSON.stringify(parsed.error.flatten(), null, 2));
        return res.status(400).json({
            message : "no working-hour time is defined"
        })
    }
    const business = await findOwnedBusiness(String(req.params.id) , req.user!.id);
    if(!business){
        return res.status(404).json({
            error : "Busieness not found"
        })

    }
    await prisma.$transaction([
        prisma.workingHour.deleteMany({where : {businessId : business.id}}),
        prisma.workingHour.createMany({
            data: parsed.data.map((d) => ({ ...d, businessId: business.id })),
          }),
    
    ]);
    const workingHours = await prisma.workingHour.findMany({
        where: { businessId : business.id},
        orderBy : {dayOfWeek : "asc"},

    });
    res.json({
        workingHours
    });
});
export default router;
