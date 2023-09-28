import * as functions from "firebase-functions";
import admin from "firebase-admin";
import { cors } from "./config";
import keywordExtractor from "keyword-extractor";
import natural from "natural";
import axios from "axios";

const COST_TO_GENERATE_IDEA = 10;

const API_REFLECTION_URL = process.env.API_GENERATE_REFLECTION || "";
const API_RESEARCH_URL = process.env.API_GENERATE_RESEARCH || "";

const generateReflection = async (
  title: string,
  description: string,
  prompt: string,
  format: string
) => {
  try {
    const response = await axios.post(API_REFLECTION_URL, {
      prompt,
      format,
      title,
      description,
    });
    return response.data.response;
  } catch (error) {
    console.error("Error making API call:", error);
    return "Failed to generate response, please contact us on Discord for assistance.";
  }
};

const generateResearch = async (description: string) => {
  try {
    const response = await axios.post(API_RESEARCH_URL, {
      description,
    });
    return response.data.response;
  } catch (error) {
    console.error("Error making API call:", error);
    return "Failed to generate response, please contact us on Discord for assistance.";
  }
};

const productCapabilitiesPrompt =
  "For the following idea, suggest 10 of the most useful and innovative product capabilities. Avoid the common pitfall of failing to consider how the product serves the problem in the process. Consider if the product have the capabilities to succeed in the chosen problem space.";
const productCapabilitiesFormat = `Product Capabilities: <List of product capabilities, elaborating on each product capability>
Conclusion: <Conclusion of product capabilities>
`;

const moatPrompt =
  "For the given product idea, identify 2 to 3 potential moats or sustainable competitive advantages. These moats should protect its market position, deter new entrants, and prevent existing competitors from replicating its success. Example: One of Apple's moat is its integrated ecosystem of products. Apple's products, from iPhone, Macs, and services like iCloud, are tightly integrated into a single ecosystem, creating a seamless user experience that is difficult for competitors to match. This tight integration also makes it difficult for consumers to switch out of Apple.";
const moatFormat = `Moat: <List of moats, elaborating on each moat>
Conclusion: <Conclusion of moats>
`;

const productLifecyclePrompt =
  "For the given product idea it is in the introduction stage. Outline its journey through the product life cycle. Highlight challenges and strategies for each stage and how to achieve product-market fit during growth. Emphasize user acquisition tactics in the introduction and their evolution in later stages.";
const productLifecycleFormat = `Introduction Stage:
- Steps: <Steps for introduction>
- Challenges: <Challenges and tactics for user acquisition>
- Strategies: <Strategies for engagement>

Growth Stage:
- Steps: <Steps for growth>
- Product-Market Fit: <Strategies for fit>
- Evolution of Tactics: <Changes in user acquisition tactics>

Maturity Stage:
- Steps: <Steps for maturity>
- Challenges: <Challenges faced>
- Strategies: <Strategies to maintain user base>

Decline Stage:
- Steps: <Steps for decline>
- Challenges: <Challenges faced>
- Strategies: <Revitalization strategies>

Conclusion:
- Summary: <Brief overview of the product's lifecycle journey>
`;

const businessModelPrompt =
  "For the following idea, outline a monetization and pricing strategy considering costs, value, and competition. Emphasize the suitability of the strategy for the product's stage, target users, and problem space. Discuss potential revenue streams and factors influencing pricing decisions.";
const businessModelFormat = `Cost-Based Pricing:
- Production Costs: <Costs associated with producing and maintaining the product>
- Desired Profit Margin: <Targeted profit margin>

Value-Based Pricing:
- User Benefits: <Benefits the product provides>
- Perceived Value: <Value perceived by users>

Competition-Based Pricing:
- Competitor Pricing: <How competitors price similar products>
- Product Comparison: <Differences and unique selling points of your product vs. competition>

Monetization Strategy:
- Strategy Details: <Details of the chosen monetization method, e.g., subscription, one-time payment>
- Revenue Streams: <Possible revenue streams for the product>
- Currency of Success: <If not monetary, other metrics of success, e.g., volume of messages>

Conclusion:
- Strategy Justification: <Why the chosen pricing strategy is suitable for target users and problem space>
- Influencing Factors: <Factors that influenced the pricing decisions, such as production costs, perceived value, competition>
`;

const brandingPrompt =
  "For the following idea, define a compelling brand identity by suggesting a product name and designing a logo. Consider factors like name length, reproducibility, domain availability, cultural references, and potential resemblances. Discuss the rationale behind the name, potential alternatives, and the significance of the chosen logo.";
const brandingFormat = `Product Name:
- Suggested Name: <Proposed product name>
- Meaning Behind the Name: <Rationale or story behind the name>
- Alternatives Considered: <Other names that were thought of>
- Factors Considered: <Aspects like domain availability, cultural implications, and more>

Logo Design:
- Logo Description: <Brief description of the logo's design>
- Significance: <What the logo represents and its connection to the product>
- Design Challenges: <Any challenges faced during the design process and how they were addressed>
- Inspirations: <Any sources of inspiration, such as Pinterest, Dribbble, etc.>

Conclusion:
- Brand Identity Justification: <Why the chosen name and logo best represent the product's identity>
- Potential Impact: <How this branding might influence the product's perception and recognition in the market>
`;

const uiuxPrompt =
  "Given a product's details, define both the user experience (UX) and user interface (UI). Describe key workflows for optimal user interaction and the rationale behind their design. Highlight UI considerations tailored to specific features and functionalities. Reflect on transparency, ethics, privacy, and user empowerment, especially in decision-making features. Discuss design prototypes and the final design choices.";
const uiuxFormat = `Sample Key Workflows:
- Workflow 1: <Description and reasoning>
- Workflow 2: <Description and reasoning>
- Workflow 3: <Description and reasoning>

User Experience Considerations:
- Branding Synergy: <How UX decisions resonate with the brand>
- User Emotions & Connections: <How the UX design fosters certain feelings or memories>
- Feedback & Iteration: <Feedback sources and changes made based on feedback>

User Interface Considerations:
- Transparency & Trust: <How the UI communicates the capabilities and limitations of features>
- Ethical Considerations: <Design choices made to ensure ethical interactions>
- Privacy & Data Collection: <How the UI informs users about data usage and collection>
- User Empowerment: <UI elements that give users control over automated actions or recommendations>

Conclusion:
- Overall Strategy: <Summary of the holistic design strategy for both UX and UI>
`;
// To be called once the idea's title and description is decided
export const generateIdeaContent = functions
  .runWith({
    timeoutSeconds: 300,
  })
  .https.onRequest(async (req, res) => {
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
        credits: admin.firestore.FieldValue.increment(-COST_TO_GENERATE_IDEA),
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

      const results = await Promise.all([
        generateReflection(
          title,
          description,
          productCapabilitiesPrompt,
          productCapabilitiesFormat
        ),
        generateResearch(description),
        generateReflection(title, description, moatPrompt, moatFormat),
        generateReflection(
          title,
          description,
          productLifecyclePrompt,
          productLifecycleFormat
        ),
        generateReflection(
          title,
          description,
          businessModelPrompt,
          businessModelFormat
        ),
        generateReflection(title, description, brandingPrompt, brandingFormat),
        generateReflection(title, description, uiuxPrompt, uiuxFormat),
      ]);

      console.log("Completed generation of results:", results);

      const [
        productCapabilities,
        competitiveLandscape,
        moat,
        productLifecycle,
        businessModel,
        branding,
        uiux,
      ] = results;

      // Create a new content document in the "idea_contents" collection
      const ideaContentRef = admin
        .firestore()
        .collection("idea_contents")
        .doc();
      await ideaContentRef.set({
        idea_id: ideaId,
        productCapabilities: productCapabilities,
        competitiveLandscape: competitiveLandscape,
        moat: moat,
        productLifecycle: productLifecycle,
        businessModel: businessModel,
        branding: branding,
        uiux: uiux,
      });

      res.status(200).send({
        message: `Idea ${ideaId} and its content were successfully created`,
      });
    });
  });

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

export const generateNewIdeaImage = functions.https.onRequest(
  async (req, res) => {
    cors(req, res, async () => {
      const data = req.body;
      const userId = data.userId;
      const ideaId = data.ideaId; // Fixed typo from ideadId to ideaId

      if (!userId || !ideaId) {
        res.status(400).send("Missing required data");
        return;
      }

      // Check if a user document already exists in Firestore
      const userRef = admin.firestore().collection("users").doc(userId);
      const userSnapshot = await userRef.get();

      // Check if an idea document already exists in Firestore
      const ideaRef = admin.firestore().collection("ideas").doc(ideaId);
      const ideaSnapshot = await ideaRef.get();

      if (!ideaSnapshot.exists || !userSnapshot.exists) {
        res.status(400).send("User or Idea does not exist");
        return;
      }

      const ideaData = ideaSnapshot.data()!;

      // Check if the idea belongs to the user
      if (ideaData.user_id !== userId) {
        res.status(401).send("Unauthorized");
        return;
      }

      const url = await regenerateImageUrl(ideaData.title);

      await ideaRef.update({
        url: url,
      });

      res.status(200).send({
        message: `New image for Idea ${ideaId} was successfully generated`,
      });
    });
  }
);

const regenerateImageUrl = async (title: string): Promise<string> => {
  const extractedKeywords = keywordExtractor.extract(title, {
    language: "english",
    remove_digits: true,
    return_changed_case: true,
    remove_duplicates: true,
  });

  // Shuffle the extractedKeywords array
  const shuffledKeywords = extractedKeywords.sort(() => Math.random() - 0.5);

  const queryUrl = `https://source.unsplash.com/1600x900/?${encodeURIComponent(
    shuffledKeywords.join(",")
  )}`;

  const data = await fetch(queryUrl);
  console.log(data.url);
  return data.url;
};
