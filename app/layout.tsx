import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, DM_Mono } from 'next/font/google'
import './globals.css'

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-serif',
  weight: ['400', '500', '600', '700'],
})

const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
})

export const metadata: Metadata = {
  title: 'Idea Vault',
  description: 'Your AI-powered thought companion. Capture, connect, and grow your ideas.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${plusJakartaSans.variable} ${dmMono.variable}`}>
      <body>{children}</body>
    </html>
  )
}
