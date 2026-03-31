"use client"

import { useContext, useEffect, useState } from "react"
import { useMutation } from "convex/react"
import { useToast } from "@/components/ui/use-toast"
import { UserDetailContext } from "@/context/UserDetailsContext"
import { api } from "@/convex/_generated/api"
import { localGuestProfile, isClerkEnabled } from "@/lib/authMode"

function GuestUserInitializer() {
  const { userDetail, setUserDetail } = useContext(UserDetailContext)
  const [isInitialized, setIsInitialized] = useState(false)
  const createUserMutation = useMutation(api.user.CreateNewUser)
  const { toast } = useToast()

  useEffect(() => {
    if (isInitialized || userDetail?._id) {
      setIsInitialized(true)
      return
    }

    const initializeUser = async () => {
      try {
        const userData = await createUserMutation(localGuestProfile)
        if (userData && userData._id) {
          setUserDetail({
            _id: userData._id as string,
            name: userData.name,
            email: userData.email,
            token: userData.token,
          })
          setIsInitialized(true)
        }
      } catch (error) {
        toast({
          title: "Guest initialization error",
          description: error instanceof Error ? error.message : "Failed to initialize guest mode",
          variant: "destructive",
        })
      }
    }

    void initializeUser()
  }, [createUserMutation, isInitialized, setUserDetail, toast, userDetail?._id])

  return null
}

function ClerkUserInitializer() {
  const { useUser } = require("@clerk/nextjs") as typeof import("@clerk/nextjs")
  const { user, isLoaded } = useUser()
  const { userDetail, setUserDetail } = useContext(UserDetailContext)
  const [isInitialized, setIsInitialized] = useState(false)
  const { toast } = useToast()
  const createUserMutation = useMutation(api.user.CreateNewUser)

  useEffect(() => {
    if (!isLoaded || !user || isInitialized) return

    if (userDetail?._id) {
      setIsInitialized(true)
      return
    }

    const initializeUser = async () => {
      try {
        const email = user.emailAddresses?.[0]?.emailAddress
        const name = user.fullName || user.firstName || "User"

        if (!email) {
          toast({
            title: "Initialization failed",
            description: "No email found for user",
            variant: "destructive",
          })
          return
        }

        const userData = await createUserMutation({
          name,
          email,
        })

        if (userData && userData._id) {
          setUserDetail({
            _id: userData._id as string,
            name: userData.name,
            email: userData.email,
            token: userData.token,
          })
          setIsInitialized(true)
        }
      } catch (error) {
        toast({
          title: "Initialization error",
          description: error instanceof Error ? error.message : "Failed to initialize user",
          variant: "destructive",
        })
      }
    }

    void initializeUser()
  }, [createUserMutation, isInitialized, isLoaded, setUserDetail, toast, user, userDetail?._id])

  return null
}

export default function UserInitializer() {
  return isClerkEnabled ? <ClerkUserInitializer /> : <GuestUserInitializer />
}
