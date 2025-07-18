import { FC } from "react"

interface FinishStepProps {
  displayName: string
  apiKeyFoundInEnv?: boolean
}

export const FinishStep: FC<FinishStepProps> = ({
  displayName,
  apiKeyFoundInEnv
}) => {
  return (
    <div className="space-y-4">
      <div>
        Welcome to Local AI
        {displayName.length > 0 ? `, ${displayName.split(" ")[0]}` : null}!
      </div>

      <div>Click next to start chatting.</div>
    </div>
  )
}
