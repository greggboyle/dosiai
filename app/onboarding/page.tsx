'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Loader2,
  Upload,
  X,
} from 'lucide-react'
import {
  createWorkspace,
  draftCompanyProfile,
  saveCompetitors,
  saveTopics,
  saveWorkspaceProfile,
} from '@/app/onboarding/actions'
import { triggerManualSweep } from '@/app/(app)/dashboard/actions'

// Step definitions
const STEPS = [
  { id: 'welcome', title: 'Workspace Setup' },
  { id: 'company', title: 'Your Company' },
  { id: 'competitors', title: 'Add Competitors' },
  { id: 'topics', title: 'Topics' },
  { id: 'review', title: 'Review & Launch' },
] as const

type StepId = (typeof STEPS)[number]['id']

// Industry options
const INDUSTRIES = [
  { id: 'saas', label: 'SaaS' },
  { id: 'logistics', label: 'Logistics' },
  { id: 'healthcare-tech', label: 'Healthcare Tech' },
  { id: 'financial-services', label: 'Financial Services' },
  { id: 'ecommerce', label: 'E-commerce' },
  { id: 'manufacturing', label: 'Manufacturing' },
  { id: 'other', label: 'Other' },
]

// Sweep stages
const SWEEP_STAGES = [
  { id: 'connecting', label: 'Connecting to vendors' },
  { id: 'buy-side', label: 'Gathering buy-side intel' },
  { id: 'sell-side', label: 'Gathering sell-side intel' },
  { id: 'channel', label: 'Gathering channel intel' },
  { id: 'regulatory', label: 'Gathering regulatory intel' },
  { id: 'scoring', label: 'Scoring items' },
  { id: 'finalizing', label: 'Finalizing' },
]

interface CompetitorInput {
  id: string
  name: string
  website: string
}

interface TopicInput {
  id: string
  name: string
  description: string
  suggestedSeeds: string[]
}

export default function OnboardingPage() {
  const router = useRouter()
  const [currentStepIndex, setCurrentStepIndex] = React.useState(0)
  const [showSweepProgress, setShowSweepProgress] = React.useState(false)
  const [workspaceId, setWorkspaceId] = React.useState<string | null>(null)
  const [isCreatingWorkspace, setIsCreatingWorkspace] = React.useState(false)
  const [isSavingStep, setIsSavingStep] = React.useState(false)
  const [profileSaved, setProfileSaved] = React.useState(false)
  const [competitorsSaved, setCompetitorsSaved] = React.useState(false)
  const [topicsSaved, setTopicsSaved] = React.useState(false)
  const [onboardingError, setOnboardingError] = React.useState<string | null>(null)
  const [isSchedulingSweep, setIsSchedulingSweep] = React.useState(false)
  
  // Form state
  const [workspaceName, setWorkspaceName] = React.useState('')
  const [industry, setIndustry] = React.useState('')
  
  const [companyName, setCompanyName] = React.useState('')
  const [companyWebsite, setCompanyWebsite] = React.useState('')
  const [companySummary, setCompanySummary] = React.useState('')
  const [companyICP, setCompanyICP] = React.useState('')
  const [isLoadingSummary, setIsLoadingSummary] = React.useState(false)
  
  const [competitors, setCompetitors] = React.useState<CompetitorInput[]>([
    { id: '1', name: '', website: '' },
    { id: '2', name: '', website: '' },
    { id: '3', name: '', website: '' },
  ])
  
  const [skipTopics, setSkipTopics] = React.useState(false)
  const [topics, setTopics] = React.useState<TopicInput[]>([
    { id: '1', name: '', description: '', suggestedSeeds: [] },
  ])
  
  // Sweep progress state
  const [sweepStageIndex, setSweepStageIndex] = React.useState(0)
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = React.useState(300) // 5 minutes in seconds
  
  const currentStep = STEPS[currentStepIndex]
  
  // Generate AI draft on demand.
  const generateSummary = async () => {
    if (!workspaceId || !companyName.trim() || !companyWebsite.trim()) return
    setIsLoadingSummary(true)
    setOnboardingError(null)
    try {
      const draft = await draftCompanyProfile({
        workspaceId,
        companyName: companyName.trim(),
        companyWebsite: companyWebsite.trim(),
        industry,
      })
      setCompanySummary(draft.companySummary)
      setCompanyICP(draft.companyICP)
    } catch {
      setOnboardingError('We could not generate drafts right now. Please try again.')
    } finally {
      setIsLoadingSummary(false)
    }
  }
  
  // Add competitor row
  const addCompetitor = () => {
    setCompetitors([
      ...competitors,
      { id: crypto.randomUUID(), name: '', website: '' },
    ])
  }
  
  // Remove competitor row
  const removeCompetitor = (id: string) => {
    if (competitors.length > 1) {
      setCompetitors(competitors.filter(c => c.id !== id))
    }
  }
  
  // Update competitor
  const updateCompetitor = (id: string, field: 'name' | 'website', value: string) => {
    setCompetitors(competitors.map(c => 
      c.id === id ? { ...c, [field]: value } : c
    ))
  }
  
  // Add topic
  const addTopic = () => {
    if (topics.length < 3) {
      setTopics([
        ...topics,
        { id: crypto.randomUUID(), name: '', description: '', suggestedSeeds: [] },
      ])
    }
  }
  
  // Remove topic
  const removeTopic = (id: string) => {
    setTopics(topics.filter(t => t.id !== id))
  }
  
  // Update topic
  const updateTopic = (id: string, field: 'name' | 'description', value: string) => {
    setTopics(topics.map(t => 
      t.id === id ? { ...t, [field]: value } : t
    ))
  }
  
  // Suggest seeds for topic
  const suggestSeeds = async (id: string) => {
    const topic = topics.find(t => t.id === id)
    if (!topic?.name) return
    
    // Simulate AI suggestion
    await new Promise(resolve => setTimeout(resolve, 1000))
    const seeds = [
      `${topic.name} trends`,
      `${topic.name} software`,
      `${topic.name} market`,
      `${topic.name} vendors`,
    ]
    setTopics(topics.map(t => 
      t.id === id ? { ...t, suggestedSeeds: seeds } : t
    ))
  }
  
  // Navigation
  const canGoNext = () => {
    switch (currentStep.id) {
      case 'welcome':
        return workspaceName.trim() && industry
      case 'company':
        return companyName.trim() && companyWebsite.trim()
      case 'competitors':
        return competitors.some(c => c.name.trim() && c.website.trim())
      case 'topics':
        return skipTopics || topics.some(t => t.name.trim())
      case 'review':
        return true
      default:
        return false
    }
  }
  
  const goNext = async () => {
    if (currentStep.id === 'welcome' && !workspaceId) {
      try {
        setIsCreatingWorkspace(true)
        setOnboardingError(null)
        const result = await createWorkspace({
          name: workspaceName.trim(),
          companyDescription: companySummary.trim() || undefined,
        })
        setWorkspaceId(result.workspaceId)
      } catch {
        setOnboardingError('We could not create your workspace. Please try again.')
        return
      } finally {
        setIsCreatingWorkspace(false)
      }
    }
    if (currentStep.id === 'company' && workspaceId && !profileSaved) {
      try {
        setIsSavingStep(true)
        setOnboardingError(null)
        await saveWorkspaceProfile({
          workspaceId,
          companyName: companyName.trim(),
          companyWebsite: companyWebsite.trim(),
          companySummary: companySummary.trim(),
          companyICP: companyICP.trim(),
          industry,
        })
        setProfileSaved(true)
      } catch {
        setOnboardingError('We could not save your company profile. Please try again.')
        return
      } finally {
        setIsSavingStep(false)
      }
    }
    if (currentStep.id === 'competitors' && workspaceId && !competitorsSaved) {
      try {
        setIsSavingStep(true)
        setOnboardingError(null)
        await saveCompetitors({
          workspaceId,
          competitors: competitors.map((c) => ({ name: c.name, website: c.website })),
        })
        setCompetitorsSaved(true)
      } catch {
        setOnboardingError('We could not save competitors. Please try again.')
        return
      } finally {
        setIsSavingStep(false)
      }
    }
    if (currentStep.id === 'topics' && workspaceId && !topicsSaved && !skipTopics) {
      try {
        setIsSavingStep(true)
        setOnboardingError(null)
        await saveTopics({
          workspaceId,
          topics: topics.map((t) => ({ name: t.name, description: t.description })),
        })
        setTopicsSaved(true)
      } catch {
        setOnboardingError('We could not save topics. Please try again.')
        return
      } finally {
        setIsSavingStep(false)
      }
    }

    if (currentStepIndex < STEPS.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1)
    }
  }
  
  const goBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1)
    }
  }
  
  // After a sweep is queued, advance the onboarding progress UI (real work runs via Inngest).
  React.useEffect(() => {
    if (!showSweepProgress) return
    const interval = setInterval(() => {
      setSweepStageIndex((prev) => {
        if (prev >= SWEEP_STAGES.length - 1) return prev
        return prev + 1
      })
      setEstimatedTimeRemaining((prev) => Math.max(0, prev - 40))
    }, 3000)
    return () => clearInterval(interval)
  }, [showSweepProgress])

  const launchSweep = async () => {
    setOnboardingError(null)
    setIsSchedulingSweep(true)
    try {
      const result = await triggerManualSweep({ onboardingFirstSweep: true })
      if (!result.ok) {
        setOnboardingError(result.error)
        return
      }
      setSweepStageIndex(0)
      setEstimatedTimeRemaining(300)
      setShowSweepProgress(true)
    } finally {
      setIsSchedulingSweep(false)
    }
  }
  
  // Navigate to dashboard when sweep is done
  const goToDashboard = () => {
    router.push('/')
  }
  
  // Format time remaining
  const formatTimeRemaining = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
  
  // Sweep progress screen
  if (showSweepProgress) {
    const sweepComplete = sweepStageIndex >= SWEEP_STAGES.length - 1
    
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4">
        {/* Logo */}
        <div className="mb-8">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-accent flex items-center justify-center">
              <span className="font-semibold text-accent-foreground text-sm">D</span>
            </div>
            <span className="font-semibold text-lg">DOSI.AI</span>
          </div>
        </div>
        
        <div className="w-full max-w-md">
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-xl font-semibold text-center mb-2">
                {sweepComplete ? 'Your workspace is ready!' : 'Running your first sweep...'}
              </h2>
              <p className="text-sm text-muted-foreground text-center mb-6">
                {sweepComplete
                  ? 'We found intelligence across your competitive landscape.'
                  : "Your sweep is running in the background. Feel free to navigate away—we'll email you when it's ready."}
              </p>
              
              {/* Progress indicator */}
              <div className="space-y-3 mb-6">
                {SWEEP_STAGES.map((stage, index) => {
                  const isComplete = index < sweepStageIndex || (sweepComplete && index <= sweepStageIndex)
                  const isCurrent = index === sweepStageIndex && !sweepComplete
                  
                  return (
                    <div key={stage.id} className="flex items-center gap-3">
                      <div className={cn(
                        'size-6 rounded-full flex items-center justify-center shrink-0 transition-all',
                        isComplete 
                          ? 'bg-positive text-white' 
                          : isCurrent 
                            ? 'bg-accent text-accent-foreground' 
                            : 'bg-muted text-muted-foreground'
                      )}>
                        {isComplete ? (
                          <Check className="size-3.5" />
                        ) : isCurrent ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <span className="text-xs">{index + 1}</span>
                        )}
                      </div>
                      <span className={cn(
                        'text-sm',
                        isComplete || isCurrent ? 'text-foreground' : 'text-muted-foreground'
                      )}>
                        {stage.label}
                      </span>
                    </div>
                  )
                })}
              </div>
              
              {/* Time remaining */}
              {!sweepComplete && (
                <div className="text-center text-sm text-muted-foreground mb-6">
                  Estimated time remaining: {formatTimeRemaining(estimatedTimeRemaining)}
                </div>
              )}
              
              {/* Actions */}
              <div className="flex flex-col gap-2">
                {sweepComplete ? (
                  <Button onClick={goToDashboard} className="w-full">
                    Go to Dashboard
                  </Button>
                ) : (
                  <>
                    <Button variant="outline" onClick={goToDashboard} className="w-full">
                      Continue to Dashboard
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">
                      We&apos;ll email you when the sweep is complete.
                    </p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }
  
  return (
    <div className="flex min-h-screen flex-col items-center px-4 py-8">
      {/* Logo */}
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-accent flex items-center justify-center">
            <span className="font-semibold text-accent-foreground text-sm">D</span>
          </div>
          <span className="font-semibold text-lg">DOSI.AI</span>
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="w-full max-w-[640px] mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">
            Step {currentStepIndex + 1} of {STEPS.length}
          </span>
          <span className="text-xs text-muted-foreground font-medium">
            {currentStep.title}
          </span>
        </div>
        <Progress value={((currentStepIndex + 1) / STEPS.length) * 100} className="h-1" />
      </div>
      
      {/* Step content */}
      <div className="w-full max-w-[640px]">
        {/* Step 1: Welcome */}
        {currentStep.id === 'welcome' && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-semibold mb-2">Let&apos;s set up your workspace</h1>
              <p className="text-muted-foreground">
                We&apos;ll get you up and running in a few minutes.
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="workspace-name">Workspace name</Label>
                <Input
                  id="workspace-name"
                  placeholder="e.g., Acme Corp CI Team"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Industry / Vertical</Label>
                <div className="flex flex-wrap gap-2">
                  {INDUSTRIES.map(ind => (
                    <button
                      key={ind.id}
                      onClick={() => setIndustry(ind.id)}
                      className={cn(
                        'px-4 py-2.5 rounded-lg border text-sm font-medium transition-all',
                        industry === ind.id
                          ? 'bg-accent text-accent-foreground border-accent'
                          : 'bg-card border-border hover:border-accent/50'
                      )}
                    >
                      {ind.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Step 2: Your Company */}
        {currentStep.id === 'company' && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-semibold mb-2">Tell us about your company</h1>
              <p className="text-muted-foreground">
                We&apos;ll use this to understand your competitive landscape.
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company-name">Company name</Label>
                  <Input
                    id="company-name"
                    placeholder="e.g., Acme Corp"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company-website">Website</Label>
                  <Input
                    id="company-website"
                    placeholder="e.g., acme.com"
                    value={companyWebsite}
                    onChange={(e) => setCompanyWebsite(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="company-summary">Company summary</Label>
                  <button
                    type="button"
                    onClick={() => void generateSummary()}
                    disabled={isLoadingSummary || !workspaceId || !companyName.trim() || !companyWebsite.trim()}
                    className="text-xs text-accent hover:underline disabled:text-muted-foreground disabled:no-underline"
                    title={!companyName.trim() || !companyWebsite.trim() ? 'Enter company name and website first' : undefined}
                  >
                    {isLoadingSummary ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Loader2 className="size-3 animate-spin" />
                        Drafting with AI...
                      </span>
                    ) : (
                      'Draft with AI'
                    )}
                  </button>
                </div>
                <Textarea
                  id="company-summary"
                  placeholder="A 2-4 sentence description of what your company does..."
                  value={companySummary}
                  onChange={(e) => setCompanySummary(e.target.value)}
                  className="min-h-[120px]"
                  disabled={isLoadingSummary}
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="company-icp">Ideal Customer Profile (ICP)</Label>
                  <button
                    type="button"
                    onClick={() => void generateSummary()}
                    disabled={isLoadingSummary || !workspaceId || !companyName.trim() || !companyWebsite.trim()}
                    className="text-xs text-accent hover:underline disabled:text-muted-foreground disabled:no-underline"
                    title={!companyName.trim() || !companyWebsite.trim() ? 'Enter company name and website first' : undefined}
                  >
                    Draft with AI
                  </button>
                </div>
                <Textarea
                  id="company-icp"
                  placeholder="Describe your ideal customer in 1-2 sentences..."
                  value={companyICP}
                  onChange={(e) => setCompanyICP(e.target.value)}
                  className="min-h-[80px]"
                  disabled={isLoadingSummary}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Logo (optional)</Label>
                <div className="border border-dashed border-border rounded-lg p-6 text-center hover:border-accent/50 transition-colors cursor-pointer">
                  <Upload className="size-6 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Drop your logo here or click to upload
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Step 3: Add Competitors */}
        {currentStep.id === 'competitors' && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-semibold mb-2">Add 3-5 competitors to start</h1>
              <p className="text-muted-foreground">
                We&apos;ll discover more for you automatically.
              </p>
            </div>
            
            <div className="space-y-3">
              {competitors.map((competitor, index) => (
                <div key={competitor.id} className="flex items-center gap-3">
                  <div className="flex-1 grid grid-cols-2 gap-3">
                    <Input
                      placeholder="Competitor name"
                      value={competitor.name}
                      onChange={(e) => updateCompetitor(competitor.id, 'name', e.target.value)}
                    />
                    <Input
                      placeholder="Website"
                      value={competitor.website}
                      onChange={(e) => updateCompetitor(competitor.id, 'website', e.target.value)}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeCompetitor(competitor.id)}
                    disabled={competitors.length === 1}
                    className="shrink-0"
                  >
                    <Trash2 className="size-4 text-muted-foreground" />
                  </Button>
                </div>
              ))}
              
              <Button
                variant="outline"
                onClick={addCompetitor}
                className="w-full"
              >
                <Plus className="size-4 mr-2" />
                Add another competitor
              </Button>
            </div>
            
            <div className="bg-muted/50 rounded-lg p-4 mt-6">
              <p className="text-sm text-muted-foreground">
                We&apos;ll build structured profiles for each competitor in about two minutes after you finish setup.
              </p>
            </div>
          </div>
        )}
        
        {/* Step 4: Topics */}
        {currentStep.id === 'topics' && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-semibold mb-2">Want to track any market themes beyond competitors?</h1>
              <p className="text-muted-foreground">
                Topics help you monitor industry trends and regulations.
              </p>
            </div>
            
            {!skipTopics ? (
              <>
                <div className="space-y-4">
                  {topics.map((topic) => (
                    <Card key={topic.id}>
                      <CardContent className="pt-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-1 space-y-3">
                            <Input
                              placeholder="Topic name (e.g., FMCSA Compliance)"
                              value={topic.name}
                              onChange={(e) => updateTopic(topic.id, 'name', e.target.value)}
                              onBlur={() => {
                                if (topic.name && topic.suggestedSeeds.length === 0) {
                                  suggestSeeds(topic.id)
                                }
                              }}
                            />
                            <Input
                              placeholder="Brief description"
                              value={topic.description}
                              onChange={(e) => updateTopic(topic.id, 'description', e.target.value)}
                            />
                            {topic.suggestedSeeds.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {topic.suggestedSeeds.map((seed, i) => (
                                  <span key={i} className="px-2 py-0.5 bg-muted rounded text-xs">
                                    {seed}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeTopic(topic.id)}
                            className="shrink-0"
                          >
                            <X className="size-4 text-muted-foreground" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  
                  {topics.length < 3 && (
                    <Button
                      variant="outline"
                      onClick={addTopic}
                      className="w-full"
                    >
                      <Plus className="size-4 mr-2" />
                      Add another topic
                    </Button>
                  )}
                </div>
                
                <Button
                  variant="ghost"
                  onClick={() => setSkipTopics(true)}
                  className="w-full text-muted-foreground"
                >
                  Skip this — I&apos;ll do it later
                </Button>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  No problem! You can add topics later from the Topics page.
                </p>
                <Button
                  variant="outline"
                  onClick={() => setSkipTopics(false)}
                >
                  Actually, let me add some topics
                </Button>
              </div>
            )}
          </div>
        )}
        
        {/* Step 5: Review */}
        {currentStep.id === 'review' && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-semibold mb-2">Review and launch</h1>
              <p className="text-muted-foreground">
                Make sure everything looks good before we start.
              </p>
            </div>
            
            <div className="space-y-4">
              {/* Workspace */}
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium">Workspace</h3>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setCurrentStepIndex(0)}
                    >
                      Edit
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">{workspaceName}</p>
                  <p className="text-sm text-muted-foreground">
                    {INDUSTRIES.find(i => i.id === industry)?.label}
                  </p>
                </CardContent>
              </Card>
              
              {/* Company */}
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium">Your Company</h3>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setCurrentStepIndex(1)}
                    >
                      Edit
                    </Button>
                  </div>
                  <p className="text-sm font-medium">{companyName}</p>
                  <p className="text-sm text-muted-foreground">{companyWebsite}</p>
                </CardContent>
              </Card>
              
              {/* Competitors */}
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium">Competitors</h3>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setCurrentStepIndex(2)}
                    >
                      Edit
                    </Button>
                  </div>
                  <div className="space-y-1">
                    {competitors.filter(c => c.name).map(competitor => (
                      <p key={competitor.id} className="text-sm text-muted-foreground">
                        {competitor.name} ({competitor.website})
                      </p>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              {/* Topics */}
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium">Topics</h3>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setCurrentStepIndex(3)}
                    >
                      Edit
                    </Button>
                  </div>
                  {skipTopics ? (
                    <p className="text-sm text-muted-foreground">Skipped — will add later</p>
                  ) : (
                    <div className="space-y-1">
                      {topics.filter(t => t.name).map(topic => (
                        <p key={topic.id} className="text-sm text-muted-foreground">
                          {topic.name}
                        </p>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            
            {/* Launch button */}
            <Button
              onClick={() => void launchSweep()}
              size="lg"
              className="w-full mt-6"
              disabled={!workspaceId || isSchedulingSweep}
              title={!workspaceId ? 'Workspace not ready — go back and complete earlier steps' : undefined}
            >
              {isSchedulingSweep ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Starting sweep…
                </>
              ) : (
                'Run my first sweep'
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Queues your first intelligence sweep from the competitors and topics you set up. You can open
              the dashboard anytime while it runs.
            </p>
          </div>
        )}
        
        {/* Navigation */}
        {currentStep.id !== 'review' && (
          <div className="flex items-center justify-between mt-8 pt-6 border-t">
            <Button
              variant="ghost"
              onClick={goBack}
              disabled={currentStepIndex === 0}
            >
              <ChevronLeft className="size-4 mr-2" />
              Back
            </Button>
            <Button
              onClick={goNext}
              disabled={!canGoNext() || isCreatingWorkspace || isSavingStep}
            >
              {isCreatingWorkspace ? 'Creating workspace...' : isSavingStep ? 'Saving...' : 'Continue'}
              <ChevronRight className="size-4 ml-2" />
            </Button>
          </div>
        )}
        
        {currentStep.id === 'review' && (
          <div className="flex justify-start mt-6 pt-6 border-t">
            <Button
              variant="ghost"
              onClick={goBack}
            >
              <ChevronLeft className="size-4 mr-2" />
              Back
            </Button>
          </div>
        )}
      </div>
      {onboardingError && (
        <p className="mt-4 text-sm text-destructive">{onboardingError}</p>
      )}
    </div>
  )
}
