import { ThemeProvider } from '@/components/theme-provider'

export const metadata = {
  title: 'Setup | DOSI.AI',
  description: 'Set up your competitive intelligence workspace',
}

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      <div className="min-h-screen bg-background">
        {children}
      </div>
    </ThemeProvider>
  )
}
