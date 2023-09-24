import * as functions from "firebase-functions";
import admin from "firebase-admin";

const DOWNVOTE_THRESHOLD = -2;

// Delete all downvoted ideas below threshold that are NOT liked
// TODO: cache these already liked ideas in a collection
export const scheduleDeleteDownvotedIdeas = functions.pubsub
  .schedule("every 24 hours")
  .onRun(async (context) => {
    console.log("Ran on: ", new Date().toLocaleDateString());
    const ideasRef = admin.firestore().collection("ideas");
    const usersRef = admin.firestore().collection("users");

    const ideasToDelete: any[] = [];
    const unlikedIdeasSnapshot = await ideasRef
      .where("votes", "<", DOWNVOTE_THRESHOLD)
      .get();

    unlikedIdeasSnapshot.forEach(async (doc) => {
      const likedUsersSnapshot = await usersRef
        .where("liked_ideas", "array-contains", doc.id)
        .get();

      if (likedUsersSnapshot.empty) {
        console.log("deleted img id: %s tags: %s", doc.id, doc.data().tags);
        ideasToDelete.push(doc.ref.delete());
      } else {
        console.log("ignored img id: ", doc.id);
      }
    });

    await Promise.all(ideasToDelete);
  });
