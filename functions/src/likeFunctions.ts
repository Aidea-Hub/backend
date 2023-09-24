import * as functions from "firebase-functions";
import admin from "firebase-admin";
import { cors } from "./config";

export const likeIdea = functions.https.onRequest(async (req, res) => {
  cors(req, res, async () => {
    const data = req.body;
    const ideaId = data.ideaId;
    const userId = data.userId;

    if (!ideaId || !userId) {
      res.status(400).send("Missing required data");
      return;
    }

    // Check if a user document already exists in Firestore
    const userRef = admin.firestore().collection("users").doc(userId);

    const userSnapshot = await userRef.get();

    if (userSnapshot.exists) {
      const user = userSnapshot.data()!;
      const likes = [...user.liked_ideas];
      const index = likes.indexOf(ideaId);
      if (index !== -1) {
        // The value is already in the array, so remove it
        likes.splice(index, 1);
      } else {
        // Append the value to the end of the array
        likes.push(ideaId);
      }

      userRef.update({
        liked_ideas: likes,
      });
    }

    res.status(200).send({
      message: `Liked Idea ${ideaId} successfully`,
    });
  });
});
