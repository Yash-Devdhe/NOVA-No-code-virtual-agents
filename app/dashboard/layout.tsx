import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import DashboardShell from './DashboardShell'
import { isClerkEnabled } from '@/lib/authMode'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let initialUser: { name: string; email: string } | null = null

  if (isClerkEnabled) {
    const { userId } = await auth()
    if (!userId) {
      redirect('/sign-in')
    }

    const user = await currentUser()
    const email = user?.emailAddresses?.[0]?.emailAddress

    if (!email) {
      redirect('/sign-in')
    }

    initialUser = {
      name: user?.fullName || user?.firstName || 'User',
      email,
    }
  }

  return <DashboardShell initialUser={initialUser}>{children}</DashboardShell>
}
