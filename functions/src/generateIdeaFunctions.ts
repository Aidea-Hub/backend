import * as functions from "firebase-functions";
import admin from "firebase-admin";
import { cors } from "./config";
import keywordExtractor from "keyword-extractor";
import natural from "natural";

const COST_TO_GENERATE_IDEA = 10;

const LOREM_IPSUM = `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Cras ac urna ut nisl volutpat venenatis. Duis dapibus interdum turpis, non egestas nibh tincidunt in. Quisque eu orci enim. Morbi a consectetur urna. Nam bibendum, nulla eu malesuada pellentesque, diam urna sagittis sapien, sed tincidunt tellus enim at ligula. Praesent sollicitudin quam est. Vivamus ut purus at ligula pulvinar maximus. Nulla tempor sed ligula non rutrum.

Sed quis placerat orci. Phasellus justo diam, condimentum at porta at, auctor vitae dui. In in erat eu tellus convallis sagittis ut et nulla. Etiam a fringilla lorem. Mauris cursus maximus metus sed bibendum. Praesent auctor est eget velit commodo malesuada. Pellentesque tincidunt suscipit ipsum, eget congue justo consectetur sit amet. Fusce dictum vulputate sapien eget ultrices. Vivamus eleifend viverra tellus vitae rhoncus. Proin imperdiet dapibus mauris id consequat.

Nunc magna nisl, rutrum ut elit in, pellentesque pellentesque erat. Nulla facilisi. Curabitur et orci vitae turpis malesuada ornare. Duis mattis metus libero, ut tempus nisi lobortis in. Fusce a hendrerit sem. Quisque eleifend pulvinar mauris eget scelerisque. Maecenas consectetur, massa eu aliquam mollis, justo quam auctor ipsum, nec ultricies elit enim quis nunc. Nullam lobortis faucibus nisl vitae varius. Quisque imperdiet ligula eget sapien tincidunt, sit amet congue ligula tristique. Donec eu commodo ipsum, vel commodo nibh. Sed accumsan libero non turpis sodales ullamcorper. Nam eu lectus placerat, consectetur nisi quis, consectetur mi.
`;

// To be called once the idea's title and description is decided
export const generateIdeaContent = functions.https.onRequest(
  async (req, res) => {
    cors(req, res, async () => {
      const data = req.body;
      const userId = data.userId;
      const title = data.title;
      const description = data.description;

      if (!userId || !title || !description) {
        res.status(400).send("Missing required data");
        return;
      }

      // Check if a user document already exists in Firestore
      const userRef = admin.firestore().collection("users").doc(userId);
      const userSnapshot = await userRef.get();

      if (!userSnapshot.exists) {
        res.status(400).send("User does not exist");
        return;
      }

      // Get the current number of credits the user has
      const currentCredits = userSnapshot.data()!.credits;

      // Check if the user has enough credits
      if (currentCredits < COST_TO_GENERATE_IDEA) {
        res.status(400).send("Insufficient credits");
        return;
      }

      // Decrement user credits by 10
      await userRef.update({
        credits: admin.firestore.FieldValue.increment(COST_TO_GENERATE_IDEA),
      });
      const url = await generateImageUrl(title);
      console.log(url);
      // Create a new idea document in the "ideas" collection
      const ideaRef = admin.firestore().collection("ideas").doc();
      await ideaRef.set({
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        description: description,
        keywords: getSearchKeyWords(title, description),
        title: title,
        url: url,
        user_id: userId,
        votes: 0,
      });

      const ideaId = ideaRef.id;

      // TODO replace with actual api/fn calls to generate the respective content, can generate in parallel
      const productCapabilities = LOREM_IPSUM;
      const competitiveLandscapeAndMoat = LOREM_IPSUM;
      const productLifecycle = LOREM_IPSUM;
      const businessModel = LOREM_IPSUM;
      const branding = LOREM_IPSUM;
      const uiux = LOREM_IPSUM;

      // Create a new content document in the "idea_contents" collection
      const ideaContentRef = admin
        .firestore()
        .collection("idea_contents")
        .doc();
      await ideaContentRef.set({
        idea_id: ideaId,
        productCapabilities: productCapabilities,
        competitiveLandscapeAndMoat: competitiveLandscapeAndMoat,
        productLifecycle: productLifecycle,
        businessModel: businessModel,
        branding: branding,
        uiux: uiux,
      });

      res.status(200).send({
        message: `Idea ${ideaId} and its content were successfully created`,
      });
    });
  }
);

const generateImageUrl = async (title: string): Promise<string> => {
  const extractedKeywords = keywordExtractor.extract(title, {
    language: "english",
    remove_digits: true,
    return_changed_case: true,
    remove_duplicates: true,
  });

  const queryUrl = `https://source.unsplash.com/1600x900/?${encodeURIComponent(
    extractedKeywords.join(",")
  )}`;

  const data = await fetch(queryUrl);
  console.log(data.url);
  return data.url;
};

const getSearchKeyWords = (title: string, description: string) => {
  const extractedKeywords = keywordExtractor.extract(
    `${title} ${description}`,
    {
      language: "english",
      remove_digits: true,
      return_changed_case: true,
      remove_duplicates: true,
    }
  );
  return extractedKeywords.map((keyword: string) =>
    natural.PorterStemmer.stem(keyword)
  );
};
