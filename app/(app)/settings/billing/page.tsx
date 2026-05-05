'use client'

import * as React from 'react'
import Link from 'next/link'
import { 
  CreditCard, 
  Calendar, 
  Users, 
  Zap, 
  Building2, 
  ArrowUpRight,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Clock,
  Download,
  ChevronDown,
  ChevronUp,
  FileText,
  Swords,
  Radio,
  Eye,
  Hash,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  PLAN_CONFIG, 
  type WorkspaceSubscription,
  formatPrice,
} from '@/lib/billing-types'

// -------------------------------------------------------------------
// Mock data - realistic seed data for a Team annual workspace
// -------------------------------------------------------------------
const mockSubscription: WorkspaceSubscription = {
  planId: 'team',
  status: 'active',
  billingInterval: 'annual',
  currentPeriodStart: '2026-03-14T00:00:00Z',
  currentPeriodEnd: '2027-03-14T00:00:00Z',
  cancelAtPeriodEnd: false,
  aiCostUsedCents: 8400, // $84
  aiCostCeilingCents: 20000, // $200
  aiCostPercentUsed: 42,
  analystSeatsUsed: 3,
  analystSeatsLimit: 5,
}

const mockUsageStats = {
  sweepsRunThisMonth: 47,
  itemsReviewed: 184,
  briefsAuthored: 12,
  battleCardsUpdated: 7,
  viewerSeats: 14,
  competitorsTracked: 12,
  competitorsLimit: 15,
  topicsTracked: 7,
  topicsLimit: 10,
  battleCardsCount: 9,
  battleCardsLimit: 15,
}

// AI spend by day for the chart (last 30 days)
const mockAISpendByDay = [
  { day: 'Apr 6', spend: 280 },
  { day: 'Apr 7', spend: 320 },
  { day: 'Apr 8', spend: 0 },
  { day: 'Apr 9', spend: 150 },
  { day: 'Apr 10', spend: 420 },
  { day: 'Apr 11', spend: 180 },
  { day: 'Apr 12', spend: 0 },
  { day: 'Apr 13', spend: 0 },
  { day: 'Apr 14', spend: 350 },
  { day: 'Apr 15', spend: 280 },
  { day: 'Apr 16', spend: 450 },
  { day: 'Apr 17', spend: 120 },
  { day: 'Apr 18', spend: 380 },
  { day: 'Apr 19', spend: 0 },
  { day: 'Apr 20', spend: 0 },
  { day: 'Apr 21', spend: 520 },
  { day: 'Apr 22', spend: 280 },
  { day: 'Apr 23', spend: 350 },
  { day: 'Apr 24', spend: 180 },
  { day: 'Apr 25', spend: 420 },
  { day: 'Apr 26', spend: 0 },
  { day: 'Apr 27', spend: 0 },
  { day: 'Apr 28', spend: 380 },
  { day: 'Apr 29', spend: 290 },
  { day: 'Apr 30', spend: 450 },
  { day: 'May 1', spend: 180 },
  { day: 'May 2', spend: 320 },
  { day: 'May 3', spend: 0 },
  { day: 'May 4', spend: 0 },
  { day: 'May 5', spend: 250 },
]

const mockInvoices = [
  { id: 'inv-008', date: 'Mar 14, 2026', description: 'Team Annual - Month 8/12', amount: 27900, status: 'Paid', receiptUrl: '#' },
  { id: 'inv-007', date: 'Feb 14, 2026', description: 'Team Annual - Month 7/12', amount: 27900, status: 'Paid', receiptUrl: '#' },
  { id: 'inv-006', date: 'Jan 14, 2026', description: 'Team Annual - Month 6/12', amount: 27900, status: 'Paid', receiptUrl: '#' },
  { id: 'inv-005', date: 'Dec 14, 2025', description: 'Team Annual - Month 5/12', amount: 27900, status: 'Paid', receiptUrl: '#' },
  { id: 'inv-004', date: 'Nov 14, 2025', description: 'Team Annual - Month 4/12', amount: 27900, status: 'Paid', receiptUrl: '#' },
  { id: 'inv-003', date: 'Oct 14, 2025', description: 'Team Annual - Month 3/12', amount: 27900, status: 'Paid', receiptUrl: '#' },
  { id: 'inv-002', date: 'Sep 14, 2025', description: 'Team Annual - Month 2/12', amount: 27900, status: 'Paid', receiptUrl: '#' },
  { id: 'inv-001', date: 'Aug 14, 2025', description: 'Team Annual - Initial Payment', amount: 334800, status: 'Paid', receiptUrl: '#' },
]

const cancellationReasons = [
  { value: 'too_expensive', label: 'Too expensive for our budget' },
  { value: 'not_enough_value', label: 'Not getting enough value' },
  { value: 'switching_competitor', label: 'Switching to a different tool' },
  { value: 'company_downsizing', label: 'Company downsizing / budget cuts' },
  { value: 'project_ended', label: 'Project or initiative ended' },
  { value: 'missing_features', label: 'Missing features we need' },
  { value: 'other', label: 'Other reason' },
]

// -------------------------------------------------------------------
// Helper: Usage limit item with warning states
// -------------------------------------------------------------------
function UsageLimitItem({ 
  label, 
  used, 
  limit, 
  unlimited = false 
}: { 
  label: string
  used: number
  limit: number
  unlimited?: boolean
}) {
  const percentUsed = unlimited ? 0 : (used / limit) * 100
  const isApproaching = percentUsed >= 80 && percentUsed < 100
  const isAtLimit = percentUsed >= 100

  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2">
        <CheckCircle className="size-4 text-positive" />
        <span className="text-sm">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className={cn(
          "text-sm font-medium tabular-nums",
          isAtLimit && "text-destructive",
          isApproaching && !isAtLimit && "text-warning"
        )}>
          {unlimited ? used : `${used} of ${limit}`}
          {unlimited && <span className="text-muted-foreground font-normal ml-1">(unlimited)</span>}
        </span>
        {isApproaching && !isAtLimit && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 text-warning border-warning/30 bg-warning/10">
            Approaching limit
          </Badge>
        )}
        {isAtLimit && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 text-destructive border-destructive/30 bg-destructive/10">
            At limit
          </Badge>
        )}
      </div>
    </div>
  )
}

// -------------------------------------------------------------------
// Mini bar chart for AI spend (simple implementation)
// -------------------------------------------------------------------
function AISpendMiniChart({ data }: { data: { day: string; spend: number }[] }) {
  const maxSpend = Math.max(...data.map(d => d.spend), 1)
  
  return (
    <div className="flex items-end gap-0.5 h-16 w-full">
      {data.map((d, i) => (
        <div
          key={i}
          className="flex-1 bg-accent/60 rounded-t-sm transition-all hover:bg-accent"
          style={{ height: `${Math.max((d.spend / maxSpend) * 100, d.spend > 0 ? 8 : 0)}%` }}
          title={`${d.day}: ${formatPrice(d.spend)}`}
        />
      ))}
    </div>
  )
}

// -------------------------------------------------------------------
// Main Component
// -------------------------------------------------------------------
export default function BillingPage() {
  const subscription = mockSubscription
  const usage = mockUsageStats
  const currentPlan = PLAN_CONFIG[subscription.planId]

  // State
  const [paymentMethodExpanded, setPaymentMethodExpanded] = React.useState(false)
  const [showCancelModal, setShowCancelModal] = React.useState(false)
  const [cancelStep, setCancelStep] = React.useState<'confirm' | 'reason'>('confirm')
  const [cancelReason, setCancelReason] = React.useState('')
  const [cancelFeedback, setCancelFeedback] = React.useState('')
  const [showUpgradeModal, setShowUpgradeModal] = React.useState(false)

  const handleCancelPlan = () => {
    // In production: API call to cancel
    console.log('[v0] Cancelling plan with reason:', cancelReason, cancelFeedback)
    setShowCancelModal(false)
    setCancelStep('confirm')
  }

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Billing & Plan</h1>
        <p className="text-muted-foreground mt-1">
          Manage your subscription, usage, and billing details
        </p>
      </div>

      {/* =============================================================== */}
      {/* Current Plan Card - Most important, give it visual weight */}
      {/* =============================================================== */}
      <Card className="border-accent/30 bg-accent/5">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg">
                Current plan: <span className="text-accent">{currentPlan.name}</span>
              </CardTitle>
              <CardDescription className="mt-1">
                {currentPlan.tagline}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Subscription details */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              {/* Billing cycle */}
              <div className="flex items-center gap-3">
                <Calendar className="size-4 text-muted-foreground" />
                <span className="text-sm">
                  {subscription.billingInterval === 'annual' ? 'Annual' : 'Monthly'}, renews{' '}
                  {new Date(subscription.currentPeriodEnd).toLocaleDateString('en-US', { 
                    month: 'long', 
                    day: 'numeric', 
                    year: 'numeric' 
                  })}
                </span>
              </div>
              
              {/* Amount */}
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-semibold tabular-nums">
                  {formatPrice(subscription.billingInterval === 'annual' 
                    ? currentPlan.pricing!.annual 
                    : currentPlan.pricing!.monthly
                  )}
                </span>
                <span className="text-muted-foreground">/month</span>
                {subscription.billingInterval === 'annual' && (
                  <span className="text-sm text-muted-foreground">
                    , billed annually at {formatPrice(currentPlan.pricing!.annual * 12)}
                  </span>
                )}
              </div>
            </div>

            {/* Usage summary bars */}
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Analyst seats</span>
                  <span className="font-medium tabular-nums">{subscription.analystSeatsUsed} of {subscription.analystSeatsLimit}</span>
                </div>
                <Progress value={(subscription.analystSeatsUsed / subscription.analystSeatsLimit) * 100} className="h-1.5" />
              </div>
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Competitors</span>
                  <span className="font-medium tabular-nums">{usage.competitorsTracked} of {usage.competitorsLimit}</span>
                </div>
                <Progress value={(usage.competitorsTracked / usage.competitorsLimit) * 100} className="h-1.5" />
              </div>
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Topics</span>
                  <span className="font-medium tabular-nums">{usage.topicsTracked} of {usage.topicsLimit}</span>
                </div>
                <Progress value={(usage.topicsTracked / usage.topicsLimit) * 100} className="h-1.5" />
              </div>
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground">AI cost MTD</span>
                  <span className="font-medium tabular-nums">{formatPrice(subscription.aiCostUsedCents)} of {formatPrice(subscription.aiCostCeilingCents)}</span>
                </div>
                <Progress 
                  value={subscription.aiCostPercentUsed} 
                  className={cn(
                    "h-1.5",
                    subscription.aiCostPercentUsed >= 80 && "bg-warning/20"
                  )} 
                />
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 pt-2">
            <Button onClick={() => setShowUpgradeModal(true)}>
              Change plan
            </Button>
            <Button variant="outline">
              {subscription.billingInterval === 'annual' ? 'Switch to monthly' : 'Switch to annual'}
            </Button>
            <button 
              onClick={() => setShowCancelModal(true)}
              className="text-sm text-muted-foreground hover:text-destructive transition-colors ml-auto"
            >
              Cancel plan
            </button>
          </div>
        </CardContent>
      </Card>

      {/* =============================================================== */}
      {/* Usage Detail Panels - 2 column grid */}
      {/* =============================================================== */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Left: This month's usage */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">This month&apos;s usage</CardTitle>
            <CardDescription>Rolling stats for the current billing period</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border p-3">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Radio className="size-4" />
                  <span className="text-xs">Sweeps run</span>
                </div>
                <p className="text-2xl font-semibold tabular-nums">{usage.sweepsRunThisMonth}</p>
                <p className="text-xs text-muted-foreground">unlimited on Team</p>
              </div>
              <div className="rounded-lg border p-3">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Eye className="size-4" />
                  <span className="text-xs">Items reviewed</span>
                </div>
                <p className="text-2xl font-semibold tabular-nums">{usage.itemsReviewed}</p>
                <p className="text-xs text-muted-foreground">no cap</p>
              </div>
              <div className="rounded-lg border p-3">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <FileText className="size-4" />
                  <span className="text-xs">Briefs authored</span>
                </div>
                <p className="text-2xl font-semibold tabular-nums">{usage.briefsAuthored}</p>
                <p className="text-xs text-muted-foreground">unlimited on Team</p>
              </div>
              <div className="rounded-lg border p-3">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Swords className="size-4" />
                  <span className="text-xs">Battle cards updated</span>
                </div>
                <p className="text-2xl font-semibold tabular-nums">{usage.battleCardsUpdated}</p>
              </div>
            </div>

            {/* AI spend chart */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">AI cost MTD</span>
                <span className="text-sm text-muted-foreground">
                  {formatPrice(subscription.aiCostUsedCents)} of {formatPrice(subscription.aiCostCeilingCents)}
                </span>
              </div>
              <AISpendMiniChart data={mockAISpendByDay} />
              <p className="text-xs text-muted-foreground mt-2">Daily AI spend over the past 30 days</p>
            </div>
          </CardContent>
        </Card>

        {/* Right: Plan limits */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Plan limits</CardTitle>
            <CardDescription>Current usage against your plan limits</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border">
              <UsageLimitItem 
                label="Analyst seats" 
                used={subscription.analystSeatsUsed} 
                limit={subscription.analystSeatsLimit} 
              />
              <UsageLimitItem 
                label="Viewer seats" 
                used={usage.viewerSeats} 
                limit={0} 
                unlimited 
              />
              <UsageLimitItem 
                label="Competitors" 
                used={usage.competitorsTracked} 
                limit={usage.competitorsLimit} 
              />
              <UsageLimitItem 
                label="Active topics" 
                used={usage.topicsTracked} 
                limit={usage.topicsLimit} 
              />
              <UsageLimitItem 
                label="Battle cards" 
                used={usage.battleCardsCount} 
                limit={usage.battleCardsLimit} 
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* =============================================================== */}
      {/* Billing History Table */}
      {/* =============================================================== */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Billing history</CardTitle>
            <Button variant="ghost" size="sm" className="h-8 text-xs">
              <Download className="size-3.5 mr-1.5" />
              Download all
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right w-[100px]">Amount</TableHead>
                <TableHead className="w-[80px]">Status</TableHead>
                <TableHead className="w-[80px] text-right">Receipt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockInvoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="text-muted-foreground">{invoice.date}</TableCell>
                  <TableCell>{invoice.description}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatPrice(invoice.amount)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs bg-positive/10 text-positive border-positive/20">
                      {invoice.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" asChild>
                      <a href={invoice.receiptUrl} target="_blank" rel="noopener noreferrer">
                        <Download className="size-3.5" />
                      </a>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* =============================================================== */}
      {/* Payment Method (Collapsible) */}
      {/* =============================================================== */}
      <Collapsible open={paymentMethodExpanded} onOpenChange={setPaymentMethodExpanded}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CreditCard className="size-5 text-muted-foreground" />
                  <div>
                    <CardTitle className="text-base">Payment method</CardTitle>
                    <CardDescription>Visa ending in 4242</CardDescription>
                  </div>
                </div>
                {paymentMethodExpanded ? (
                  <ChevronUp className="size-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="size-5 text-muted-foreground" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <Separator className="mb-4" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-muted">
                    <CreditCard className="size-6" />
                  </div>
                  <div>
                    <p className="font-medium">Visa ending in 4242</p>
                    <p className="text-sm text-muted-foreground">Expires 12/2028</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  Update card
                </Button>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* =============================================================== */}
      {/* Cancellation Modal */}
      {/* =============================================================== */}
      <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
        <DialogContent className="sm:max-w-md">
          {cancelStep === 'confirm' ? (
            <>
              <DialogHeader>
                <DialogTitle>Cancel your subscription?</DialogTitle>
                <DialogDescription className="pt-2 space-y-3">
                  <p>
                    Your subscription will end on{' '}
                    <span className="font-medium text-foreground">
                      {new Date(subscription.currentPeriodEnd).toLocaleDateString('en-US', { 
                        month: 'long', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })}
                    </span>
                    . Until then, your workspace stays on {currentPlan.name}.
                  </p>
                  <p>
                    After that date, your workspace transitions to read-only for 30 days, then your data is deleted unless you reactivate.
                  </p>
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex-col sm:flex-row gap-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setShowCancelModal(false)}
                  className="sm:order-1"
                >
                  Keep my plan
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setCancelStep('reason')}
                  className="text-destructive border-destructive/30 hover:bg-destructive/10 sm:order-2"
                >
                  Cancel anyway
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Help us improve</DialogTitle>
                <DialogDescription>
                  We&apos;d appreciate knowing why you&apos;re leaving. This helps us build a better product.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="cancel-reason">Reason for canceling</Label>
                  <Select value={cancelReason} onValueChange={setCancelReason}>
                    <SelectTrigger id="cancel-reason">
                      <SelectValue placeholder="Select a reason" />
                    </SelectTrigger>
                    <SelectContent>
                      {cancellationReasons.map((reason) => (
                        <SelectItem key={reason.value} value={reason.value}>
                          {reason.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cancel-feedback">Anything else you&apos;d like to share? (optional)</Label>
                  <Textarea
                    id="cancel-feedback"
                    value={cancelFeedback}
                    onChange={(e) => setCancelFeedback(e.target.value)}
                    placeholder="Your feedback helps us improve..."
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setCancelStep('confirm')
                    setCancelReason('')
                    setCancelFeedback('')
                  }}
                >
                  Back
                </Button>
                <Button 
                  variant="destructive"
                  onClick={handleCancelPlan}
                  disabled={!cancelReason}
                >
                  Confirm cancellation
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
