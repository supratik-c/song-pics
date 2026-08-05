# Business Admin

This is a working plan for the operator's own business identity, money
handling, and UK statutory position for Scribble Bops — as distinct from
[Commercialisation](commercial.md), which covers rights clearance, privacy,
and what must be resolved before accepting Ko-fi tips at all. Read that
document for the launch position and the Ko-fi checklist; this one covers the
setup work behind it: a business email separate from the operator's personal
account, a bank account for Ko-fi payouts, and when UK business registration
actually becomes necessary. It records research performed on 5 August 2026.

It is not legal, tax, or accounting advice. Laws, platform terms, and
thresholds can change. Recheck the cited primary sources before acting, and
take professional advice on anything that turns into a filing decision.

## 1. Business email

### Two tiers, deliberately

The instinct is one business address for everything. That creates a circular
lockout: if `contact@scribblebops.com` is the recovery address on the
Cloudflare account, and Cloudflare hosts the DNS that routes mail to that
address, then losing Cloudflare access means the recovery email needed to get
back in cannot be received. The domain registrar has the same trap.

Split the identity instead:

| Tier | Address | Purpose | Depends on the domain? |
| --- | --- | --- | --- |
| Root / recovery | a new free Gmail, e.g. `scribblebops.admin@gmail.com` | Login + recovery for Cloudflare, the domain registrar, and the mail provider itself. Never published. | No — that's the point |
| Public / business | `contact@scribblebops.com` | Privacy notice, Ko-fi, Stripe, GitHub, anything outward-facing | Yes |

The root tier is a throwaway free Gmail that exists only to be independent of
Scribble Bops's own infrastructure. It separates business from personal just
as well as a paid account does, and it survives a domain or Cloudflare
failure.

### Provider: Zoho Mail free plan

Zoho Mail's Forever Free plan — still open to new signups as of 2026 — gives a
real mailbox on one custom domain, up to 5 users, 5 GB each, at no cost
indefinitely. It sends properly authenticated mail (SPF/DKIM on the domain),
which matters: the alternative of Cloudflare Email Routing plus Gmail
"send mail as" cannot sign mail with the domain's own DKIM key, so replies get
a "via gmail.com" annotation or land in spam. For an address printed in the
privacy notice as the controller contact, that is a real problem, not a
cosmetic one.

Known limits: no IMAP/POP/ActiveSync on the free tier (web and mobile app
only); 25 MB attachments; one domain; availability varies by data centre
region. Mail Lite at roughly $1/user/month unlocks IMAP if ever needed.

Rejected alternatives:

- **Cloudflare Email Routing alone** — free and already in use for this
  domain, but it only forwards. Sending still needs a separate SMTP relay or
  the spam-prone Gmail send-as approach.
- **Google Workspace or Fastmail** — roughly £5–7/user/month. The right choice
  eventually, but unjustified before any revenue. The exit path below keeps
  this a later decision rather than a now decision.

### Exit path

This is what makes the free choice safe rather than a lock-in:

- The address itself never moves. Scribble Bops owns `scribblebops.com`, so
  switching provider is an MX and SPF/DKIM record change in Cloudflare DNS.
  No downstream account needs updating.
- **To Fastmail:** Fastmail natively imports MBOX/EML files. Zoho's built-in
  Settings → Import/Export → Export produces EML/ZIP. No IMAP required.
- **To Google Workspace:** Google's Data Migration Service needs IMAP or PST.
  One month of Zoho Mail Lite (~$1) enables IMAP for the migration, then can
  be cancelled. Thunderbird as an EML bridge is a fallback.
- A project contact address accumulates very little mail; either route is an
  afternoon of work.

### Setup steps

1. Create the root Gmail. Turn on 2FA and store recovery codes offline. Use it
   nowhere public.
2. Change the account email on the Cloudflare account and the domain
   registrar account to the root Gmail — both support this without creating a
   new account.
3. Sign up for Zoho Mail Forever Free using the root Gmail as the account
   contact, and add `scribblebops.com` as the domain.
4. Verify domain ownership via the TXT record Zoho provides, added in
   Cloudflare DNS.
5. Point MX records at Zoho, replacing any existing MX, and add Zoho's SPF and
   DKIM records. Set mail records to DNS-only (grey cloud) — proxying them
   through Cloudflare breaks mail delivery.
6. Create the `contact@scribblebops.com` mailbox. Add free aliases as wanted
   (`hello@`, `legal@`, `privacy@`) — all land in the same inbox.
7. Enable 2FA on Zoho and store recovery codes.
8. Send a test message to and from the address. In Gmail's "Show original",
   confirm `SPF: PASS` and `DKIM: PASS` on `scribblebops.com` with no "via"
   annotation on the sender.
9. Add `contact@scribblebops.com` to the existing GitHub account as an
   additional email rather than creating a second account — a second account
   would mean redoing SSH keys, Actions secrets, and Pages configuration for
   no benefit.

### GitHub organisation — deliberately deferred

The clean long-term separation is a free GitHub Organisation owning the repo,
with the personal account as a member. This is deferred because transferring
the repository to an org changes the GitHub Pages hostname from
`<personal-account>.github.io/song-pics/` to `<org>.github.io/song-pics/`.
Pages is currently the warm standby host (see
[Deployment](../CLAUDE.md#deployment)), and the `VITE_PUBLIC_SITE_URL` /
`VITE_BASE_PATH` handling in the deploy workflows would need rechecking. The
repository name stays the same, so `/song-pics/` as the Pages base path is
unaffected — but this is a deliberate, tested change, not something to make
incidentally while setting up email. Revisit if or when repository ownership
actually needs to change hands.

## 2. Ko-fi and the bank account

### A business bank account does not involve HMRC

Opening one is invisible to HMRC: no registration, no return, no
notification, no obligation. HMRC does not require sole traders to have a
separate account at all — a sole trader and the business are the same legal
person for tax purposes. The two things are fully decoupled:

- Tax obligations are triggered by income level (see [Business
  registration](#3-business-registration) below).
- A bank account is a bookkeeping convenience with zero tax consequence.

### Why open one anyway

1. Most personal current account terms prohibit business use. Regular inbound
   Stripe payouts can get an account flagged, frozen, or closed — the
   strongest practical reason to separate them.
2. The £1,000 trading-allowance test is on gross income, not profit. A
   dedicated account is the clean evidence of where actual income sits;
   reconstructing it later from a mixed personal account is painful.
3. [Commercialisation](commercial.md) already requires dated records of gross
   tips, fees, refunds, currencies, exchange rates, and payouts. A separate
   account makes that close to automatic.

### Recommended: Mettle or Starling

| Account | Cost | Notes |
| --- | --- | --- |
| Mettle (NatWest) | Free forever | Includes FreeAgent accounting (roughly £150/year value). Best if bundled bookkeeping is wanted. |
| Starling Business | Free, no transaction fees at any volume | FSCS-protected, strongest accounting integrations (Xero/QuickBooks/FreeAgent). |
| Tide Free | Free but 20p per outgoing transfer | Fine at low volume; the fee is avoidable here. |
| Monzo Business Lite | Free, unlimited UK transfers | Good app; thinner accounting tooling. |

Either Mettle or Starling is genuinely free at this scale.

### Ko-fi setup notes

- Ko-fi is a direct payment platform: money goes straight from supporter to
  the connected PayPal or Stripe account. Ko-fi holds nothing and pays out
  nothing itself.
- PayPal or Stripe is required. Stripe needs a full account (Stripe Express is
  not supported) linked to a bank account — route Stripe payouts to the
  business account.
- Ko-fi takes no fee on tips; the payment processor's fee (roughly 3% plus a
  fixed amount) still applies.
- Ko-fi does not withhold or remit tax, and does not collect VAT.
- Under UK digital platform reporting rules, platforms report qualifying
  seller data to HMRC. Treat Ko-fi income as visible to HMRC and keep records
  that match what would be declared. See [Ko-fi's DAC7/UK reporting
  guide](https://help.ko-fi.com/hc/en-us/articles/22796154202653-DAC7-and-UK-reporting-guide)
  when setting the account up.
- Create the Ko-fi account with `contact@scribblebops.com`, in the legal or
  trading name that will appear on tax records — [Commercialisation's Ko-fi
  checklist](commercial.md#ko-fi-checklist) already requires this, and it is
  far easier to get right on day one than to change later.

### Are tips actually taxable?

Treat them as taxable and it will not go wrong. HMRC's [content creator
guidance](https://taxhelpforhustles.campaign.gov.uk/tax-rules-content-creators/)
is explicit that income from creating online content counts, is assessed
against a single £1,000 allowance across all side hustles combined, and that
even the value of gifts received for promoting things counts as income.
There is a theoretical argument that a purely voluntary payment with no
service rendered is a non-taxable windfall rather than a trading receipt (the
[BIM41800 voluntary
receipts](https://www.gov.uk/hmrc-internal-manuals/business-income-manual/bim41800)
line of reasoning), but tips attached to published content sit on the wrong
side of that line for practical purposes — do not plan around the exception.

[Commercialisation's launch position](commercial.md#launch-position) already
helps here: tips are labelled as optional support with no reward, membership,
or gameplay advantage. Keep it that way. The moment support buys anything, it
adds consumer-contract, refund, and VAT questions on top of income tax.

## 3. Business registration

### Nothing to do now

No registration is needed yet. In the UK, trading as a sole trader begins the
moment trading starts — there is no form, no fee, no register. GOV.UK's
[set up as a sole trader](https://www.gov.uk/set-up-sole-trader) guidance
confirms trading can start immediately, with registration only required once
income crosses the threshold below.

A limited company is not warranted at this stage. It costs roughly £50 and
commits to annual accounts, a confirmation statement, and a corporation tax
return every year regardless of whether Scribble Bops earns anything.

### What to do now

- Keep records from the first payment: date, gross amount, currency, exchange
  rate, processor fee, net, payout date. Mettle's FreeAgent or Starling's
  accounting integrations can automate most of this.
- Keep expense records too — hosting, domain, any paid tooling. If income
  exceeds £1,000, actual expenses can be deducted instead of the flat
  allowance, whichever is lower.
- The UK tax year runs 6 April to 5 April; track against that, not the
  calendar year.

### The trigger: £1,000 gross in a tax year

The £1,000 trading allowance is the line:

- It is measured on gross income, before fees and expenses — Ko-fi/Stripe fees
  do not reduce it.
- It is a single allowance across all side hustles combined, not per project.
- Below it: no registration, no return, no tax, nothing to report to HMRC.

### If income exceeds £1,000

Suppose gross Ko-fi income passes £1,000 during the tax year ending
5 April 20XX:

1. Register for Self Assessment as a sole trader by **5 October 20XX** — the
   5 October following the end of that tax year, giving roughly six months.
   Missing this date can carry a penalty. Register at
   [gov.uk/register-for-self-assessment](https://www.gov.uk/register-for-self-assessment).
2. HMRC issues a Unique Taxpayer Reference by post; allow a couple of weeks
   and keep it with the other business credentials.
3. File the return by **31 January 20XX+1** (online), roughly ten months after
   the tax year ends. The paper deadline is earlier, 31 October.
4. Pay any tax due by the same 31 January.
5. Choose the deduction: either the flat £1,000 trading allowance, or actual
   expenses — whichever gives the lower taxable profit, not both. At low
   income with low costs the allowance usually wins.
6. What is actually owed: Income Tax on profit at the marginal rate, stacked
   on any employment income, plus Class 4 National Insurance above the
   relevant profit threshold. Check current-year rates and thresholds at the
   time — they typically move each year.
7. File every year while registered. If the side income stops, ask HMRC to
   deregister rather than simply stopping filing.

### Coming change worth knowing about

From the **2027/28 tax year**, the Self Assessment reporting threshold for
trading income rises from £1,000 to £3,000. The distinction matters:

- The £1,000 trading allowance is unchanged — that remains where tax starts.
- The £3,000 figure only governs whether a full Self Assessment return must be
  filed. Between £1,000 and £3,000, tax will still be owed, declared and paid
  through a new simplified HMRC online service instead.

Practically: modest Scribble Bops income means lighter admin from 2027/28
onward. It does not make anything tax-free.

### When a limited company starts to matter

Revisit only if one of these becomes true:

- Profits get large enough that the corporation-tax-plus-dividends route beats
  Income Tax — the crossover depends on other income and needs an
  accountant's input.
- A collaborator, investor, or co-owner joins.
- Liability separation is needed — for example the licensing or rights
  exposure flagged in [Commercialisation](commercial.md) becomes real.
- The "Scribble Bops" name needs locking at Companies House. This is weaker
  than a trade mark, which [Commercialisation's trade mark
  clearance](commercial.md#trade-mark-clearance) section already covers and is
  the better tool for name protection.

None of these apply today.

## Verification

**Email**

- Root Gmail created, 2FA on, recovery codes stored offline.
- Cloudflare account email and registrar account email changed to the root
  Gmail.
- `dig MX scribblebops.com` returns Zoho's servers.
- A test message to `contact@scribblebops.com` from an outside address
  arrives.
- A reply from it to a Gmail address shows `SPF: PASS` and `DKIM: PASS` on
  `scribblebops.com` in "Show original", with no "via" annotation.
- The deployed site still resolves — MX changes must not disturb the
  `scribblebops.com` A/AAAA/CNAME records the Worker route depends on (see
  [Cloudflare migration runbook](cloudflare-migration.md)).
- `dev.scribblebops.com` still loads behind Cloudflare Access, and the Access
  policy's allow-list contains a reachable address. This is the easiest thing
  to break: add the new address to the allow-list before removing the old
  one.

**Banking and Ko-fi**

- Business account open; a small test transfer in and out clears.
- Stripe or PayPal connected to Ko-fi, payouts pointed at the business
  account.
- A small test tip to the account owner lands and appears in the business
  account, with gross, fee, and net recorded — the first row of the ledger,
  confirming record-keeping works end to end.

**Registration**

- Nothing to verify yet. Set a reminder for early April each year to total
  gross income against the £1,000 line while the tax year is still fresh.

## Downstream

Unblocked by this setup but not part of it:

- `client/legal.html` contains `PLACEHOLDER@EMAIL.COM` in two places and needs
  the real contact address once verified.
- [Cloudflare migration runbook](cloudflare-migration.md) tracks the
  placeholder controller name/email/effective date as an open item.
- [Commercialisation's Ko-fi checklist](commercial.md#ko-fi-checklist) item 1
  (account in the legal/trading name) becomes actionable once the email and
  bank account exist.

Still gating monetisation per [Commercialisation](commercial.md) and untouched
by this document: the lyric audit and trade mark clearance.

## Sources

**Email**

- [Zoho Mail custom domain — free for 5 users](https://www.zoho.com/mail/custom-domain-email.html)
- [Zoho Mail pricing](https://www.zoho.com/mail/zohomail-pricing.html)
- [Zoho Mail free plan limitations (2026)](https://mail.mailbux.com/blog/email-comparisons/zoho-mail-free-plan-limitations-alternative)
- [Zoho Mail import/export](https://zoho.com/mail/help/import-export-emails.html)
- [Cloudflare Email Routing + Gmail send-as guide](https://sendmailas.com/blog/cloudflare-email-routing-gmail-send-as-guide)
- [Why Gmail SMTP breaks custom-domain DKIM](https://dmarcreport.com/blog/what-is-gappssmtp-and-how-to-set-up-a-custom-dkim-key-for-your-emails/)
- [Fastmail — import your mail](https://www.fastmail.help/hc/en-us/articles/360058753594-Import-your-mail)
- [Migrating Zoho Mail to Google Workspace](https://www.apps4rent.com/blog/zoho-mail-to-google-workspace-migration/)

**Banking**

- [Does a sole trader need a business bank account?](https://accountsandlegal.co.uk/accounting-advice/does-a-sole-trader-need-a-business-bank-account/)
- [Best free business bank accounts UK 2026](https://www.businessexpert.co.uk/business-banking/best-free-business-bank-accounts/)
- [Best sole trader bank accounts UK 2026](https://www.businessexpert.co.uk/business-banking/accounts-for-sole-traders/)

**Ko-fi**

- [Connect your Stripe account](https://help.ko-fi.com/hc/en-us/articles/360007522474-Connect-your-Stripe-account-and-start-earning)
- [How tax works on Ko-fi](https://help.ko-fi.com/hc/en-us/articles/10792069957661-How-tax-works-on-Ko-fi)
- [DAC7 and UK reporting guide](https://help.ko-fi.com/hc/en-us/articles/22796154202653-DAC7-and-UK-reporting-guide)
- [Ko-fi pricing](https://ko-fi.com/pricing)

**Tax and registration**

- [GOV.UK — Set up as a sole trader](https://www.gov.uk/set-up-sole-trader)
- [GOV.UK — Register for Self Assessment](https://www.gov.uk/register-for-self-assessment)
- [HMRC — Tax rules for content creators](https://taxhelpforhustles.campaign.gov.uk/tax-rules-content-creators/)
- [LITRG — Trading allowance](https://www.litrg.org.uk/working/self-employment/trading-allowance)
- [IPSE — HMRC's new £3,000 Self Assessment threshold](https://www.ipse.co.uk/articles/explained-hmrcs-new-3-000-self-assessment-threshold-for-side-hustles)
- [TaxAssist — The £3,000 threshold explained](https://www.taxassist.co.uk/resources/questions-and-answers/if-my-side-hustle-makes-less-than-3-000-is-it-true-that-i-don-t-need-to-pay-tax)
- [HMRC BIM41800 — voluntary receipts](https://www.gov.uk/hmrc-internal-manuals/business-income-manual/bim41800)
