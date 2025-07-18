"use client"

import { ChatbotUIContext } from "@/context/context"
import { getProfileByUserId, updateProfile } from "@/db/profile"
import {
  getHomeWorkspaceByUserId,
  getWorkspacesByUserId
} from "@/db/workspaces"
import { isUsingEnvironmentKey } from "@/lib/envs"
import {
  fetchHostedModels,
  fetchOpenRouterModels
} from "@/lib/models/fetch-models"
import { supabase } from "@/lib/supabase/browser-client"
import { TablesUpdate } from "@/supabase/types"
import { EnvKey } from "@/types/key-type"
import { useRouter } from "next/navigation"
import { useContext, useEffect, useState } from "react"
import { APIStep } from "../../../components/setup/api-step"
import { FinishStep } from "../../../components/setup/finish-step"
import { ProfileStep } from "../../../components/setup/profile-step"
import { StepContainer } from "../../../components/setup/step-container"

// Function to check if OpenAI API keys are available in environment variables
function hasOpenAIKeyInEnv() {
  // Check for standard OpenAI key or Azure OpenAI key
  return (
    isUsingEnvironmentKey("OPENAI_API_KEY" as EnvKey) ||
    isUsingEnvironmentKey("AZURE_OPENAI_API_KEY" as EnvKey)
  )
}

// Dynamic step count based on whether we need the API step
const DYNAMIC_STEP_COUNT = hasOpenAIKeyInEnv() ? 2 : 3

export default function SetupPage() {
  const {
    profile,
    setProfile,
    setWorkspaces,
    setSelectedWorkspace,
    setEnvKeyMap,
    setAvailableHostedModels,
    setAvailableOpenRouterModels
  } = useContext(ChatbotUIContext)

  const router = useRouter()

  const [loading, setLoading] = useState(true)

  const [currentStep, setCurrentStep] = useState(1)

  // Profile Step
  const [displayName, setDisplayName] = useState("")
  const [username, setUsername] = useState(profile?.username || "")
  const [usernameAvailable, setUsernameAvailable] = useState(true)

  // API Step
  const [useAzureOpenai, setUseAzureOpenai] = useState(false)
  const [openaiAPIKey, setOpenaiAPIKey] = useState("")
  const [openaiOrgID, setOpenaiOrgID] = useState("")
  const [azureOpenaiAPIKey, setAzureOpenaiAPIKey] = useState("")
  const [azureOpenaiEndpoint, setAzureOpenaiEndpoint] = useState("")
  const [azureOpenai35TurboID, setAzureOpenai35TurboID] = useState("")
  const [azureOpenai45TurboID, setAzureOpenai45TurboID] = useState("")
  const [azureOpenai45VisionID, setAzureOpenai45VisionID] = useState("")
  const [azureOpenaiEmbeddingsID, setAzureOpenaiEmbeddingsID] = useState("")
  const [anthropicAPIKey, setAnthropicAPIKey] = useState("")
  const [googleGeminiAPIKey, setGoogleGeminiAPIKey] = useState("")
  const [mistralAPIKey, setMistralAPIKey] = useState("")
  const [groqAPIKey, setGroqAPIKey] = useState("")
  const [perplexityAPIKey, setPerplexityAPIKey] = useState("")
  const [openrouterAPIKey, setOpenrouterAPIKey] = useState("")

  useEffect(() => {
    ;(async () => {
      const session = (await supabase.auth.getSession()).data.session

      if (!session) {
        return router.push("/login")
      } else {
        const user = session.user

        const profile = await getProfileByUserId(user.id)
        setProfile(profile)
        setUsername(profile.username)

        if (!profile.has_onboarded) {
          setLoading(false)
        } else {
          const data = await fetchHostedModels(profile)

          if (!data) return

          setEnvKeyMap(data.envKeyMap)
          setAvailableHostedModels(data.hostedModels)

          if (profile["openrouter_api_key"] || data.envKeyMap["openrouter"]) {
            const openRouterModels = await fetchOpenRouterModels()
            if (!openRouterModels) return
            setAvailableOpenRouterModels(openRouterModels)
          }

          const homeWorkspaceId = await getHomeWorkspaceByUserId(
            session.user.id
          )
          return router.push(`/${homeWorkspaceId}/chat`)
        }
      }
    })()
  }, [])

  const handleShouldProceed = (proceed: boolean) => {
    if (proceed) {
      if (currentStep === DYNAMIC_STEP_COUNT) {
        handleSaveSetupSetting()
      } else {
        setCurrentStep(currentStep + 1)
      }
    } else {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSaveSetupSetting = async () => {
    const session = (await supabase.auth.getSession()).data.session
    if (!session) {
      return router.push("/login")
    }

    const user = session.user
    const profile = await getProfileByUserId(user.id)

    const updateProfilePayload: TablesUpdate<"profiles"> = {
      ...profile,
      has_onboarded: true,
      display_name: displayName,
      username,
      openai_api_key: openaiAPIKey,
      openai_organization_id: openaiOrgID,
      anthropic_api_key: anthropicAPIKey,
      google_gemini_api_key: googleGeminiAPIKey,
      mistral_api_key: mistralAPIKey,
      groq_api_key: groqAPIKey,
      perplexity_api_key: perplexityAPIKey,
      openrouter_api_key: openrouterAPIKey,
      use_azure_openai: useAzureOpenai,
      azure_openai_api_key: azureOpenaiAPIKey,
      azure_openai_endpoint: azureOpenaiEndpoint,
      azure_openai_35_turbo_id: azureOpenai35TurboID,
      azure_openai_45_turbo_id: azureOpenai45TurboID,
      azure_openai_45_vision_id: azureOpenai45VisionID,
      azure_openai_embeddings_id: azureOpenaiEmbeddingsID
    }

    const updatedProfile = await updateProfile(profile.id, updateProfilePayload)
    setProfile(updatedProfile)

    const workspaces = await getWorkspacesByUserId(profile.user_id)
    const homeWorkspace = workspaces.find(w => w.is_home)

    // There will always be a home workspace
    setSelectedWorkspace(homeWorkspace!)
    setWorkspaces(workspaces)

    return router.push(`/${homeWorkspace?.id}/chat`)
  }

  const renderStep = (stepNum: number) => {
    // Check if we have OpenAI API key in environment
    const hasOpenAIKey = hasOpenAIKeyInEnv()

    switch (stepNum) {
      // Profile Step
      case 1:
        return (
          <StepContainer
            stepDescription="Let's create your profile."
            stepNum={currentStep}
            stepTitle="Welcome to LocalAI"
            onShouldProceed={handleShouldProceed}
            showNextButton={!!(username && usernameAvailable)}
            showBackButton={false}
          >
            <ProfileStep
              username={username}
              usernameAvailable={usernameAvailable}
              displayName={displayName}
              onUsernameAvailableChange={setUsernameAvailable}
              onUsernameChange={setUsername}
              onDisplayNameChange={setDisplayName}
            />
          </StepContainer>
        )

      // API Step (only shown if no OpenAI API key in environment)
      case 2:
        // If we have OpenAI API key in environment, this becomes the Finish step
        if (hasOpenAIKey) {
          return (
            <StepContainer
              stepDescription="You are all set up!"
              stepNum={currentStep}
              stepTitle="Setup Complete"
              onShouldProceed={handleShouldProceed}
              showNextButton={true}
              showBackButton={true}
            >
              <FinishStep displayName={displayName} apiKeyFoundInEnv={true} />
            </StepContainer>
          )
        } else {
          // Otherwise show the API step as usual
          return (
            <StepContainer
              stepDescription="Enter API keys for each service you'd like to use."
              stepNum={currentStep}
              stepTitle="Set API Keys (optional)"
              onShouldProceed={handleShouldProceed}
              showNextButton={true}
              showBackButton={true}
            >
              <APIStep
                openaiAPIKey={openaiAPIKey}
                openaiOrgID={openaiOrgID}
                azureOpenaiAPIKey={azureOpenaiAPIKey}
                azureOpenaiEndpoint={azureOpenaiEndpoint}
                azureOpenai35TurboID={azureOpenai35TurboID}
                azureOpenai45TurboID={azureOpenai45TurboID}
                azureOpenai45VisionID={azureOpenai45VisionID}
                azureOpenaiEmbeddingsID={azureOpenaiEmbeddingsID}
                anthropicAPIKey={anthropicAPIKey}
                googleGeminiAPIKey={googleGeminiAPIKey}
                mistralAPIKey={mistralAPIKey}
                groqAPIKey={groqAPIKey}
                perplexityAPIKey={perplexityAPIKey}
                useAzureOpenai={useAzureOpenai}
                onOpenaiAPIKeyChange={setOpenaiAPIKey}
                onOpenaiOrgIDChange={setOpenaiOrgID}
                onAzureOpenaiAPIKeyChange={setAzureOpenaiAPIKey}
                onAzureOpenaiEndpointChange={setAzureOpenaiEndpoint}
                onAzureOpenai35TurboIDChange={setAzureOpenai35TurboID}
                onAzureOpenai45TurboIDChange={setAzureOpenai45TurboID}
                onAzureOpenai45VisionIDChange={setAzureOpenai45VisionID}
                onAzureOpenaiEmbeddingsIDChange={setAzureOpenaiEmbeddingsID}
                onAnthropicAPIKeyChange={setAnthropicAPIKey}
                onGoogleGeminiAPIKeyChange={setGoogleGeminiAPIKey}
                onMistralAPIKeyChange={setMistralAPIKey}
                onGroqAPIKeyChange={setGroqAPIKey}
                onPerplexityAPIKeyChange={setPerplexityAPIKey}
                onUseAzureOpenaiChange={setUseAzureOpenai}
                openrouterAPIKey={openrouterAPIKey}
                onOpenrouterAPIKeyChange={setOpenrouterAPIKey}
              />
            </StepContainer>
          )
        }

      // Finish Step (only shown if no OpenAI API key in environment)
      case 3:
        return (
          <StepContainer
            stepDescription="You are all set up!"
            stepNum={currentStep}
            stepTitle="Setup Complete"
            onShouldProceed={handleShouldProceed}
            showNextButton={true}
            showBackButton={true}
          >
            <FinishStep displayName={displayName} apiKeyFoundInEnv={false} />
          </StepContainer>
        )
      default:
        return null
    }
  }

  if (loading) {
    return null
  }

  return (
    <div className="flex h-full items-center justify-center">
      {renderStep(currentStep)}
    </div>
  )
}
