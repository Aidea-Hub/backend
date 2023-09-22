import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { cors } from "./config";
import { FieldValue } from "firebase-admin/firestore";

export const voteIdea = functions.https.onRequest(async (req, res) => {
  cors(req, res, async () => {
    const data = req.body;
    console.log("data", data);
    const ideaId = data.ideaId;
    const userId = data.userId;
    const vote = data.vote;

    if (!ideaId || !userId) {
      res.status(400).send("Missing required data");
      return;
    }

    // Check if a user document already exists in Firestore
    const userRef = admin.firestore().collection("users").doc(userId);

    const userSnapshot = await userRef.get();

    let changeInVote = 0;

    if (userSnapshot.exists) {
      const user = userSnapshot.data()!;
      const newVotes = { ...user.votes };
      if (newVotes[ideaId] && newVotes[ideaId] === vote) {
        console.log("same vote");
        delete newVotes[ideaId];
        changeInVote -= vote;
      } else {
        console.log("no/diff vote");

        changeInVote += 0 - (newVotes[ideaId] || 0) + vote;
        newVotes[ideaId] = vote;
      }

      console.log(newVotes);

      userRef.update({
        votes: newVotes,
      });

      console.log("changeInVote: ", changeInVote);

      admin
        .firestore()
        .collection("ideas")
        .doc(ideaId)
        .update({
          votes: FieldValue.increment(changeInVote),
        });
    }

    res.status(200).send({
      message: `Voted ${vote} Idea ${ideaId} successfully`,
    });
  });
});
