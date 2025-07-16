import { LLM } from "@/types"
import { OPENAI_LLM_LIST } from "./openai-llm-list"

// We're only using GPT-4.1 Mini through our backend API
export const LLM_LIST: LLM[] = [...OPENAI_LLM_LIST]

export const LLM_LIST_MAP: Record<string, LLM[]> = {
  openai: OPENAI_LLM_LIST,
  azure: OPENAI_LLM_LIST
}
