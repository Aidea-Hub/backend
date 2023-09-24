import corsLib from "cors";
import admin from "firebase-admin";

admin.initializeApp();
const allowedOrigins = ["http://localhost:3000"];

export const cors = corsLib({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
});

// export const cors = corsLib({ origin: true });
