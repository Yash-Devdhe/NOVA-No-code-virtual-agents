"use client"

import { useContext, useEffect, useState } from "react"
import { useMutation } from "convex/react"
import { useToast } from "@/components/ui/use-toast"
import { UserDetailContext } from "@/context/UserDetailsContext"
import { api } from "@/convex/_generated/api"
import { localGuestProfile, isClerkEnabled } from "@/lib/authMode"

type AuthenticatedUserSeed = {
  name: string
  email: string
}

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

function ClerkUserInitializer({
  initialUser,
}: {
  initialUser: AuthenticatedUserSeed | null
}) {
  const { userDetail, setUserDetail } = useContext(UserDetailContext)
  const [isInitialized, setIsInitialized] = useState(false)
  const { toast } = useToast()
  const createUserMutation = useMutation(api.user.CreateNewUser)

  useEffect(() => {
    if (!initialUser || isInitialized) return

    if (userDetail?._id) {
      setIsInitialized(true)
      return
    }

    const initializeUser = async () => {
      try {
        const userData = await createUserMutation({
          name: initialUser.name,
          email: initialUser.email,
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
  }, [createUserMutation, initialUser, isInitialized, setUserDetail, toast, userDetail?._id])

  return null
}

export default function UserInitializer({
  initialUser,
}: {
  initialUser?: AuthenticatedUserSeed | null
}) {
  return isClerkEnabled ? (
    <ClerkUserInitializer initialUser={initialUser ?? null} />
  ) : (
    <GuestUserInitializer />
  )
}
