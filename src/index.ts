import express from "express";
import cors from "cors";
import helmet from "helmet"
import businessRoutes from "./routes/businesses"
import authRoutes from "./routes/auth";
import bookingRoutes from "./routes/bookings";
import dashboardRoutes from "./routes/Dashboard";
import slotRoutes from "./routes/slots"
import { errorHandler, notFound } from "./middleware/ErrorHandler";
import {authLimiter , genralLimter } from "./middleware/ratelimiter";
const app = express();
app.set("trust proxy" , 1);
app.use(helmet());
app.use(cors());
app.use(express.json({limit : "10Kb"}));
app.use(genralLimter)

app.use("/auth/login" , authLimiter)
app.use("/auth/register" , authLimiter);

app.use("/auth", authRoutes);
app.use("/businesses", businessRoutes);
app.use("/bookings", bookingRoutes);
app.use("/businesses" , dashboardRoutes)
app.use("/businesses", slotRoutes)


app.use(notFound)
app.use(errorHandler)

const port = Number(process.env.PORT) || 3000;
app.listen(port , () => {
    console.log(`Server running on http://localhost:${port}`)
})