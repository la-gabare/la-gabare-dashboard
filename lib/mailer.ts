import 'server-only'
import nodemailer from 'nodemailer'
import { avecSignature } from '@/lib/signature-mail'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 465),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
})

export async function sendMail(to: string, subject: string, html: string, options: { fromName?: string; replyTo?: string; signature?: boolean } = {}) {
  const fromName = (options.fromName || 'La Gabare').replace(/["<>]/g, '')
  await transporter.sendMail({
    from: `"${fromName}" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html: avecSignature(html, to, options.fromName, options.signature),
    replyTo: options.replyTo,
  })
}

export { paymentLinkEmail } from '@/lib/mail-paiement'
