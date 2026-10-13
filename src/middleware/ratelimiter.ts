import rateLimit from "express-rate-limit"
//strict login or register like having tries of 15 per IP
export const authLimiter  = rateLimit({
windowMs: 15*60*1000, // 15minutes window
limit:10,
standardHeaders: true,// tells the client how many requests are
legacyHeaders: false,
message:{error : "Too many attempts. Please try again later in 15 minutes."},
});

export const genralLimter = rateLimit({
    windowMs : 60*1000,
    limit : 100,
    standardHeaders : true,
    legacyHeaders: false,
    message : {error : "Too many requests .Slow down a little"},
});