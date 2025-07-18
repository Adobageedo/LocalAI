"use client"

import { useEffect, useState } from "react"
import { X, Loader2, CheckCircle, AlertCircle, RefreshCw } from "lucide-react"
import { clientAuthFetch } from "@/lib/supabase/clientAuthFetch"

interface SyncStatus {
  id: string
  source_type: string
  status: "pending" | "in_progress" | "completed" | "failed"
  progress: number
  error_details?: string
  created_at: string
  updated_at: string
}

export const SyncStatusBar = () => {
  const [syncStatuses, setSyncStatuses] = useState<SyncStatus[]>([])
  const [visible, setVisible] = useState(false)

  // Function to get status icon based on sync status
  const getStatusIcon = (syncStatus: SyncStatus) => {
    const { status } = syncStatus
    switch (status) {
      case "in_progress":
        return <Loader2 className="mr-2 size-4 animate-spin text-blue-500" />
      case "completed":
        return <CheckCircle className="mr-2 size-4 text-green-500" />
      case "failed":
        return <AlertCircle className="mr-2 size-4 text-red-500" />
      default:
        return <RefreshCw className="mr-2 size-4 text-gray-500" />
    }
  }

  // Function to get message based on sync status
  const getMessage = (syncStatus: SyncStatus) => {
    const { source_type, status, progress } = syncStatus
    const sourceTypeFormatted =
      source_type.charAt(0).toUpperCase() + source_type.slice(1)

    // Format progress percentage
    const progressPercent = Math.round(progress * 100)
    const progressText =
      status === "in_progress" ? ` (${progressPercent}%)` : ""

    const playfulPhrases: Record<string, string[]> = {
      pending: [
        `Gearing up to sync your ${sourceTypeFormatted} data...`,
        `${sourceTypeFormatted} sync is queued — charging circuits ⚡`,
        `Standing by for ${sourceTypeFormatted} sync...`
      ],
      in_progress: [
        `AI hard at work syncing your ${sourceTypeFormatted} files${progressText} 🧠📡`,
        `Beam me your ${sourceTypeFormatted} docs${progressText}! 🚀`,
        `${sourceTypeFormatted} sync in progress${progressText} — hold tight! 🌀`
      ],
      completed: [
        `${sourceTypeFormatted} sync complete — everything's shiny ✨`,
        `Success! Your ${sourceTypeFormatted} data has landed safely ✅`,
        `${sourceTypeFormatted} files synced — mission accomplished 🚀`
      ],
      failed: [
        `${sourceTypeFormatted} sync failed 😓 — ${syncStatus.error_details || "Unknown error"}`,
        `Oops... ${sourceTypeFormatted} didn't want to cooperate 🤖❌`,
        `Error syncing ${sourceTypeFormatted}: ${syncStatus.error_details || "Check your connection"}`
      ]
    }

    const options = playfulPhrases[status] || [
      `${sourceTypeFormatted} sync status: ${status}`
    ]
    return options[Math.floor(Math.random() * options.length)]
  }

  // Fetch sync statuses from API
  const fetchSyncStatuses = async () => {
    try {
      // First check if we have any sync IDs stored in localStorage
      const syncIdsString = localStorage.getItem("activeSyncIds")
      let syncIds: string[] = []

      if (syncIdsString) {
        try {
          syncIds = JSON.parse(syncIdsString)
          // Filter out any sync IDs that are older than 1 hour
          const oneHourAgo = Date.now() - 60 * 60 * 1000
          syncIds = syncIds.filter(id => {
            const [syncId, timestamp] = id.split("|")
            return parseInt(timestamp) > oneHourAgo
          })
          localStorage.setItem("activeSyncIds", JSON.stringify(syncIds))
        } catch (e) {
          console.error("Error parsing sync IDs from localStorage:", e)
          syncIds = []
        }
      }
      syncIds = []
      // If we don't have any sync IDs, check for active syncs via the general sync status endpoint
      // Note: This endpoint might not be available in all backend versions
      if (syncIds.length === 0) {
        try {
          const response = await clientAuthFetch(
            `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/sync/status`
          )

          // If the endpoint returns 405 Method Not Allowed, the endpoint doesn't exist
          if (response.status === 405) {
            console.log(
              "Sync status endpoint not available, skipping general status check"
            )
            return
          }

          if (response.ok) {
            const data = await response.json()
            if (data && Array.isArray(data)) {
              const activeStatuses = data.filter(
                (status: SyncStatus) =>
                  status.status === "pending" || status.status === "in_progress"
              )

              if (activeStatuses.length > 0) {
                setSyncStatuses(activeStatuses)
                setVisible(true)

                // Store active sync IDs in localStorage with timestamps
                const newSyncIds = activeStatuses.map(
                  status => `${status.id}|${Date.now()}`
                )
                localStorage.setItem(
                  "activeSyncIds",
                  JSON.stringify(newSyncIds)
                )
                return
              }
            }
          }
        } catch (error) {
          console.error(
            "Error fetching sync statuses from main endpoint:",
            error
          )
        }
      }

      // If we have sync IDs, fetch their status individually
      if (syncIds.length > 0) {
        const statuses: SyncStatus[] = []

        for (const idWithTimestamp of syncIds) {
          const [syncId] = idWithTimestamp.split("|")
          try {
            const response = await clientAuthFetch(
              `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/sync/status/${syncId}`
            )
            if (response.ok) {
              const data = await response.json()
              if (data && data.success && data.status) {
                const status = data.status
                if (
                  status.status === "pending" ||
                  status.status === "in_progress"
                ) {
                  statuses.push({
                    id: syncId,
                    source_type: status.source_type || "unknown",
                    status: status.status,
                    progress: status.progress || 0,
                    error_details: status.error_details,
                    created_at: status.created_at || new Date().toISOString(),
                    updated_at: status.updated_at || new Date().toISOString()
                  })
                }
              }
            }
          } catch (error) {
            console.error(`Error fetching sync status for ID ${syncId}:`, error)
          }
        }

        if (statuses.length > 0) {
          setSyncStatuses(statuses)
          setVisible(true)
          return
        }
      }

      // If we get here, there are no active syncs
      setSyncStatuses([])
      setVisible(false)
    } catch (error) {
      console.error("Error in fetchSyncStatuses:", error)
    }
  }

  // Fetch status on mount and periodically
  useEffect(() => {
    fetchSyncStatuses()

    // Refresh every 5 seconds
    const intervalId = setInterval(fetchSyncStatuses, 5000)

    return () => clearInterval(intervalId)
  }, [])

  // Hide the bar if there are no active syncs
  useEffect(() => {
    if (syncStatuses.length === 0) {
      setVisible(false)
    } else {
      setVisible(true)
    }
  }, [syncStatuses])

  const handleClose = () => {
    setVisible(false)
  }

  // If no active syncs, don't render anything
  if (!visible) return null

  return (
    <div className="animate-in fade-in slide-in-from-top-5 fixed inset-x-0 top-0 z-50">
      <div className="bg-background/95 border-border flex items-center justify-between border-b px-4 py-2 shadow-sm backdrop-blur-sm">
        <div className="mr-2 flex grow flex-col">
          <div className="mb-1 flex items-center">
            {syncStatuses[0] && getStatusIcon(syncStatuses[0])}
            <p className="max-w-[80vw] truncate text-sm font-medium">
              {syncStatuses[0]
                ? getMessage(syncStatuses[0])
                : "Synchronization in progress..."}
              {syncStatuses.length > 1 && ` (+${syncStatuses.length - 1} more)`}
            </p>
          </div>

          {/* Progress bar for in-progress syncs */}
          {syncStatuses[0]?.status === "in_progress" && (
            <div className="bg-muted h-1 w-full overflow-hidden rounded-full">
              <div
                className="h-1 rounded-full bg-blue-500 transition-all duration-300 ease-in-out"
                style={{ width: `${syncStatuses[0].progress * 100}%` }}
              />
            </div>
          )}
        </div>

        <button
          className="text-muted-foreground hover:text-foreground"
          onClick={handleClose}
          aria-label="Close"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  )
}

export default SyncStatusBar
