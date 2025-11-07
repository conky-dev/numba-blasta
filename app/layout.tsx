import type { Metadata } from 'next'
import './globals.css'

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
      <body className="bg-gray-50">{children}</body>
    </html>
  )
}
