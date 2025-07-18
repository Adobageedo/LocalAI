import { LLM } from "@/types"

const OPENAI_PLATORM_LINK = "https://platform.openai.com/docs/overview"

// GPT-4.1 Mini
const GPT41Mini: LLM = {
  modelId: "gpt-4.1-mini",
  modelName: "GPT-4.1 Mini",
  provider: "openai",
  hostedId: "gpt-4.1-mini",
  platformLink: OPENAI_PLATORM_LINK,
  imageInput: false,
  pricing: {
    currency: "USD",
    unit: "1M tokens",
    inputCost: 2.5,
    outputCost: 7.5
  }
}

export const OPENAI_LLM_LIST: LLM[] = [GPT41Mini]
