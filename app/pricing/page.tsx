'use client'

import * as React from 'react'
import Link from 'next/link'
import { 
  Check, 
  ChevronDown, 
  User, 
  Users, 
  ArrowRight,
  Calendar,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

// Plan data matching the spec exactly
interface PlanFeature {
  text: string
}

interface Plan {
  id: string
  name: string
  tagline: string
  monthlyPrice: number | null // null for custom
  annualPrice: number | null // null for custom
  annualTotal: number | null
  features: PlanFeature[]
  cta: string
  ctaVariant: 'default' | 'outline' | 'accent'
  isPopular?: boolean
}

const plans: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    tagline: 'For founders and part-time PMMs.',
    monthlyPrice: 99,
    annualPrice: 79,
    annualTotal: 948,
    features: [
      { text: '1 analyst seat + unlimited viewer seats' },
      { text: '5 competitors with full structured profiles' },
      { text: '3 active topics' },
      { text: 'Daily automated sweeps' },
      { text: '5 published battle cards' },
      { text: 'Unlimited win/loss logging' },
      { text: '10 AI-drafted briefs per month' },
      { text: 'Customer Voice and all four intelligence categories' },
      { text: '$40/month AI cost ceiling' },
      { text: 'Email and Slack notifications' },
    ],
    cta: 'Start free trial',
    ctaVariant: 'outline',
  },
  {
    id: 'team',
    name: 'Team',
    tagline: 'For dedicated PMM teams.',
    monthlyPrice: 349,
    annualPrice: 279,
    annualTotal: 3348,
    features: [
      { text: '5 analyst seats + unlimited viewer seats' },
      { text: '15 competitors' },
      { text: '10 active topics' },
      { text: 'Configurable cadence (up to twice-daily)' },
      { text: '15 published battle cards with segment variants' },
      { text: 'Slack lookup for battle cards' },
      { text: 'Unlimited AI-drafted briefs' },
      { text: 'Per-workspace MIS weight tuning' },
      { text: 'Bulk CSV win/loss import' },
      { text: '$200/month AI cost ceiling' },
      { text: 'Full notification stack (Slack, Teams, webhook)' },
      { text: 'Audit log retention 1 year' },
    ],
    cta: 'Start free trial',
    ctaVariant: 'accent',
    isPopular: true,
  },
  {
    id: 'business',
    name: 'Business',
    tagline: 'For mid-market CI programs.',
    monthlyPrice: 1099,
    annualPrice: 824,
    annualTotal: 9888,
    features: [
      { text: '15 analyst seats + unlimited viewer seats' },
      { text: '30 competitors' },
      { text: '25 active topics' },
      { text: 'Up to four-times-daily sweeps on request' },
      { text: 'Multi-vendor sweep mode (triangulation)' },
      { text: 'Unlimited published battle cards' },
      { text: 'Custom branding on shared rep-view links' },
      { text: 'Read-only API access' },
      { text: '$700/month AI cost ceiling' },
      { text: 'Priority support' },
      { text: 'Audit log retention 3 years' },
    ],
    cta: 'Start free trial',
    ctaVariant: 'outline',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    tagline: 'For organizations with specific compliance needs.',
    monthlyPrice: null,
    annualPrice: null,
    annualTotal: null,
    features: [
      { text: 'Unlimited everything' },
      { text: 'SSO / SCIM provisioning' },
      { text: 'Sub-hourly sweeps' },
      { text: 'Bring-your-own-key for AI vendors' },
      { text: 'Custom data residency' },
      { text: 'Dedicated CSM and named technical contact' },
      { text: 'SOC 2 / BAA support' },
      { text: 'Custom audit retention' },
    ],
    cta: 'Contact sales',
    ctaVariant: 'outline',
  },
]

// Comparison table data
const comparisonFeatures = [
  { name: 'Analyst seats', starter: '1', team: '5', business: '15', enterprise: 'Custom' },
  { name: 'Viewer seats', starter: 'Unlimited', team: 'Unlimited', business: 'Unlimited', enterprise: 'Unlimited' },
  { name: 'Competitors', starter: '5', team: '15', business: '30', enterprise: 'Unlimited' },
  { name: 'Topics', starter: '3', team: '10', business: '25', enterprise: 'Unlimited' },
  { name: 'Sweep cadence', starter: 'Daily', team: 'Up to 2x daily', business: 'Up to 4x daily', enterprise: 'Sub-hourly' },
  { name: 'Battle cards', starter: '5', team: '15', business: 'Unlimited', enterprise: 'Unlimited' },
  { name: 'Segment variants', starter: false, team: true, business: true, enterprise: true },
  { name: 'AI-drafted briefs', starter: '10/mo', team: 'Unlimited', business: 'Unlimited', enterprise: 'Unlimited' },
  { name: 'AI cost ceiling', starter: '$40/mo', team: '$200/mo', business: '$700/mo', enterprise: 'Custom' },
  { name: 'Win/loss logging', starter: true, team: true, business: true, enterprise: true },
  { name: 'CSV win/loss import', starter: false, team: true, business: true, enterprise: true },
  { name: 'MIS weight tuning', starter: false, team: true, business: true, enterprise: true },
  { name: 'Slack lookup', starter: false, team: true, business: true, enterprise: true },
  { name: 'Email notifications', starter: true, team: true, business: true, enterprise: true },
  { name: 'Slack/Teams/Webhook', starter: false, team: true, business: true, enterprise: true },
  { name: 'Custom branding', starter: false, team: false, business: true, enterprise: true },
  { name: 'API access', starter: false, team: false, business: 'Read-only', enterprise: 'Full' },
  { name: 'SSO/SCIM', starter: false, team: false, business: false, enterprise: true },
  { name: 'Audit retention', starter: '90 days', team: '1 year', business: '3 years', enterprise: 'Custom' },
  { name: 'Priority support', starter: false, team: false, business: true, enterprise: true },
  { name: 'Dedicated CSM', starter: false, team: false, business: false, enterprise: true },
]

// FAQ data
const faqs = [
  {
    question: 'What counts as an analyst seat vs. a viewer seat?',
    answer: 'Analyst seats are for team members who create and manage competitive intelligence — adding competitors, running sweeps, authoring briefs and battle cards. Viewers can consume all content (battle cards, briefs, the feed) but cannot create or edit. Viewers are always free, which means your entire sales team can access battle cards at no extra cost.',
  },
  {
    question: 'Can I change plans later?',
    answer: 'Yes, you can upgrade or downgrade at any time. When you upgrade, you get immediate access to new features. When you downgrade, your data is preserved but you may need to archive some items if you exceed the new plan limits.',
  },
  {
    question: 'What happens to my data if I downgrade?',
    answer: 'Your data is never deleted when you downgrade. However, if you exceed limits (e.g., 15 competitors on a plan with a 5-competitor limit), you will need to archive some items before the system allows new additions. Archived items are still searchable but not included in sweeps.',
  },
  {
    question: 'What is the AI cost ceiling and will I hit it?',
    answer: 'The AI cost ceiling is a monthly limit on the compute cost of AI-powered features like brief drafting, summary generation, and sweep analysis. Most teams never hit it — we set ceilings based on typical usage patterns. At 80% usage, you will see a warning. At 100%, AI features pause until the next billing cycle or you upgrade.',
  },
  {
    question: 'Do you offer annual discounts?',
    answer: 'Yes! Annual plans save 20% compared to monthly billing. The discount is applied automatically when you select annual billing during checkout or upgrade.',
  },
  {
    question: "What's included in the trial?",
    answer: 'The 14-day trial includes full Starter plan capabilities: 1 analyst seat, 5 competitors, daily sweeps, and access to all intelligence categories. No credit card required to start.',
  },
  {
    question: 'What if I need more than the Business tier offers?',
    answer: 'Enterprise plans are fully customizable. Contact our sales team to discuss your specific needs — whether that is higher limits, custom integrations, SSO, or dedicated support.',
  },
  {
    question: 'Do you offer nonprofit or startup pricing?',
    answer: 'Yes, we offer discounted pricing for registered nonprofits and early-stage startups (pre-Series A). Contact us at hello@dosi.ai with details about your organization.',
  },
]

export default function PricingPage() {
  const [billingInterval, setBillingInterval] = React.useState<'annual' | 'monthly'>('annual')
  const [comparisonOpen, setComparisonOpen] = React.useState(false)

  return (
    <div className="min-h-screen bg-background">
      {/* Minimal header */}
      <header className="border-b border-border">
        <div className="mx-auto max-w-7xl px-6 h-14 flex items-center justify-between">
          <Link href="/" className="font-semibold text-lg tracking-tight">
            DOSI.AI
          </Link>
          <Link 
            href="/login" 
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign in
          </Link>
        </div>
      </header>

      {/* Hero section */}
      <section className="py-16 px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-[32px] font-semibold tracking-tight mb-4 text-balance">
            Pricing built for the way you actually work.
          </h1>
          <p className="text-lg text-muted-foreground max-w-[720px] mx-auto mb-8">
            Pay for analysts, not for your sales team. Every paid plan includes unlimited free viewer seats.
          </p>

          {/* Billing toggle */}
          <div className="inline-flex items-center gap-1 p-1 rounded-full bg-muted/50 border border-border">
            <button
              onClick={() => setBillingInterval('annual')}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-medium transition-all',
                billingInterval === 'annual'
                  ? 'bg-accent text-accent-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Annual (save 20%)
            </button>
            <button
              onClick={() => setBillingInterval('monthly')}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-medium transition-all',
                billingInterval === 'monthly'
                  ? 'bg-accent text-accent-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Monthly
            </button>
          </div>
        </div>
      </section>

      {/* Plan cards */}
      <section className="px-6 pb-16">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan) => {
              const price = billingInterval === 'annual' ? plan.annualPrice : plan.monthlyPrice
              
              return (
                <div
                  key={plan.id}
                  className={cn(
                    'relative rounded-lg border p-6 flex flex-col bg-card',
                    plan.isPopular 
                      ? 'border-accent shadow-md ring-1 ring-accent/20' 
                      : 'border-border'
                  )}
                >
                  {plan.isPopular && (
                    <Badge 
                      className="absolute -top-2.5 left-4 bg-accent text-accent-foreground border-0 text-[10px] uppercase tracking-wider font-medium"
                    >
                      Most popular
                    </Badge>
                  )}

                  {/* Plan header */}
                  <div className="mb-6">
                    <h3 className="text-xl font-semibold mb-1">{plan.name}</h3>
                    <p className="text-sm text-muted-foreground">{plan.tagline}</p>
                  </div>

                  {/* Price */}
                  <div className="mb-6">
                    {price !== null ? (
                      <>
                        <div className="flex items-baseline gap-1">
                          <span className="text-5xl font-semibold font-mono tracking-tight">
                            ${price}
                          </span>
                          <span className="text-sm text-muted-foreground">/month</span>
                        </div>
                        {billingInterval === 'annual' && plan.annualTotal && (
                          <p className="text-xs text-muted-foreground mt-1">
                            billed annually at ${plan.annualTotal.toLocaleString()}/year
                          </p>
                        )}
                        {billingInterval === 'monthly' && plan.annualPrice && (
                          <p className="text-xs text-muted-foreground mt-1">
                            or ${plan.annualPrice}/mo billed annually
                          </p>
                        )}
                      </>
                    ) : (
                      <div className="flex items-baseline">
                        <span className="text-5xl font-semibold font-mono tracking-tight">
                          Custom
                        </span>
                      </div>
                    )}
                  </div>

                  {/* CTA */}
                  <Button
                    className={cn(
                      'w-full mb-6',
                      plan.ctaVariant === 'accent' && 'bg-accent text-accent-foreground hover:bg-accent/90'
                    )}
                    variant={plan.ctaVariant === 'accent' ? 'default' : 'outline'}
                    asChild
                  >
                    <Link href={plan.id === 'enterprise' ? 'https://cal.com/dosi-ai/enterprise' : '/signup'}>
                      {plan.cta}
                      <ArrowRight className="size-4 ml-2" />
                    </Link>
                  </Button>

                  {/* Features */}
                  <div className="space-y-2.5 flex-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                      What&apos;s included
                    </p>
                    {plan.features.map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <Check className="size-4 text-accent mt-0.5 flex-shrink-0" />
                        <span className="text-sm leading-snug">{feature.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Why we price by analyst */}
      <section className="px-6 py-16 bg-muted/30 border-y border-border">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-2xl font-semibold mb-8 text-center">
            Pricing built for sales adoption
          </h2>
          
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Explanation */}
            <div className="space-y-4">
              <p className="text-muted-foreground leading-relaxed">
                Most CI tools charge per user, which means a 200-rep sales team makes the tool unaffordable. 
                We charge for analyst seats — the people doing the work — and let your entire org consume the output for free.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                This means your PMM can create battle cards and your entire sales floor can access them instantly, 
                without per-seat licensing friction.
              </p>
            </div>

            {/* Visual diagram */}
            <div className="flex items-center justify-center gap-6">
              {/* Analysts card */}
              <div className="flex flex-col items-center">
                <div className="rounded-lg border border-accent bg-accent/10 p-6 mb-2">
                  <div className="flex items-center gap-2">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="size-8 rounded-full bg-accent/30 flex items-center justify-center">
                        <User className="size-4 text-accent" />
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-sm font-medium">Analysts</p>
                <p className="text-xs text-muted-foreground">(paid)</p>
              </div>

              {/* Arrow */}
              <ArrowRight className="size-6 text-muted-foreground flex-shrink-0" />

              {/* Viewers card */}
              <div className="flex flex-col items-center">
                <div className="rounded-lg border border-border bg-card p-6 mb-2">
                  <div className="grid grid-cols-5 gap-1">
                    {[...Array(25)].map((_, i) => (
                      <div key={i} className="size-5 rounded-full bg-muted flex items-center justify-center">
                        <Users className="size-2.5 text-muted-foreground" />
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-sm font-medium">Viewers</p>
                <p className="text-xs text-positive">(free, unlimited)</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison table */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <Collapsible open={comparisonOpen} onOpenChange={setComparisonOpen}>
            <CollapsibleTrigger className="w-full flex items-center justify-center gap-2 text-lg font-semibold hover:text-accent transition-colors">
              Detailed feature comparison
              <ChevronDown 
                className={cn(
                  'size-5 transition-transform',
                  comparisonOpen && 'rotate-180'
                )} 
              />
            </CollapsibleTrigger>

            <CollapsibleContent className="mt-8">
              <div className="overflow-x-auto border border-border rounded-lg">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left py-3 px-4 font-medium sticky left-0 bg-muted/30 min-w-[180px]">
                        Feature
                      </th>
                      <th className="text-center py-3 px-4 font-medium min-w-[120px]">Starter</th>
                      <th className="text-center py-3 px-4 font-medium min-w-[120px] bg-accent/5">Team</th>
                      <th className="text-center py-3 px-4 font-medium min-w-[120px]">Business</th>
                      <th className="text-center py-3 px-4 font-medium min-w-[120px]">Enterprise</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {comparisonFeatures.map((feature) => (
                      <tr key={feature.name}>
                        <td className="py-3 px-4 text-muted-foreground sticky left-0 bg-card">
                          {feature.name}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {renderFeatureValue(feature.starter)}
                        </td>
                        <td className="py-3 px-4 text-center bg-accent/5">
                          {renderFeatureValue(feature.team)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {renderFeatureValue(feature.business)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {renderFeatureValue(feature.enterprise)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 py-16 bg-muted/30 border-t border-border">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-2xl font-semibold mb-8 text-center">
            Frequently asked questions
          </h2>

          <Accordion type="single" collapsible className="space-y-2">
            {faqs.map((faq, idx) => (
              <AccordionItem 
                key={idx} 
                value={`faq-${idx}`}
                className="border border-border rounded-lg bg-card px-4"
              >
                <AccordionTrigger className="text-left font-medium hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-semibold mb-4">
            Try DOSI.AI free for 14 days.
          </h2>
          <p className="text-muted-foreground mb-8">
            No credit card required.
          </p>

          <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90" asChild>
            <Link href="/signup">
              Start free trial
              <ArrowRight className="size-4 ml-2" />
            </Link>
          </Button>

          <p className="text-sm text-muted-foreground mt-6">
            Or{' '}
            <a 
              href="https://cal.com/dosi-ai/demo" 
              className="text-accent hover:underline inline-flex items-center gap-1"
            >
              <Calendar className="size-3" />
              schedule a 20-minute walkthrough
            </a>
            {' '}with our team.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6">
        <div className="mx-auto max-w-7xl flex items-center justify-between text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} DOSI.AI</p>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

function renderFeatureValue(value: string | boolean) {
  if (value === true) {
    return <Check className="size-4 text-accent mx-auto" />
  }
  if (value === false) {
    return <span className="text-muted-foreground">—</span>
  }
  return <span>{value}</span>
}
