"use client"

import { Brand } from "@/components/ui/brand"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SubmitButton } from "@/components/ui/submit-button"
import { clientAuthFetch } from "@/lib/supabase/clientAuthFetch"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { IconAlertCircle, IconCheck } from "@tabler/icons-react"
import { Metadata } from "next"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"

export default function Register() {
  const router = useRouter()
  const supabase = createClientComponentClient()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [phone, setPhone] = useState("")
  const [countryCode, setCountryCode] = useState("+1")

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate inputs
    if (!email || !password || !confirmPassword || !fullName || !phone) {
      setError("All fields are required")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters")
      return
    }

    setLoading(true)

    try {
      // Register with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName
          }
        }
      })

      if (authError) {
        throw new Error(authError.message)
      }

      if (!authData.user) {
        throw new Error("Failed to create user")
      }

      // Get the supabase user ID
      const uid = authData.user.id

      console.log("Supabase user created with ID:", uid)

      // Create a user object matching your database schema
      const userData = {
        id: uid,
        email: email,
        name: fullName,
        phone: countryCode + phone
      }
      console.log("Creating user in database:", userData)

      // Send the user data to your backend
      const API_BASE_URL =
        process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"
      const response = await clientAuthFetch(`${API_BASE_URL}/api/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(userData)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          errorData.message ||
            `Backend registration failed with status: ${response.status}`
        )
      }

      const createdUser = await response.json()
      console.log("User created in backend:", createdUser)

      setSuccess(true)
      toast.success("Registration successful! Redirecting to setup...")

      // Redirect users after signup with small delay to show success message
      setTimeout(() => {
        router.push("/setup")
      }, 1500)
    } catch (error: any) {
      console.error("Registration error:", error)
      setError(error.message)

      // Clean up Supabase user if there's an error with database
      try {
        const { data } = await supabase.auth.getUser()
        if (data?.user) {
          await supabase.auth.admin.deleteUser(data.user.id)
        }
      } catch (cleanupError) {
        console.error("Error cleaning up Supabase user:", cleanupError)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex w-full flex-1 flex-col justify-center gap-2 px-8 sm:max-w-md">
      <form
        className="animate-in text-foreground flex w-full flex-1 flex-col justify-center gap-2"
        onSubmit={handleRegister}
      >
        <Brand />

        <h1 className="mb-2 mt-6 text-2xl font-bold">Create an account</h1>

        <Label className="text-md mt-4" htmlFor="email">
          Email
        </Label>
        <Input
          className="mb-3 rounded-md border bg-inherit px-4 py-2"
          name="email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />

        <Label className="text-md" htmlFor="fullName">
          Full Name
        </Label>
        <Input
          className="mb-3 rounded-md border bg-inherit px-4 py-2"
          name="fullName"
          placeholder="John Doe"
          value={fullName}
          onChange={e => setFullName(e.target.value)}
          required
        />

        <Label className="text-md" htmlFor="phone">
          Phone Number
        </Label>
        <div className="mb-3 flex gap-2">
          <Select value={countryCode} onValueChange={setCountryCode}>
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="Code" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="+1">+1 (US)</SelectItem>
              <SelectItem value="+44">+44 (UK)</SelectItem>
              <SelectItem value="+33">+33 (FR)</SelectItem>
              <SelectItem value="+49">+49 (DE)</SelectItem>
              <SelectItem value="+39">+39 (IT)</SelectItem>
              <SelectItem value="+34">+34 (ES)</SelectItem>
              <SelectItem value="+91">+91 (IN)</SelectItem>
            </SelectContent>
          </Select>
          <Input
            className="flex-1 rounded-md border bg-inherit px-4 py-2"
            name="phone"
            type="tel"
            placeholder="123-456-7890"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            required
          />
        </div>

        <Label className="text-md" htmlFor="password">
          Password
        </Label>
        <Input
          className="mb-3 rounded-md border bg-inherit px-4 py-2"
          type="password"
          name="password"
          placeholder="••••••••"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />

        <Label className="text-md" htmlFor="confirmPassword">
          Confirm Password
        </Label>
        <Input
          className="mb-6 rounded-md border bg-inherit px-4 py-2"
          type="password"
          name="confirmPassword"
          placeholder="••••••••"
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          required
        />

        <SubmitButton
          className="mb-2 rounded-md bg-blue-700 px-4 py-2 text-white"
          disabled={loading}
        >
          {loading ? "Creating Account..." : "Register"}
        </SubmitButton>

        {error && (
          <div className="mt-2 flex items-center gap-2 rounded-md bg-red-500/10 p-3 text-red-500">
            <IconAlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mt-2 flex items-center gap-2 rounded-md bg-green-500/10 p-3 text-green-500">
            <IconCheck size={18} />
            <span>Account created successfully!</span>
          </div>
        )}

        <div className="text-muted-foreground mt-4 flex justify-center text-sm">
          <span className="mr-1">Already have an account?</span>
          <Link
            href="/login"
            className="text-primary ml-1 underline hover:opacity-80"
          >
            Login
          </Link>
        </div>
      </form>
    </div>
  )
}
