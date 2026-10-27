import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { notifierAgenceRdv } from '@/lib/leads/mails'

export const dynamic = 'force-dynamic'

// Webhook Cal.com (appel découverte) : rattache le RDV au lead et le passe en « RDV pris ».
// Le lead est retrouvé par metadata[lead_id] (lien du mail de prise de contact), sinon par e-mail ;
// sans lead existant, on en crée un (prospect arrivé directement sur Cal.com).
export async function POST(req: NextRequest) {
  const brut = await req.text()
  const secret = process.env.CALCOM_WEBHOOK_SECRET
  if (!secret) return NextResponse.json({ error: 'Webhook non configuré' }, { status: 503 })

  const signature = req.headers.get('x-cal-signature-256') || ''
  const attendue = crypto.createHmac('sha256', secret).update(brut).digest('hex')
  if (signature.length !== attendue.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(attendue))) {
    return NextResponse.json({ error: 'Signature invalide' }, { status: 401 })
  }

  let event: { triggerEvent?: string; payload?: Record<string, any> }
  try { event = JSON.parse(brut) } catch { return NextResponse.json({ error: 'JSON invalide' }, { status: 400 }) }
  const type = event.triggerEvent
  const p = event.payload || {}
  if (type === 'PING' || !p.uid) return NextResponse.json({ ok: true })

  const invite = (p.attendees || [])[0] || {}
  const email = String(invite.email || p.responses?.email?.value || '').toLowerCase().trim()
  const nom = String(invite.name || p.responses?.name?.value || '').trim()
  const leadId = Number(p.metadata?.lead_id) || null

  // Retrouver le lead : par uid de réservation (report/annulation), par lead_id, puis par e-mail
  let lead: Record<string, any> | null = null
  const chercher = async (col: string, val: unknown) => {
    if (!val) return null
    const q = supabaseAdmin.from('leads').select('*').order('id', { ascending: false }).limit(1)
    const { data } = await (col === 'email' ? q.ilike('email', String(val)) : q.eq(col, val))
    return data?.[0] || null
  }
  lead = (await chercher('rdv_uid', p.rescheduleUid || p.uid))
    || (await chercher('id', leadId))
    || (await chercher('email', email))

  if (type === 'BOOKING_CANCELLED') {
    if (lead) {
      // Le rendez-vous disparaît ; le statut ne recule que s'il était « rdv_pris » (jamais pour un client ou un lead archivé)
      await supabaseAdmin.from('leads').update({ rdv_at: null, rdv_uid: null }).eq('id', lead.id)
      if (lead.statut === 'rdv_pris') {
        const { count } = await supabaseAdmin.from('formulaire_complet').select('id', { count: 'exact', head: true }).eq('lead_id', lead.id)
        await supabaseAdmin.from('leads').update({ statut: count ? 'formulaire_complete' : 'mail_envoye' }).eq('id', lead.id)
      }
      try { await notifierAgenceRdv(lead, null, 'annule') } catch (e) { console.error('calcom notif', e) }
    }
    return NextResponse.json({ ok: true })
  }

  if (type !== 'BOOKING_CREATED' && type !== 'BOOKING_RESCHEDULED') return NextResponse.json({ ok: true })

  const rdv = { statut: 'rdv_pris', rdv_at: p.startTime || null, rdv_uid: p.uid }
  if (lead) {
    // Un lead déjà client garde son statut (on note seulement le rendez-vous)
    const maj = lead.statut === 'client' ? { rdv_at: rdv.rdv_at, rdv_uid: rdv.rdv_uid } : rdv
    await supabaseAdmin.from('leads').update(maj).eq('id', lead.id)
    lead = { ...lead, ...maj }
  } else {
    if (!email) return NextResponse.json({ ok: true })
    const { data, error } = await supabaseAdmin.from('leads').insert({
      nom: nom || email, email, tel: invite.phoneNumber || null,
      type_demande: 'rdv', message: p.description || p.responses?.notes?.value || null,
      consent: true, ...rdv,
    }).select().single()
    if (error) {
      console.error('calcom insert', error)
      return NextResponse.json({ error: 'Enregistrement impossible' }, { status: 500 })
    }
    lead = data
  }
  try {
    await notifierAgenceRdv(lead!, p.startTime || null, type === 'BOOKING_RESCHEDULED' ? 'reporte' : 'nouveau')
  } catch (e) {
    console.error('calcom notif', e)
  }
  return NextResponse.json({ ok: true })
}
