import { FC, useState, useEffect } from "react"
import { Button } from "../ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "../ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import {
  IconBrandGoogle,
  IconMail,
  IconCalendar,
  IconCloudUpload,
  IconCheck,
  IconX,
  IconBrandWindows,
  IconRefresh,
  IconDownload
} from "@tabler/icons-react"
import { authProviders } from "@/lib/auth-providers"
import { toast } from "sonner"

interface ConnectionsProps {}

interface ConnectionStatus {
  gmail: boolean
  outlook: boolean
  gdrive: boolean
  onedrive: boolean
  gcalendar: boolean
  outlook_calendar: boolean
}

export const Connections: FC<ConnectionsProps> = ({}) => {
  const [activeTab, setActiveTab] = useState<"google" | "microsoft">("google")
  const [loading, setLoading] = useState<string | null>(null)
  const [syncingService, setSyncingService] = useState<string | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    gmail: false,
    outlook: false,
    gdrive: false,
    onedrive: false,
    gcalendar: false,
    outlook_calendar: false
  })
  const [emails, setEmails] = useState<Record<string, string>>({})

  // Check connection status on component mount
  useEffect(() => {
    checkAllConnections()
  }, [])

  const checkAllConnections = async () => {
    try {
      // Get all capabilities in a single API call
      const capabilities = await authProviders.getUserCapabilities()
      console.log("User capabilities:", capabilities)

      // Initialize default statuses
      const statuses: ConnectionStatus = {
        gmail: false,
        outlook: false,
        gdrive: false,
        onedrive: false,
        gcalendar: false,
        outlook_calendar: false
      }

      const newEmails: Record<string, string> = {}

      // Map capabilities to our connection status structure
      if (capabilities.providers) {
        // Email capability
        if (capabilities.providers.email === "gmail") {
          statuses.gmail = true
          // We could store user email here if backend provides it
          // newEmails.gmail = capabilities.user_email || ''
        } else if (capabilities.providers.email === "outlook") {
          statuses.outlook = true
          // newEmails.outlook = capabilities.user_email || ''
        }

        // Cloud storage capability
        if (capabilities.providers.cloud_storage === "gdrive") {
          statuses.gdrive = true
          // Use same email as gmail if connected
          if (statuses.gmail && newEmails.gmail) {
            newEmails.gdrive = newEmails.gmail
          }
        } else if (capabilities.providers.cloud_storage === "onedrive") {
          statuses.onedrive = true
          // Use same email as outlook if connected
          if (statuses.outlook && newEmails.outlook) {
            newEmails.onedrive = newEmails.outlook
          }
        }

        // Calendar capability
        if (capabilities.providers.calendar === "gcalendar") {
          statuses.gcalendar = true
          // Use same email as gmail if connected
          if (statuses.gmail && newEmails.gmail) {
            newEmails.gcalendar = newEmails.gmail
          }
        } else if (capabilities.providers.calendar === "outlook_calendar") {
          statuses.outlook_calendar = true
          // Use same email as outlook if connected
          if (statuses.outlook && newEmails.outlook) {
            newEmails.outlook_calendar = newEmails.outlook
          }
        }
      }

      setConnectionStatus(statuses)
      setEmails(newEmails)
    } catch (error) {
      console.error("Error checking connections:", error)
    }
  }

  const handleConnect = async (service: string) => {
    setLoading(service)
    try {
      await authProviders.authenticate(service)
      await checkAllConnections()
      toast.success(`Successfully connected to ${service}`)
    } catch (error) {
      console.error(`Error connecting to ${service}:`, error)
      toast.error(
        `Failed to connect to ${service}. ${error instanceof Error ? error.message : "Please try again."}`
      )
    } finally {
      setLoading(null)
    }
  }

  const handleDisconnect = async (service: string) => {
    setLoading(service)
    try {
      await authProviders.revokeAccess(service)
      await checkAllConnections()
      toast.success(`Successfully disconnected from ${service}`)
    } catch (error) {
      console.error(`Error disconnecting from ${service}:`, error)
      toast.error(
        `Failed to disconnect from ${service}. ${error instanceof Error ? error.message : "Please try again."}`
      )
    } finally {
      setLoading(null)
    }
  }

  const handleStartSync = async (service: string) => {
    setSyncingService(service)
    try {
      await authProviders.startIngestion(service)
      toast.success(`Successfully started synchronization for ${service}`)
      // Add the sync ID to localStorage for the SyncStatusBar component to pick up
      const syncId = `${service}_sync_${Date.now()}`
      const syncIdsString = localStorage.getItem("activeSyncIds")
      let syncIds = []

      if (syncIdsString) {
        try {
          syncIds = JSON.parse(syncIdsString)
        } catch (e) {
          console.error("Error parsing sync IDs from localStorage:", e)
        }
      }

      syncIds.push(`${syncId}|${Date.now()}`)
      localStorage.setItem("activeSyncIds", JSON.stringify(syncIds))
    } catch (error) {
      console.error(`Error starting sync for ${service}:`, error)
      toast.error(
        `Failed to start synchronization for ${service}. ${error instanceof Error ? error.message : "Please try again."}`
      )
    } finally {
      setSyncingService(null)
    }
  }

  const renderConnectionCard = (
    title: string,
    description: string,
    service: string,
    icon: JSX.Element
  ) => {
    const isConnected = connectionStatus[service as keyof ConnectionStatus]
    const email = emails[service]
    const isLoading = loading === service
    const isSyncing = syncingService === service

    return (
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {icon}
            {title}
            {isConnected && <IconCheck size={18} className="text-green-500" />}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          {isConnected && email && (
            <p className="text-muted-foreground mb-2 text-sm">
              Connected as: {email}
            </p>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button
            variant={isConnected ? "destructive" : "default"}
            onClick={() =>
              isConnected ? handleDisconnect(service) : handleConnect(service)
            }
            disabled={isLoading || isSyncing}
            className="w-full"
          >
            {isLoading
              ? "Processing..."
              : isConnected
                ? "Disconnect"
                : "Connect"}
          </Button>

          {/* Show sync button only for connected services */}
          {isConnected && (
            <Button
              variant="outline"
              onClick={() => handleStartSync(service)}
              disabled={isSyncing}
              className="flex w-full items-center justify-center gap-2"
            >
              {isSyncing ? (
                <>
                  <IconRefresh size={16} className="animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <IconDownload size={16} />
                  Start Sync
                </>
              )}
            </Button>
          )}
        </CardFooter>
      </Card>
    )
  }

  // Determine if any provider is connected
  const isGoogleConnected =
    connectionStatus.gmail ||
    connectionStatus.gdrive ||
    connectionStatus.gcalendar
  const isMicrosoftConnected =
    connectionStatus.outlook ||
    connectionStatus.onedrive ||
    connectionStatus.outlook_calendar

  // If one provider is connected, automatically select that tab
  useEffect(() => {
    if (isGoogleConnected) {
      setActiveTab("google")
    } else if (isMicrosoftConnected) {
      setActiveTab("microsoft")
    }
  }, [isGoogleConnected, isMicrosoftConnected])

  return (
    <div className="h-full overflow-auto p-4">
      <h2 className="mb-4 text-xl font-bold">External Connections</h2>
      <p className="text-muted-foreground mb-6 text-sm">
        Connect to external services to access your emails, calendar events, and
        files.
      </p>

      <Tabs
        value={activeTab}
        onValueChange={value => setActiveTab(value as "google" | "microsoft")}
      >
        {/* Only show tabs if neither provider is connected, or show just the connected provider */}
        {!isGoogleConnected && !isMicrosoftConnected ? (
          <TabsList className="mb-6 grid w-full grid-cols-2">
            <TabsTrigger value="google" className="flex items-center gap-2">
              <IconBrandGoogle size={18} />
              Google
            </TabsTrigger>
            <TabsTrigger value="microsoft" className="flex items-center gap-2">
              <IconBrandWindows size={18} />
              Microsoft
            </TabsTrigger>
          </TabsList>
        ) : (
          <TabsList className="mb-6 grid w-full grid-cols-1">
            {isGoogleConnected && (
              <TabsTrigger value="google" className="flex items-center gap-2">
                <IconBrandGoogle size={18} />
                Google
              </TabsTrigger>
            )}
            {isMicrosoftConnected && (
              <TabsTrigger
                value="microsoft"
                className="flex items-center gap-2"
              >
                <IconBrandWindows size={18} />
                Microsoft
              </TabsTrigger>
            )}
          </TabsList>
        )}

        <TabsContent value="google" className="space-y-4">
          {renderConnectionCard(
            "Gmail",
            "Access and manage your emails",
            "gmail",
            <IconMail size={18} />
          )}

          {renderConnectionCard(
            "Google Calendar",
            "Access your calendar events",
            "gcalendar",
            <IconCalendar size={18} />
          )}

          {renderConnectionCard(
            "Google Drive",
            "Access your files and documents",
            "gdrive",
            <IconCloudUpload size={18} />
          )}
        </TabsContent>

        <TabsContent value="microsoft" className="space-y-4">
          {renderConnectionCard(
            "Outlook",
            "Access and manage your emails",
            "outlook",
            <IconMail size={18} />
          )}

          {renderConnectionCard(
            "Outlook Calendar",
            "Access your calendar events",
            "outlook_calendar",
            <IconCalendar size={18} />
          )}

          {renderConnectionCard(
            "OneDrive",
            "Access your files and documents",
            "onedrive",
            <IconCloudUpload size={18} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
