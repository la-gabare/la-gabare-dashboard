// Aperçu de TOUS les e-mails clients / prospects avec de fausses données, dans un seul fichier HTML. N'envoie rien.
// Usage : node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --import ./tests/charger.mjs scripts/apercu-mails.ts [sortie.html]
// (le chargeur des tests remplace Stripe, Supabase et le mailer par des doublures : aucun appel réel possible)
import { writeFileSync } from 'node:fs'
import { avecSignature } from '@/lib/signature-mail'
import { mails, CLIENT } from '@/lib/mails-exemples'

const sortie = process.argv[2] || 'apercu-mails-clients.html'
const blocs = mails.map(([sujet, html, de], i) => `<section><h2>${i + 1}. ${sujet.replace(/</g, '&lt;')}<small>${de || 'La Gabare'} → ${CLIENT}</small></h2>
<div class="mail">${avecSignature(html, CLIENT, de || 'La Gabare')}</div></section>`).join('\n')
writeFileSync(sortie, `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Aperçu des e-mails clients — La Gabare</title>
<style>body{margin:0;background:#cfc9bf;font-family:Arial,sans-serif}header{padding:20px 24px;font-size:15px;color:#1A1310}
main{display:grid;grid-template-columns:repeat(auto-fill,640px);gap:24px;padding:0 24px 24px;justify-content:center}
section{background:#fff;align-self:start}h2{margin:0;padding:10px 14px;font-size:13px;background:#1A1310;color:#F5F2EC;font-weight:600}
h2 small{display:block;font-weight:400;opacity:.6;margin-top:2px}.mail{width:640px}</style></head>
<body><header>Aperçu des ${mails.length} e-mails clients / prospects de l'admin La Gabare (fausses données, rien n'est envoyé) — généré le ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}</header>
<main>${blocs}</main></body></html>`)
console.log(`${mails.length} mails -> ${sortie}`)
