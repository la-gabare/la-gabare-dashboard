// Bandeau haut et pied communs à tous les e-mails (charte e-mail La Gabare, novembre 2026).
// À insérer comme lignes (<tr>) dans la table de 600 px de chaque mail.
const serif = "font-family:'Cormorant Garamond',Georgia,'Times New Roman',serif"
const sans = "font-family:'Plus Jakarta Sans',Arial,Helvetica,sans-serif"

export const ENTETE_MAIL = `<tr><td style="background-color:#2A0810;padding:22px 40px;text-align:center;"><img src="https://admin.la-gabare.fr/mail/logo-clair.png" width="28" height="18" alt="" style="display:inline-block;vertical-align:middle;border:0;"><span style="${serif};font-size:24px;font-weight:500;letter-spacing:1px;color:#F5F2EC;vertical-align:middle;">&nbsp;&nbsp;La Gabare</span></td></tr>
<tr><td style="height:2px;background-color:#B08D57;background:linear-gradient(90deg,#B08D57,#C9A971,#B08D57);font-size:0;line-height:0;">&nbsp;</td></tr>`

export const PIED_MAIL = `<tr><td style="background-color:#2A0810;padding:24px 40px;text-align:center;"><p style="margin:0;${sans};font-size:11px;font-weight:500;letter-spacing:1.5px;color:#B08D57;">La Gabare — Agence web pour domaines viticoles</p><p style="margin:8px 0 0 0;${sans};font-size:11px;color:#9A8F8A;">la-gabare.fr · contact@la-gabare.fr</p></td></tr>`
