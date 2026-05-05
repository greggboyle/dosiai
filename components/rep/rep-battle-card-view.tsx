'use client'

import { ChevronDown, AlertTriangle, Zap } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Separator } from '@/components/ui/separator'
import type { RepBattleCardView } from '@/lib/battle-cards/rep-mapper'

export function RepBattleCardView({ data }: { data: RepBattleCardView }) {
  return (
    <div className="min-h-screen bg-background text-foreground pb-12">
      <header className="sticky top-0 z-10 border-b border-border/80 bg-background/95 backdrop-blur px-4 py-3">
        <div className="max-w-lg mx-auto flex items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold leading-tight">{data.competitorName}</h1>
            <div className="flex flex-wrap gap-2 mt-1">
              {data.tierLabel ? (
                <Badge variant="outline" className="text-[10px]">
                  {data.tierLabel}
                </Badge>
              ) : null}
              {data.stale ? (
                <Badge variant="destructive" className="text-[10px] gap-1">
                  <AlertTriangle className="size-3" /> Stale
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-[10px]">
                  Fresh {data.freshnessScore ?? '—'}
                </Badge>
              )}
            </div>
          </div>
          <Zap className="size-5 text-amber-400 shrink-0 mt-0.5" aria-hidden />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-8">
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">TL;DR</h2>
          <div className="rounded-xl border border-border/80 bg-card/40 p-4 space-y-3 text-sm leading-relaxed">
            <div>
              <p className="text-[10px] uppercase text-muted-foreground mb-1">They position</p>
              <p>{data.tldr.theyPosition || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-muted-foreground mb-1">We counter</p>
              <p>{data.tldr.weCounter || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-muted-foreground mb-1">Remember</p>
              <p className="text-amber-200/90">{data.tldr.remember || '—'}</p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            Top objections
          </h2>
          <div className="space-y-2">
            {data.objections.length === 0 ? (
              <p className="text-sm text-muted-foreground">No objections captured yet.</p>
            ) : (
              data.objections.map((o, i) => (
                <Collapsible key={i} defaultOpen={i === 0} className="rounded-lg border border-border/60 bg-card/30">
                  <CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-3 text-left text-sm font-medium">
                    <span className="pr-2">{o.objection}</span>
                    <ChevronDown className="size-4 shrink-0 transition-transform [[data-state=open]_&]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="px-3 pb-3 text-sm text-muted-foreground leading-relaxed border-t border-border/40 pt-2">
                    {o.response}
                  </CollapsibleContent>
                </Collapsible>
              ))
            )}
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Trap-setting</h2>
          <ul className="space-y-2 text-sm">
            {data.trapQuestions.map((q, i) => (
              <li key={i} className="rounded-lg bg-muted/40 px-3 py-2 border border-border/50">
                {q}
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Why they win</h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {data.whyTheyWin.map((b, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-rose-400">•</span>
                <span>{b.text}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Why we win</h2>
          <ul className="space-y-2 text-sm">
            {data.whyWeWin.map((b, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-emerald-400">•</span>
                <span>{b.text}</span>
              </li>
            ))}
          </ul>
        </section>

        <Separator />

        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Proof</h2>
          <div className="space-y-3 text-sm">
            {data.proofPoints.map((p, i) => (
              <div key={i} className="rounded-lg border border-border/50 p-3 bg-card/30">
                <p className="font-medium">{p.headline}</p>
                {p.detail ? <p className="text-muted-foreground mt-1 text-xs">{p.detail}</p> : null}
              </div>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg border border-border/50 p-3 bg-card/30">
            <p className="text-[10px] uppercase text-muted-foreground mb-1">Their pricing</p>
            <p className="text-xs leading-relaxed">{data.pricing.theirs || '—'}</p>
          </div>
          <div className="rounded-lg border border-border/50 p-3 bg-card/30">
            <p className="text-[10px] uppercase text-muted-foreground mb-1">Our pricing</p>
            <p className="text-xs leading-relaxed">{data.pricing.ours || '—'}</p>
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recent activity</h2>
          <ul className="space-y-2 text-xs text-muted-foreground">
            {data.recentActivity.map((r, i) => (
              <li key={i} className="flex justify-between gap-2 border-b border-border/30 pb-2">
                <span className="line-clamp-2">{r.title}</span>
                {r.miScore != null ? (
                  <span className="shrink-0 tabular-nums text-foreground">{Math.round(r.miScore)}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-3 pb-8">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Talk tracks</h2>
          {data.talkTracks.map((t, i) => (
            <div key={i} className="rounded-lg border border-border/50 p-3 bg-card/20 text-sm space-y-1">
              <p className="text-xs font-medium text-foreground">{t.scenario}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{t.content}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  )
}
