import{Router} from "express"
import { prisma } from "../db";
import {z} from "zod"


const router = Router();
function TimetoMinutes(time : string){
    const parts = time.split(":");
    return Number(parts[0]) * 60 + Number(parts[1]);

}
function minutesToTime(total : number){
    const hours = Math.floor(total/60);
    const minutes = total % 60;
    return String(hours).padStart(2, "0" ) + ":" + String(minutes).padStart(2,"0");
}
const querySchema = z.object({
    date : z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
    serviceId : z.string().min(1),

});

router.get("/:slug/slots" , async(req,res)=>{
const parsed = querySchema.safeParse(req.query);
if(!parsed.success){
    return res.status(400).json({
        error : "No slot is defined"
    })
}
const {date , serviceId} = parsed.data;
const dayStart = new Date(`${date}T00:00:00+05:30`);
if(isNaN(dayStart.getTime())){
    return res.status(400).json({
        error : "The data does not exist "
    })
}
const dayEnd = new Date(dayStart.getTime() + 24*60*60*1000);

const business = await prisma.business.findUnique({
    where: {slug : String(req.params.slug)},
});
if(!business){
    return res.status(404).json({
        error : "Business not found"
    })
}
const service = await prisma.service.findFirst({
    where: {id: serviceId , businessId: business.id , active: true},
});
if(!service){
    return res.status(400).json({
        error : "Service is not found"
    })
}
const weekDay = new Date(`${date}T12:00:00Z`).getUTCDay();
const hours = await prisma.workingHour.findUnique({
    where : {
        businessId_dayOfWeek: {businessId :business.id , dayOfWeek : weekDay},
    },

});
if(!hours){
    return res.json({date , slots: []});
}

const bookings = await prisma.booking.findMany({
    where:{
        businessId : business.id,
        status: "CONFIRMED",
        startsAt: {gte : dayStart , lt: dayEnd },
    },
    select:{
        startsAt : true , endsAt: true
    },
})
const openMinutes = TimetoMinutes(hours.startTime);
const closeMinutes = TimetoMinutes(hours.endTime);
const now = new Date();
const freeSlots:  string[] =[];

for(
    let start = openMinutes;
    start + service.durationMin <= closeMinutes;
    start += service.durationMin
) {
    const time = minutesToTime(start);
    const slotStart = new Date(`${date}:T${time}:00+05:30`);
    const slotEnd = new Date(slotStart.getTime() + service.durationMin *60 *1000);

    const InThePast = slotStart <= now;
    const isTaken = bookings.some((b) => b.startsAt < slotEnd && b.endsAt > slotStart)

    if(!InThePast && !isTaken){
        freeSlots.push(time);
    }
}
res.json({
    date,
    service : {id :service.id , name: service.name , durationMin : service.durationMin},
    slots: freeSlots,
});

});
export default router;