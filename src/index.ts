import express from "express";
import cors from "cors";
import businessRoutes from "./routes/businesses"
import authRoutes from "./routes/auth";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/businesses", businessRoutes);


const port = Number(process.env.PORT) || 3000;
app.listen(port , () => {
    console.log(`Server running on http://localhost:${port}`)
})