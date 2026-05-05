'use client'

import * as React from 'react'
import Link from 'next/link'
import { Plus, Search, ExternalLink, ChevronRight, Clock, Smartphone } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { getRelativeTime } from '@/lib/types'

interface BattleCard {
  id: string
  competitorId: string
  competitorName: string
  competitorLogo?: string
  lastUpdated: string
  overview: string
  strengths: string[]
  weaknesses: string[]
  talkingPoints: string[]
}

// Mock data
const battleCards: BattleCard[] = [
  {
    id: '1',
    competitorId: '1',
    competitorName: 'Competitor X',
    lastUpdated: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    overview: 'Enterprise-focused SaaS platform with strong presence in Fortune 500 accounts. Recently shifted to aggressive mid-market expansion.',
    strengths: [
      'Strong brand recognition in enterprise segment',
      'Deep integrations with legacy systems',
      'Large professional services organization',
      '24/7 global support coverage',
    ],
    weaknesses: [
      'Higher total cost of ownership',
      'Slower product innovation cycle',
      'Complex implementation requirements',
      'Limited modern API capabilities',
    ],
    talkingPoints: [
      'Highlight our 60% faster implementation time',
      'Emphasize modern architecture and API-first approach',
      'Reference customer success stories in mid-market',
      'Discuss lower TCO over 3-year period',
    ],
  },
  {
    id: '2',
    competitorId: '2',
    competitorName: 'Rival Corp',
    lastUpdated: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    overview: 'Cloud-native startup with strong developer focus. Growing quickly in SMB and mid-market segments.',
    strengths: [
      'Developer-friendly product experience',
      'Competitive pricing for SMB',
      'Fast product iteration cycles',
      'Strong community engagement',
    ],
    weaknesses: [
      'Limited enterprise features',
      'Smaller customer success team',
      'Less mature security certifications',
      'Narrower integration ecosystem',
    ],
    talkingPoints: [
      'Emphasize enterprise-grade security and compliance',
      'Highlight breadth of integration partnerships',
      'Discuss dedicated customer success resources',
      'Reference enterprise customer references',
    ],
  },
  {
    id: '3',
    competitorId: '3',
    competitorName: 'AcmeTech',
    lastUpdated: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    overview: 'AI-focused competitor emphasizing automation and machine learning capabilities. Strong positioning in tech-forward accounts.',
    strengths: [
      'Advanced AI/ML capabilities',
      'Strong technical differentiation',
      'Innovative product roadmap',
      'High engineering talent density',
    ],
    weaknesses: [
      'Earlier stage in market maturity',
      'Limited vertical expertise',
      'Smaller partner ecosystem',
      'Less proven at scale',
    ],
    talkingPoints: [
      'Discuss our own AI investments and roadmap',
      'Emphasize proven scalability with large customers',
      'Highlight industry-specific solutions',
      'Reference mature partner ecosystem',
    ],
  },
]

export default function BattleCardsPage() {
  const [searchQuery, setSearchQuery] = React.useState('')
  const [selectedCard, setSelectedCard] = React.useState<BattleCard | null>(battleCards[0])

  const filteredCards = battleCards.filter((card) =>
    card.competitorName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Battle Cards</h1>
          <p className="text-sm text-muted-foreground">
            Sales enablement resources for competitive situations
          </p>
        </div>
        <Button>
          <Plus className="size-4 mr-2" />
          New Battle Card
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex gap-6 h-[calc(100vh-12rem)]">
        {/* Card List */}
        <div className="w-80 flex-shrink-0 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search competitors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <ScrollArea className="h-[calc(100%-3rem)]">
            <div className="space-y-2 pr-4">
              {filteredCards.map((card) => (
                <button
                  key={card.id}
                  onClick={() => setSelectedCard(card)}
                  className={cn(
                    'w-full text-left p-4 rounded-lg border transition-colors',
                    selectedCard?.id === card.id
                      ? 'border-accent bg-accent/5'
                      : 'border-border hover:bg-muted/50'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded bg-secondary flex items-center justify-center font-medium text-secondary-foreground flex-shrink-0">
                      {card.competitorName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{card.competitorName}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="size-3" />
                        Updated {getRelativeTime(card.lastUpdated)}
                      </p>
                    </div>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Card Detail */}
        {selectedCard ? (
          <Card className="flex-1 overflow-hidden">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="size-12 rounded-lg bg-secondary flex items-center justify-center text-lg font-semibold text-secondary-foreground">
                    {selectedCard.competitorName.charAt(0)}
                  </div>
                  <div>
                    <CardTitle className="text-xl">{selectedCard.competitorName}</CardTitle>
                    <CardDescription className="flex items-center gap-1">
                      Last updated {getRelativeTime(selectedCard.lastUpdated)}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/rep/${selectedCard.competitorId}`}>
                      <Smartphone className="size-4 mr-2" />
                      Rep View
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/battle-cards/${selectedCard.id}/edit`}>
                      Edit
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm">
                    Share
                  </Button>
                </div>
              </div>
            </CardHeader>

            <ScrollArea className="h-[calc(100%-5rem)]">
              <div className="p-6 space-y-6">
                {/* Overview */}
                <div>
                  <h3 className="text-sm font-medium mb-2">Overview</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {selectedCard.overview}
                  </p>
                </div>

                <Separator />

                {/* Strengths & Weaknesses */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <div className="size-2 rounded-full bg-positive" />
                      Competitor Strengths
                    </h3>
                    <ul className="space-y-2">
                      {selectedCard.strengths.map((strength, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-positive mt-1">+</span>
                          {strength}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <div className="size-2 rounded-full bg-negative" />
                      Competitor Weaknesses
                    </h3>
                    <ul className="space-y-2">
                      {selectedCard.weaknesses.map((weakness, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-negative mt-1">-</span>
                          {weakness}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <Separator />

                {/* Talking Points */}
                <div>
                  <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <div className="size-2 rounded-full bg-accent" />
                    Talking Points
                  </h3>
                  <div className="grid gap-3">
                    {selectedCard.talkingPoints.map((point, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-lg bg-muted/50 text-sm"
                      >
                        {point}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </Card>
        ) : (
          <Card className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h3 className="text-sm font-medium">Select a battle card</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Choose a competitor to view their battle card.
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
