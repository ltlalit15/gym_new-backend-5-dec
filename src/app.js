// const express = require('express');
// const env = require('./config/env');
// const routes = require('./routes');
// const errorHandler = require('./middlewares/errorHandler');

// const app = express();

// app.use(express.json());
// app.use('/api', routes);

// app.use(errorHandler);

// module.exports = app;



import express from "express";
import cors from "cors";
import morgan from "morgan";
import { ENV } from "./config/env.js";
import router from "./routes/index.js";
import { errorHandler } from "./middlewares/errorHandler.js";


const app = express();

// middlewares


app.use(
  cors({
    origin: [
      "http://localhost:5174",
      "http://localhost:5173",
      "http://localhost:5175"

    ],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(morgan("dev"));

// main routes
app.use("/api", router);

// health check route
app.get("/", (req, res) => {
  res.json({ message: "Gym Management API is running" });
});

// error handler (last)
app.use(errorHandler);

export default app;
