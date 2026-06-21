// @ts-nocheck
import { z } from "zod";
import { ChatGroq } from "@langchain/groq";
import dotenv from "dotenv";

dotenv.config({ path: "./apps/backend/.env" });

const schema = z.object({ test: z.string() });
const llm = new ChatGroq({ apiKey: process.env.GROQ_API_KEY, model: "llama-3.1-8b-instant" });

async function main() {
  try {
    const structuredLlm = llm.withStructuredOutput(schema, { name: "extract_data" });
    const res = await structuredLlm.invoke("say hello");
    console.log("Success:", res);
  } catch (err) {
    console.error("Error:", err);
  }
}

main();
