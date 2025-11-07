import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Numba Blasta',
  description: 'White-labeled Twilio SMS Platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

