import * as functions from "firebase-functions";
import admin from "firebase-admin";
import { cors } from "./config";

export const subscribe = functions.https.onRequest(async (req, res) => {
  cors(req, res, async () => {
    const data = req.body;
    const userId = data.userId;
    const status = data.status;

    if (!userId || status === undefined) {
      res.status(400).send("Missing required data");
      return;
    }

    // Check if a user document already exists in Firestore
    const userRef = admin.firestore().collection("users").doc(userId);

    const userSnapshot = await userRef.get();

    if (userSnapshot.exists) {
      userRef.update({
        is_plus: status,
      });
    }

    res.status(200).send({
      message: `success`,
    });
  });
});
