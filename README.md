# MR28 પંચાયત App / Mira Road Sthanik Panchayat-28

**મીરા રોડ સ્થાનિક પંચાયત-૨૮**  
શ્રી સંત શિરોમણિ રોહિદાસ વંશી વઢિયારા ચમાર સમાજ

Mobile-first membership & fee (ફાળો) management app for Unit 28 (Mira Road).

---

## કેવી રીતે ચલાવવું / How to run

```bash
cd /workspace/mr28-panchayat-app
npm install
npm run dev
```

Browserમાં ખોલો: **http://localhost:5173**

Production build:

```bash
npm run build
npm run preview
```

---

## મુખ્ય ફીચર્સ / Main features

1. **ડેશબોર્ડ / Dashboard** — કુલ સભ્યો, સક્રિય, બાકી ફાળો, આ મહિને વસૂલ
2. **સભ્યો / Members** — ઉમેરો/સંપાદિત, શોધ, auto સભ્ય નં. (`MR28-0001`…)
3. **ચુકવણી / Payments** — રોકડ / UPI / બેંક, auto રસીદ (`MR28-R-0001`…)
4. **રસીદ / Receipts** — જુઓ, પ્રિન્ટ, શેર / કૉપી
5. **રિમાઇન્ડર / Reminders** — મુદત વીતી / ૭ દિવસમાં; WhatsApp auto-open (ગુ+EN) + **Send all**
6. **સેટિંગ્સ / Settings** — દર ₹50/₹600, સંસ્થા નામ, કાઉન્ટર, ભાષા, WhatsApp ટૉગલ, બેકઅપ
7. **ડેટા** — IndexedDB (બ્રાઉઝરમાં); JSON / CSV એક્સપોર્ટ–ઇમ્પોર્ટ
8. **PWA-ready** — manifest + theme; મોબાઇલ બ્રાઉઝર માટે

ભાષા ટૉગલ: હેડરમાં **EN / ગુ**

---

## સભ્ય કેવી રીતે ઉમેરવો / How to add a member

1. **સભ્યો** ટૅબ → **સભ્ય ઉમેરો**  
   અથવા ડેશબોર્ડ → **નવો સભ્ય**
2. નામ (જરૂરી), ફોન, સરનામું ભરો
3. ફાળો યોજના: **માસિક ₹50** અથવા **વાર્ષિક ₹600**
4. આગામી ફાળો તારીખ સેટ કરો
5. **સાચવો** — સભ્ય નંબર આપમેળે મળશે (`MR28-0001`, `MR28-0002`, …)

---

## ફાળો કેવી રીતે કામ કરે છે / How fees work

| યોજના / Plan | રકમ / Amount |
|---|---|
| માસિક / Monthly | ₹50 |
| વાર્ષિક / Yearly | ₹600 |

- ચુકવણી નોંધતા રસીદ નંબર auto (`MR28-R-0001`…)
- ચુકવણી પછી સભ્યની **આગામી ફાળો તારીખ** આગળ વધે છે (મહિનો/વર્ષ)
- દર સેટિંગ્સમાં બદલી શકાય

---

## બેકઅપ / How to export backup

1. **સેટિંગ્સ** → **ડેટા / બેકઅપ**
2. **JSON એક્સપોર્ટ** — સંપૂર્ણ બેકઅપ (સભ્યો + ચુકવણી + સેટિંગ્સ)
3. **CSV એક્સપોર્ટ** — સભ્યો અને ચુકવણી અલગ ફાઇલો
4. નવા ફોન/બ્રાઉઝર પર: **JSON ઇમ્પોર્ટ** થી પાછું લાવો

> ડેટા ફક્ત આ બ્રાઉઝરમાં રહે છે. નિયમિત JSON બેકઅપ લો.  
> Data stays in this browser only. Export JSON regularly.

---

## WhatsApp ઓટોમેશન / WhatsApp automation

Phone-native (no Meta API keys required):

| Flow | Behaviour |
|---|---|
| **After payment** | If Settings → **Auto-open WhatsApp after payment** is ON (default), saving a payment opens `https://wa.me/<phone>?text=` with a Gujarati+English digital receipt (receipt no, amount, period, membership no). |
| **Reminders** | Primary button on each row opens WhatsApp with a prefilled due/overdue message. **Send all** opens chats one-by-one in sequence (return to the app → next auto-opens after the batch delay, or tap **Send next**). |
| **Phone numbers** | Uses each member’s phone; 10-digit Indian numbers get country code `91`. |

Settings:

- **Auto-open WhatsApp after payment** — default ON
- **Batch send delay (seconds)** — delay between sequential reminder opens (default 2s)

> **Note:** True unattended / silent sending needs the paid **WhatsApp Business Platform (Cloud API)** from Meta. This app uses the best phone-native approach (`wa.me`) so the treasurer taps Send in WhatsApp. A Business API integration can be added later when API credentials are available.

---

## ટેક સ્ટેક / Stack

Vite · React · TypeScript · Tailwind CSS v4 · IndexedDB (idb) · date-fns · lucide-react

---

## વિકાસકર્તા નોંધ / Note

Local app only — public deploy નહીં સુધી પૂછ્યું ન હોય.  
Vice Secretary: Aditya Solanki · Area code 28 (Mira Road)
