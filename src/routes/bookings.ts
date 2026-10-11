import {Router} from "express";
import{z} from "zod";
import { requireAuth, requireRole } from "../middleware/auth";
import { prisma } from "../db";


const router = Router();
function TimetoMinutes(time :string){
const parts = time.split(":");
const hours = Number(parts[0]);
const minutes = Number(parts[1]);
return hours * 60 + minutes;
}
const bookingSchema = z.object({
  serviceId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM"),
});

router.post("/" , requireAuth , requireRole("CUSTOMER") , async(req,res) =>{
    const parsed = bookingSchema.safeParse(req.body);
    if(!parsed.success){
        return res.status(400).json({
            error: parsed.error.flatten().fieldErrors
        })
    }
    const {serviceId , date ,time} = parsed.data;
const startAt = new Date(`${date}T${time}:00+05:30`);
if(isNaN(startAt.getTime())){
    return res.status(400).json({
        error : "The data does not exist"
    })
}
if(startAt <= new Date()){
    return res.status(400).json({
        error: "Please a pick a time in future"
    })
}
const service = await prisma.service.findFirst({
    where : {id : serviceId , active : true}
})
if(!service){
    return res.status(404).json({
        error : "service is not found"
    })
}
const endsAt = new Date(startAt.getTime() + service.durationMin * 60 * 1000);

const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
const hours = await prisma.workingHour.findUnique({
    where :{
        businessId_dayOfWeek: {
            businessId : service.businessId,
            dayOfWeek: weekday,
        } ,
    },
});
if(!hours){
    return res.status(403).json({
        error : "This busieneess is closed that day"
    })
}
const startMinutes = TimetoMinutes(time);
const openMinutes = TimetoMinutes(hours.startTime);
const closeMinutes = TimetoMinutes(hours.endTime);
const endMinutes = startMinutes + service.durationMin;

const tooEarly = startMinutes < openMinutes;
const tooLate = endMinutes > closeMinutes;
if(tooEarly || tooLate){
    return res.status(400).json({
        error :  "Outside Opening hours"
    })
}

const isOnGrid = (startMinutes - openMinutes) % service.durationMin === 0;
if(!isOnGrid){
    return res.status(400).json({
        error :  "Not a valid slot time"
    })
}
try{
    const booking = await prisma.booking.create({
        data: {
            businessId : service.businessId,
            serviceId : service.id,
            customerId : req.user!.id,
            startsAt: startAt,
            endsAt : endsAt

        },
        
    });
    return res.status(201).json( {booking} );
} catch(error : any){
   const message = String(error?.message?? " ");
   const slotTaken =
      message.includes("booking_no_overlap") ||
      message.includes("23P01") ||
      message.includes("40P01") ||
      message.includes("deadlock");

   if(slotTaken){
    return res.status(409).json({
        error:  "This slot was just taken. Please pick another Time"
    })
   }
   console.error(error);
   return res.status(500).json({
    error: "could not create Booking"
   })
}

} );

router.get("/mine" , requireAuth , async(req,res) => {
    const bookings = await prisma.booking.findMany({
        where : {customerId : req.user!.id},
        include: {
            service: {select : {name : true , price: true}},
            business:{select : {name : true, slug: true}},
        },
        orderBy: {startsAt : "asc"}
    });
    res.json({bookings})
})

router.delete("/:id" , requireAuth , async(req,res) => {
    const booking = await prisma.booking.findUnique({
        where: {id : String(req.params.id)},
        include: {business : true},
    });
    if(!booking){
        return res.status(400).json({
            error : "Booking not found"
        });
    }
    const isTheCustomer = booking.customerId === req.user!.id;
    const isTheOwner = booking.business.ownerId === req.user!.id;
    if(!isTheCustomer || !isTheCustomer){
        return res.status(403).json({
            error : "You are not allowed to cancel this"
        
        })
    }
        if(booking.status !== "CONFIRMED"){
            return res.status(400).json({
                error : "Booking is already" + booking.status
            })
        }
        const cancelled = await prisma.booking.update({
            where: {id : booking.id},
            data: {status :  "CANCELLED"},
        });
        res.json({booking: "CANCELLED"});
    
})
export default router;