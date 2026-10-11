import { Router } from "express";
import { z } from "zod" 
import { requireAuth, requireRole } from "../middleware/auth";
import { prisma } from "../db";
const router = Router();

const querySchema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
})

router.get("/:id/bookings", requireAuth, requireRole("OWNER"), async (req  , res) => {
    const parsed = querySchema.safeParse(req.query);
    if(!parsed.success){
        return res.status(400).json({
            error : "Invalid"
        })
    }
    const {date} = parsed.data;

    const business = await prisma.business.findFirst({
        where : {id : String(req.params.id) , ownerId : req.user!.id},
    });
    if(!business){
        return res.status(404).json({
            error : "Business not found"
        })
    }
    const dayStart = new Date(`${date}T:00:00+05:30`);
    if(isNaN(dayStart.getTime())){
        return res.status(400).json({
            error : "That data does not exist"
        })
    }
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

    const bookings = await prisma.booking.findMany({
        where: {
            businessId  : business.id,
            status : "CONFIRMED",
            startsAt: {gte : dayStart , lt : dayEnd}
        },
        include :{
            customer :{select :{name : true , email : true}},
            service : {select : {name : true , durationMin : true , price  : true}},
        },
        orderBy : {startsAt : "asc"},
    });
    const list = bookings.map((b) => {
        const local = new Date(b.startsAt.getTime() + 330 * 60 * 1000);
        return{
            id : b.id,
            time : local.toISOString().slice(11,16),
            customer : b.customer.name,
            customerEmail :  b.customer.email,
            service : b.service.name,
            price : b.service.price,
        };
    });
    const totalRevenue = list.reduce((sum , b) => sum + b.price , 0);
    res.json({
        date , 
        count  : list.length,
        totalRevenue ,
        bookings : list
    });
})
export default router;