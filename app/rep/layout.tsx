import { ThemeProvider } from '@/components/theme-provider'

export const metadata = {
  title: 'Battle Card | DOSI.AI',
  description: 'Sales battle card for competitive situations',
}

export default function RepLayout({
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
      {children}
    </ThemeProvider>
  )
}
