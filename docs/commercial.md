# Commercialisation Checklist

This is a working checklist for accepting optional tips for Scribble Bops while
serving a general audience aged 16 and over in the UK, EU, and US. It records
the repository audit performed on 29 July 2026 and the follow-up work that
should happen before commercial launch.

It is not legal, tax, or accounting advice. Laws, platform terms, ownership,
and search results can change. Recheck the cited primary sources and obtain
professional advice where this checklist identifies a clearance or filing
decision.

## Launch position

- Treat initial Ko-fi payments as optional **tips** or **support**, with no
  reward, membership, subscription, access, or other promised benefit.
- Do not describe tips as charitable donations or tax-deductible payments.
- Prefer an ordinary external Ko-fi link over an embedded widget or third-party
  script. This keeps payment entry and most payment processing away from the
  game origin.
- Do not launch monetisation until the lyric audit below has been resolved and
  a trade mark clearance search has found no blocking conflict.
- Publish a privacy notice before adding the support link, even though the
  application has no backend. Device storage, hosting, YouTube, and payment
  providers still need accurate explanation.
- Revisit consumer-law, VAT, refund, terms, and privacy obligations before
  adding paid perks, memberships, recurring support, or gated content.

## Current rights audit

### Fonts

Scribble Bops locally hosts Bangers and Kalam. Their source licence files state
that they use the SIL Open Font License 1.1 (OFL). The OFL permits commercial
use, embedding, bundling, and redistribution, but redistributed font software
must retain its copyright and licence notices. The deployed site therefore
links from “The Legal Stuff” page to each exact notice and emits each original
`OFL.txt` as a build asset. See the [SIL OFL
FAQ](https://openfontlicense.org/ofl-faq/) for the licence owner's guidance.

Do not sell either font by itself, imply that its authors endorse Scribble
Bops, or rename a modified version without first checking the OFL's Reserved
Font Name conditions. Repeat this check before replacing or modifying a font.

### Art and other assets

- The current clue drawings are recorded as original work by the creator using
  the handle “purblevibes”. Preserve the source files, dated exports, and Git
  history. Confirm the legal owner's full name before publishing a copyright
  notice or signing a licence.
- `client/content/misc/double-semiquaver-orange.svg` contains Openclipart
  public-domain metadata and a source reference. Preserve that metadata and
  provenance record.
- The package manifest declares TypeScript, Vite, and Vitest as development
  dependencies and no application runtime packages. The current lockfile uses
  open-source development/build packages. Re-run a package-licence inventory
  before each commercial release, preserve upstream notices and licence
  banners, and review every newly introduced package rather than assuming its
  commercial terms.
- Keep an asset register containing the filename, creator, source URL, date
  acquired, licence version, licence evidence, modifications, and where the
  asset is used.

### Songs, artists, and lyrics

Song titles and artist names can ordinarily identify the answer without
claiming ownership of the music, but they can also create trade mark, passing
off, or false-endorsement issues depending on presentation. Use a clear
statement such as:

> Scribble Bops is not affiliated with or endorsed by the featured artists,
> record labels, songwriters, or music publishers.

The most significant current rights risk is reproduced lyrics and artwork that
visually reproduces or closely adapts lyrics. The source data currently has
explicit `lyricLines` in puzzles `2026-07-03`, `2026-07-04`, `2026-07-05`, and
`2026-07-09`. Re-check this list against `client/content/puzzles/*/puzzle.json`
before each audit — it is not generated. All panels must also be reviewed
because removing a caption does not clear a drawing that reproduces protected
lyrical expression.

A YouTube embed does not grant a licence to reproduce lyrics elsewhere on the
page. Before monetisation, remove or replace each lyrical use with an original,
non-lyrical clue, or obtain written permission covering it.

## Ko-fi checklist

Before adding a support link:

1. Create the account in the same legal or trading name used in the privacy
   notice, tax records, and payment-provider records.
2. Label the link “Support Scribble Bops” or “Leave a tip”. Explain plainly
   that support is optional and provides no goods, services, tax deduction, or
   gameplay advantage.
3. Link to Ko-fi as an external destination. Do not install a Ko-fi widget,
   tracking script, or embedded payment form without a fresh privacy and
   storage-technology assessment.
4. Review [Ko-fi's terms](https://more.ko-fi.com/terms), its current [fee
   guidance](https://help.ko-fi.com/hc/en-us/articles/360002506494-Does-Ko-fi-take-a-fee),
   and [tax guidance](https://help.ko-fi.com/hc/en-us/articles/10792069957661-How-tax-works-on-Ko-fi).
   Ko-fi does not remove the creator's responsibility for the page, supporter
   information received through the service, taxes, or connected payment
   processors.
5. Keep dated records of gross tips, fees, refunds, currencies, exchange rates,
   and amounts paid out. Review the UK government's [tax guidance for content
   creators](https://taxhelpforhustles.campaign.gov.uk/tax-rules-content-creators/)
   and take advice for the creator's actual residence and business structure.
6. Document how supporter names, email addresses, messages, and transaction
   records exposed by Ko-fi or its processors will be used, secured, retained,
   and deleted.

If support later includes rewards, commissions, memberships, subscriptions, or
exclusive content, pause and review consumer contracts, cancellation and
refund rights, VAT/sales tax, platform terms, and the privacy notice before
offering them.

## Trade mark clearance

A database search is evidence-gathering, not a legal determination. Search both
registered rights and unregistered marketplace use, and obtain advice from a
qualified trade mark professional if any plausible conflict appears.

### Define the proposed mark and services

1. Confirm the legal owner/applicant and the territories in which the game will
   be promoted or monetised.
2. Search the word mark `SCRIBBLE BOPS` first. Treat a stylised logo as a
   separate later search and application.
3. Start classification research in Nice Class 41, including the accepted term
   “Provision of on-line computer games”. Search related entertainment and game
   services as well as the exact term. Add Class 9 only if a downloadable game
   is genuinely planned, and add merchandise classes only when those products
   are planned.
4. Search `Scribble Bops`, `Scribble Bop`, `ScribbleBops`, `Scribble-Bops`,
   misspellings, phonetic equivalents, plurals, and marks with a similar
   appearance, sound, meaning, or commercial impression.
5. Search domains, company names, app stores, game portals, social platforms,
   search engines, and relevant marketplaces. A dead registration can still
   point to continuing unregistered use.

### UKIPO

1. Use the official [UK trade mark
   search](https://www.gov.uk/search-for-trademark) for exact and similar words,
   owners, and images. Include live and pending UK applications and
   international registrations designating the UK.
2. Read the [pre-application and classification
   guidance](https://www.gov.uk/how-to-register-a-trade-mark/before-you-apply),
   search the selected terms and related services, and monitor the trade marks
   journal while clearance or an application is active.
3. Inspect each plausible record's full specification, status, owner,
   filing/priority dates, and opposition history rather than relying on a
   results-list summary.
4. Confirm the [UK address-for-service
   requirement](https://www.gov.uk/guidance/address-for-service-for-intellectual-property-rights)
   before filing. Consider professional clearance and filing advice, including
   UKIPO's application routes, if similar results exist.

### EUIPO

1. Use the official [EUIPO search tools](https://www.euipo.europa.eu/en/search):
   TMview for participating offices, eSearch plus for EUIPO records, and
   TMclass for accepted goods and services.
2. Search EU trade marks, relevant national-office marks, and international
   registrations designating the EU. An earlier right in one member state may
   affect an EU-wide application.
3. Follow EUIPO's [availability-search
   guidance](https://www.euipo.europa.eu/the-office/help-centre/tm/faq-search-availability),
   but do not treat an automated similarity report as exhaustive.
4. Check current representation requirements for an applicant established
   outside the European Economic Area before filing or entering proceedings.

### USPTO

1. Use the current [USPTO Trademark Search
   system](https://www.uspto.gov/trademarks/search), not retired TESS guidance.
   Begin with exact wording, then broaden the search across spelling, sound,
   appearance, meaning, and related goods or services.
2. Open plausible records in TSDR and inspect live status, owner, filing basis,
   dates, specimens, and the complete identification of goods and services.
3. Follow the USPTO's [comprehensive clearance
   checklist](https://www.uspto.gov/trademarks/search/comprehensive-clearance-search-similar-trademarks):
   federal searching alone does not find every party with enforceable rights.
   Check state registers, the Trademark Official Gazette, WIPO records,
   domains, social platforms, app stores, and ordinary internet use.
4. A foreign-domiciled applicant must appoint a US-licensed attorney to
   represent it before the USPTO. Confirm the current [attorney
   requirement](https://www.uspto.gov/trademarks/basics/do-i-need-attorney)
   before filing.

### Search log

Keep one row per search or result:

| Search date | Database/marketplace | Query | Territory | Owner | Status | Classes and exact goods/services | Application/registration number | URL or saved evidence | Similarity and follow-up |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| YYYY-MM-DD | UKIPO, TMview, USPTO, web, app store, etc. | Exact query used | UK, EU, US, etc. | Named owner | Live, pending, dead, or unregistered | Full relevant wording | Identifier or “none” | Stable link and dated screenshot/PDF | Appearance, sound, meaning, market overlap, advice required |

Record negative searches too. Repeat clearance immediately before filing and
before a major territorial or product expansion.

## Copyright ownership and evidence

Qualifying original code, copy, and artwork normally receive copyright
automatically when they are created and fixed. Registration does not make a
brand name or title copyrightable and cannot give Scribble Bops rights in
third-party songs, recordings, or lyrics.

The UK has no government copyright registration system; see the official [UK
copyright guidance](https://www.gov.uk/copyright). The EU likewise has no
single EU copyright registration procedure; the [European IP Helpdesk
FAQ](https://intellectual-property-helpdesk.ec.europa.eu/regional-helpdesks/european-ip-helpdesk/europe-frequently-asked-questions_en)
explains automatic protection and evidence options. Voluntary or private
evidence services do not replace proof of authorship and ownership.

For every release:

- retain original layered artwork, drafts, dated exports, source code history,
  release archives, and independently backed-up copies;
- keep an authorship register listing each work, author, creation date,
  publication date, ownership basis, and any third-party material;
- obtain a written, signed copyright assignment or sufficiently broad licence
  from every contributor before publishing their work;
- keep contractor, employment, commission, licence, and payment records
  together with the relevant work; and
- once the legal owner is confirmed, use a notice such as `© 2026 [legal
  owner]. Scribble Bops. All rights reserved.` The notice is useful ownership
  information, not the source of copyright.

Optional US registration is available through the [US Copyright Office
registration portal](https://www.copyright.gov/registration/index.html):

1. Inventory the code, website text, and illustrations and decide which works
   and authors are being claimed.
2. Determine accurately whether each work is published or unpublished and its
   first-publication date and country.
3. Select the appropriate application category and check whether a group option
   actually applies; website code, text, and visual art may need different
   treatment.
4. File the application, fee, and required deposit. Identify and exclude or
   limit the claim for lyrics, fonts, public-domain art, and all other
   third-party material.
5. Keep the case number, correspondence, deposit copy, and certificate with the
   ownership register. Consider US copyright advice where work categories,
   publication status, authorship, or exclusions are unclear.

If a work lacks sufficient originality, registration cannot manufacture
copyright. Consider trade mark, registered-design, passing-off, or contractual
protection with professional advice instead.

## Lyric clearance

Create an inventory covering every caption, answer screen, panel, filename,
alt text, promotional image, social post, and archived version that reproduces
or closely adapts lyrics. For each item:

1. Prefer replacing it with an original visual clue that relies on the song's
   theme, title, cultural context, or an independent joke rather than protected
   lyrical wording.
2. If it must remain, identify the relevant music publisher or administrator.
   Start with PRS/MCPS repertoire information for the UK and ASCAP, BMI, and
   SESAC repertoire information for the US; verify the result with the
   publisher rather than assuming a performing-rights listing grants the
   required permission.
3. Request a written licence that expressly covers reproduction, display,
   visual adaptation, online use, monetised use, territories, duration, and any
   promotional or social-media uses. Confirm whether fees and reporting apply.
4. Record writers, publishers, work identifiers, contacts, correspondence,
   permission wording, dates, territories, fees, expiry/renewal, and the exact
   approved use with the puzzle's provenance record.
5. Do not publish or monetise the item until permission is signed, or the
   lyrical use has been removed and the replacement has been reviewed.

## Privacy policy outline

“Frontend-only” does not mean that no personal data is processed. It means the
Scribble Bops application currently has no operator-controlled backend and does
not transmit guesses to the operator. A future privacy notice should use the
following repository-specific facts and the disclosure categories in the
[European Commission's privacy-notice
guidance](https://commission.europa.eu/law/law-topic/data-protection/rules-business-and-organisations/principles-gdpr/what-information-must-be-given-individuals-whose-data-collected_en):

- **Who and when:** legal controller identity, contact details, effective date,
  territories served, and the site's general 16+ positioning. Do not claim
  child-directed processing unless the product and controls are redesigned for
  it.
- **No application collection:** no Scribble Bops account, backend database,
  advertising tracker, newsletter, or contact form. The operator does not
  receive the player's guesses from the game. Cloudflare Web Analytics is the
  one exception to "no operator analytics" — see the Hosting and analytics
  bullet below.
- **Saved progress:** production uses browser `localStorage` keyed by puzzle ID
  for normalized guesses and completion status. It remains on that device
  until site/browser data is cleared. Development starts clean and does not
  persist progress. Explain browser clearing steps and that the operator cannot
  remotely access, correct, export, or erase local-only values.
- **YouTube session choice:** activating `Watch YouTube Video` stores a
  versioned consent value in `sessionStorage`. It enables automatic YouTube
  loading for later solved or revealed results in the same tab session and
  normally ends when that tab session closes. If session storage is unavailable,
  the choice lasts only in page memory.
- **Hosting and analytics:** Cloudflare receives ordinary web requests and may
  process IP addresses, request times, paths, user-agent information, and
  security/logging data under its own role and terms. Cloudflare Web Analytics
  is enabled (cookieless, no personal-data collection, edge-injected beacon) —
  see the published privacy policy in `client/legal.html` for the
  player-facing explanation. GitHub Pages remains a warm standby host under the
  same disclosure. Perform a new review before adding any analytics tool that
  behaves differently (uses cookies, cross-site tracking, or building
  individual profiles).
- **YouTube:** without session consent, YouTube is contacted only after the
  player activates `Watch YouTube Video`. Later eligible results in the same
  tab session contact YouTube automatically. The unloaded control includes a
  linked `Subject to Google's Privacy Policy` notice. Explain likely IP/device,
  cookie, storage, and viewing-data processing in the published privacy notice.
- **Ko-fi and payments:** following an external support link lets Ko-fi and its
  connected payment processors process payment details and may make supporter
  names, email addresses, messages, and transaction information available to
  the creator. Describe the parties' actual roles rather than calling every
  recipient a processor.
- **Share and clipboard:** Web Share hands the prepared invitation and URL to
  the operating system or chosen application; clipboard fallback writes it to
  the local clipboard. Scribble Bops does not receive later activity from the
  destination.
- **Purposes and lawful bases:** map each real processing activity to its
  purpose and lawful basis. Avoid generic lists that imply collection the site
  does not perform.
- **Storage access:** assess and document whether saved-progress
  `localStorage` is strictly necessary to provide the user-requested persistence
  feature under PECR/ePrivacy, and assess the non-essential YouTube
  `sessionStorage` preference as part of the consent flow. Even storage that
  qualifies for an exception must be explained. Use the ICO's current [storage
  and access technology guidance](https://cy.ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guidance-on-the-use-of-storage-and-access-technologies).
- **Recipients and transfers:** identify hosts, media/payment providers, their
  locations or transfer mechanisms, and links to their policies. Do not promise
  UK/EU-only processing unless contracts and infrastructure establish it.
- **Retention and security:** state device-storage duration, actual hosting-log
  information available to the operator, supporter-record retention, access
  controls, deletion practices, and the reasons for each period.
- **Rights:** explain applicable access, rectification, erasure, restriction,
  portability, objection, and consent-withdrawal rights; provide a contact and
  complaint route to the ICO or relevant EU supervisory authority. Explain the
  practical limit for information that exists only in the user's browser.
- **No profiling:** state accurately that the current application performs no
  profiling, automated decision-making with legal/similar effects, or sale of
  personal data.
- **Changes:** describe how material policy changes will be communicated and
  keep dated versions.

Perform a new privacy, consent, and data-flow review before adding analytics,
accounts, a backend, newsletters, advertisements, embedded payment widgets,
personalised content, or any new third-party script.

## YouTube privacy flow

Without consent in the current tab session, solved and manually revealed
results render a local 16:9 play area with a `Watch YouTube Video` control and a
short `Subject to Google's Privacy Policy` notice whose policy name links to
Google's policy in a new tab. It contains no iframe, remote image, or
third-party script. Activating the control stores session consent and creates
an iframe using
`https://www.youtube-nocookie.com/embed/{videoId}`.

Later solved or revealed results in that tab session create the iframe
automatically without moving focus. The iframe uses a descriptive title,
minimal permissions, visible focus, responsive sizing, no autoplay, and the
referrer policy YouTube recommends for player identification. At the same time,
the result reveals a separate red `Watch on YouTube` external link with a white
play icon, which remains usable if embedding fails. Invalid URLs receive a
local unavailable message, and failed games show no video. Closing the tab ends
the saved preference; there is no separate in-session withdrawal control.

Follow YouTube's [privacy-enhanced embedding
guidance](https://support.google.com/youtube/answer/171780?hl=en) and test:

- no iframe or YouTube-hosted image exists before first-session activation;
- the initial privacy link targets Google's policy without preloading it;
- activation records session consent and creates only the privacy-enhanced
  embed URL;
- later eligible results in the same session auto-load without moving focus;
- a new tab session returns to the unloaded control and notice;
- the external watch link remains usable if embedding fails;
- solved, manually revealed, restored, failed, and invalid-URL states;
- keyboard use, focus indication, screen-reader names, 320 px layout, and wide
  desktop layout; and
- the published privacy notice and consent/storage assessment match the final
  behavior.

## Recheck triggers

Repeat the relevant parts of this checklist whenever Scribble Bops adds an
asset or dependency, changes ownership, enters a new country, introduces paid
benefits, enables analytics or advertising, adds a backend or account, changes
host, embeds a new third party, or substantially changes its name or logo.
