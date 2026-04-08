'use client'

import React, { useContext, useState } from 'react'
import { Loader2, Plus, Eye, Sparkles, Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog"
import { UserDetailContext } from '@/context/UserDetailsContext'
import { Input } from '@/components/ui/input'
import { useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { useRouter } from 'next/navigation'
import { v4 as uuidv4 } from 'uuid'
import { Id } from '@/convex/_generated/dataModel'
import AgentPreviewModal from './AgentPreviewModal'

const CreateAgentSection = () => {
  const [openDialog, setOpenDialog] = useState(false)
  const [openPreview, setOpenPreview] = useState(false)
  const [agentName, setAgentName] = useState('')
  const [loader, setLoader] = useState(false)

  const { userDetail, setUserDetail } = useContext(UserDetailContext)
  const createAgentMutation = useMutation(api.agent.CreateAgent)
  const router = useRouter()
  const { toast } = useToast()

  // ✅ Function to create a new agent
  const createAgent = async () => {
    try {
      if (!agentName.trim()) {
        toast({
          title: "Invalid name",
          description: "Agent name cannot be empty",
        })
        return
      }
      if (!userDetail?._id) {
        toast({
          title: "Not authenticated",
          description: "Please log in to create agents",
          variant: "destructive",
        })
        return
      }

      setLoader(true)
      const agentId = uuidv4() // Generate unique agentId

      // Call Convex mutation
      const result = await createAgentMutation({
        name: agentName,
        agentId,
        userId: userDetail._id as Id<"UserTable">, // ✅ TypeScript fix
      })

      setUserDetail((prev) =>
        prev
          ? {
              ...prev,
              token: result.remainingCredits,
            }
          : prev
      )
      setAgentName('')

      toast({
        title: "Agent created!",
        description: `${agentName} is ready. ${result.deductedCredits} credits used.`,
      })

      // Navigate to the agent-builder page using the agentId (UUID), not the document _id
      router.push('/agent-builder/' + agentId)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to create agent right now.'
      toast({
        title: "Failed to create agent",
        description: message,
        variant: "destructive",
      })
    } finally {
      setLoader(false)
      setOpenDialog(false)
    }
  }

  return (
    <>
      <section className="flex min-h-[360px] w-full flex-col items-center justify-center px-4 pb-10 pt-8 text-center md:min-h-[420px]">
        <div className="inline-flex h-[82px] w-[82px] items-center justify-center rounded-[26px] bg-gradient-to-br from-[#f3e7ff] via-[#ecd9ff] to-[#f5e9fb] shadow-[0_18px_40px_-24px_rgba(126,52,244,0.45)]">
          <Sparkles className="h-10 w-10 text-[#7b31f5]" />
        </div>
        <h2 className="mt-7 text-4xl font-bold tracking-tight text-[#8829f4] md:text-[3.2rem]">
          Nova AI Assistant
        </h2>
        <p className="mt-4 max-w-[660px] text-lg text-slate-500 md:text-[1.05rem]">
          Build and launch intelligent agents with professional workflows, templates, and real-time analytics.
        </p>

        <div className="mt-12 flex flex-col items-center gap-4 sm:flex-row">
          <Button
            size="lg"
            variant="outline"
            onClick={() => setOpenPreview(true)}
            className="h-[62px] min-w-[162px] gap-2 rounded-[22px] border border-[#d8c8ff] bg-white px-8 text-[1.05rem] font-semibold text-slate-950 shadow-[0_14px_30px_-22px_rgba(96,82,185,0.45)] transition-all hover:-translate-y-0.5 hover:border-[#bfa5ff] hover:bg-white"
          >
            <Eye className="h-5 w-5" />
            Preview
          </Button>

          <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <DialogTrigger asChild>
              <Button
                size="lg"
                className="h-[62px] min-w-[162px] gap-2 rounded-[22px] bg-gradient-to-r from-[#6f2cff] via-[#8d27f3] to-[#ff2e98] px-8 text-[1.05rem] font-semibold text-white shadow-[0_20px_38px_-18px_rgba(209,66,177,0.72)] transition-all hover:-translate-y-0.5 hover:scale-[1.01]"
              >
                <Plus className="h-5 w-5" />
                Create
              </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Wand2 className="h-5 w-5 text-violet-600" />
                  Enter Agent Name
                </DialogTitle>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <Input
                  placeholder="My Awesome Agent"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  className="h-12 rounded-xl border-2 border-violet-200 text-lg focus:border-violet-500 focus:ring-violet-200"
                  autoFocus
                />
                <p className="text-sm text-slate-500">
                  Give your agent a descriptive name to help you identify it later.
                </p>
              </div>

              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="ghost" className="rounded-xl">
                    Cancel
                  </Button>
                </DialogClose>

                <Button
                  onClick={createAgent}
                  disabled={loader || !agentName.trim()}
                  className="rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
                >
                  {loader && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Create Agent
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              title: "Quick templates",
              description: "Start from professional agent templates and customize faster.",
            },
            {
              title: "Live agent preview",
              description: "See how your agent behaves before you publish it.",
            },
            {
              title: "Smart summaries",
              description: "Get instant feedback on performance, activity, and unread chats.",
            },
            {
              title: "Secure build",
              description: "Your AI agent data and credentials stay protected.",
            },
          ].map((item) => (
            <div key={item.title} className="rounded-[24px] border border-slate-200 bg-white p-4 text-left shadow-[0_18px_40px_-30px_rgba(15,23,42,0.1)]">
              <div className="text-sm font-semibold text-slate-900">{item.title}</div>
              <p className="mt-2 text-sm text-slate-500">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      <AgentPreviewModal open={openPreview} onOpenChange={setOpenPreview} />
    </>
  )
}

export default CreateAgentSection
