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

export async function sendMail(to: string, subject: string, html: string, options: { fromName?: string; replyTo?: string; signature?: boolean; attachments?: { filename: string; content: Buffer; contentType?: string; cid?: string }[] } = {}) {
  const fromName = (options.fromName || 'La Gabare').replace(/["<>]/g, '')
  const message = {
    from: `"${fromName}" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html: avecSignature(html, to, options.fromName, options.signature),
    replyTo: options.replyTo,
    attachments: options.attachments,
  }
  try {
    await transporter.sendMail(message)
  } catch (e) {
    // Le serveur SMTP coupe parfois la connexion (« Connection closed unexpectedly ») : un seul nouvel essai
    const code = (e as { code?: string }).code
    if (!['ECONNECTION', 'ETIMEDOUT', 'ESOCKET', 'ECONNRESET'].includes(code || '')) throw e
    await new Promise(r => setTimeout(r, 1500))
    await transporter.sendMail(message)
  }
}

export { paymentLinkEmail } from '@/lib/mail-paiement'
