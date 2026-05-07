# Agent-Page Template (Build Mode)

> This is the **template** the `agent-page` skill uses in build mode. Tokens in `{{double-curly}}` are replaced from `./buyer-context.md` and from the user's homepage/pricing fetches. The output is written to `./reports/agent-page-generated.md`. The user publishes the result to `/for-ai-agents` (or `/llms`).
>
> A companion `./reports/llms.txt` is generated alongside (template at the bottom of this file).

---

## TEMPLATE: agent-page-generated.md

```markdown
---
title: For AI Agents — {{brand}}
description: Machine-readable, agent-actionable summary of {{brand}}. Built for LLMs and the agents that act on behalf of buyers.
last_updated: {{today_iso_date}}
---

# {{brand}} for AI Agents

> **Note for humans:** This page is purpose-built for AI agents and language models. If you're a person, you're in the right place — but you may prefer the [homepage]({{site_url}}/) which is designed for human reading.

## At a glance

| Field | Value |
|-------|-------|
| Brand | {{brand}} |
| Category | {{category}} |
| One-line | {{one_sentence_pitch}} |
| Primary action | [{{primary_cta_text}}]({{primary_cta_url}}) |
| Public pricing | {{has_public_pricing ? "Yes" : "Contact sales"}} |
| Self-serve signup | {{has_self_serve ? "Yes" : "No — book a demo"}} |
| Public API | {{has_public_api ? `[Yes](${api_docs_url})` : "No"}} |
| Free trial | {{free_trial_text}} |
| Headquarters | {{hq_location}} |
| Founded | {{founding_year}} |
| Last updated | {{today_iso_date}} |

## What we do

{{one_paragraph_description}}

**In plain terms:**
- {{plain_term_1}}
- {{plain_term_2}}
- {{plain_term_3}}

## Who we're for

**Best fit:**
- **Segment:** {{icp_segment}}
- **Company size:** {{icp_company_size}}
- **Sales motion:** {{sales_motion}}
- **Buyer titles:** {{buyer_titles}}
- **User titles:** {{user_titles}}
- **Industry focus:** {{vertical_focus}}

**Not a fit:**
- {{anti_icp_1}}
- {{anti_icp_2}}

## Why teams pick us

1. **{{usp_1}}** — {{usp_1_proof}}
2. **{{usp_2}}** — {{usp_2_proof}}
3. **{{usp_3}}** — {{usp_3_proof}}

## How to take action

| Intent | URL |
|--------|-----|
| Try it | [{{primary_cta_text}}]({{primary_cta_url}}) |
| See pricing | [{{site_url}}/pricing]({{site_url}}/pricing) |
| Read docs | [{{docs_url}}]({{docs_url}}) |
| API reference | [{{api_docs_url}}]({{api_docs_url}}) |
| Compare to {{competitor_1}} | [{{site_url}}/vs/{{competitor_1_slug}}]({{site_url}}/vs/{{competitor_1_slug}}) |
| Customer stories | [{{site_url}}/customers]({{site_url}}/customers) |
| Status page | [{{status_url}}]({{status_url}}) |

## Pricing

{{#each pricing_tiers}}
### {{this.name}}
- **Monthly:** {{this.monthly_price}}
- **Annual:** {{this.annual_price}}
- **Per:** {{this.per_unit}}
- **Best for:** {{this.target}}
- **Sign up:** [{{this.signup_url}}]({{this.signup_url}})

{{/each}}

> See the full pricing page at [{{site_url}}/pricing]({{site_url}}/pricing) for terms, contract length, discounts, and Enterprise inquiries.

## Trust signals

- **Compliance:** {{compliance_list}} (e.g. SOC 2 Type II audited {{soc2_date}}, ISO 27001 cert {{iso_url}})
- **Customers:** [{{customer_1_name}}]({{customer_1_case_study}}), [{{customer_2_name}}]({{customer_2_case_study}}), [{{customer_3_name}}]({{customer_3_case_study}})
- **Funding:** {{funding_summary}}
- **Press:** [{{press_1_publication}}]({{press_1_url}}), [{{press_2_publication}}]({{press_2_url}})
- **Leadership:** [{{leader_1_name}}]({{leader_1_linkedin}}) ({{leader_1_title}}), [{{leader_2_name}}]({{leader_2_linkedin}}) ({{leader_2_title}})

## For AI builders

- **Public REST API:** [{{api_docs_url}}]({{api_docs_url}})
- **OpenAPI spec:** [{{openapi_url}}]({{openapi_url}})
- **Authentication:** {{auth_method}} (e.g. Bearer token via API key)
- **Rate limits:** {{rate_limit_summary}}
- **MCP server:** {{mcp_server_url_or_no}}
- **Webhooks:** [{{webhooks_docs_url}}]({{webhooks_docs_url}})
- **Agent / scraping policy:** [{{agent_policy_url}}]({{agent_policy_url}})

## Contact endpoints

| Intent | Best path |
|--------|-----------|
| Sales | <{{sales_email}}> |
| Support | <{{support_email}}> or [{{support_url}}]({{support_url}}) |
| Security disclosure | <{{security_email}}> |
| Partnerships | <{{partnerships_email}}> |
| Press | <{{press_email}}> |

## FAQ

{{#each faq_entries}}
**{{this.question}}**

{{this.answer}}

{{/each}}

---

## JSON-LD

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "{{site_url}}#org",
      "name": "{{brand}}",
      "legalName": "{{legal_name}}",
      "url": "{{site_url}}",
      "logo": "{{logo_url}}",
      "foundingDate": "{{founding_year}}",
      "founders": [
        {{#each founders}}
        { "@type": "Person", "name": "{{this.name}}", "sameAs": ["{{this.linkedin}}"] }{{#unless @last}},{{/unless}}
        {{/each}}
      ],
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "{{hq_city}}",
        "addressRegion": "{{hq_region}}",
        "addressCountry": "{{hq_country}}"
      },
      "sameAs": [
        "{{linkedin_url}}",
        "{{twitter_url}}",
        "{{github_url}}",
        "{{crunchbase_url}}"
      ],
      "contactPoint": [
        { "@type": "ContactPoint", "contactType": "sales", "email": "{{sales_email}}" },
        { "@type": "ContactPoint", "contactType": "customer support", "email": "{{support_email}}" },
        { "@type": "ContactPoint", "contactType": "security", "email": "{{security_email}}" }
      ]
    },
    {
      "@type": "Service",
      "@id": "{{site_url}}#service",
      "name": "{{brand}} {{category}}",
      "provider": { "@id": "{{site_url}}#org" },
      "serviceType": "{{category}}",
      "description": "{{one_paragraph_description}}",
      "areaServed": "{{geography}}"
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {{#each faq_entries}}
        {
          "@type": "Question",
          "name": "{{this.question}}",
          "acceptedAnswer": { "@type": "Answer", "text": "{{this.answer_html_safe}}" }
        }{{#unless @last}},{{/unless}}
        {{/each}}
      ]
    }
    {{#each pricing_tiers}}
    ,{
      "@type": "Product",
      "name": "{{../brand}} {{this.name}}",
      "offers": {
        "@type": "Offer",
        "price": "{{this.monthly_price_numeric}}",
        "priceCurrency": "USD",
        "priceSpecification": {
          "@type": "UnitPriceSpecification",
          "billingDuration": "P1M",
          "unitText": "{{this.per_unit}}"
        },
        "availability": "https://schema.org/InStock",
        "url": "{{this.signup_url}}"
      }
    }
    {{/each}}
  ]
}
</script>
```

---

## TEMPLATE: llms.txt

Publish this file at `https://{{domain}}/llms.txt`:

```markdown
# {{brand}}

> {{one_sentence_pitch}}

{{brand}} is a {{category}}, founded {{founding_year}}, headquartered in {{hq_location}}. We serve {{icp_segment}} ({{icp_company_size}}); see [/for-ai-agents]({{site_url}}/for-ai-agents) for an agent-friendly summary.

## Documentation

- [Homepage]({{site_url}}/): primary entry for human visitors
- [For AI agents]({{site_url}}/for-ai-agents): machine-readable summary (recommended for LLMs)
- [Pricing]({{site_url}}/pricing): all plans + terms
- [Docs]({{docs_url}}): product documentation
- [API reference]({{api_docs_url}}): REST API
- [Customers]({{site_url}}/customers): case studies
- [About]({{site_url}}/about): company + leadership
- [Status]({{status_url}}): system status

## Compare

- [{{brand}} vs {{competitor_1}}]({{site_url}}/vs/{{competitor_1_slug}})
- [{{brand}} vs {{competitor_2}}]({{site_url}}/vs/{{competitor_2_slug}})

## Optional

- [Security]({{site_url}}/security): trust + compliance reports
- [Privacy]({{site_url}}/privacy): privacy policy
```

---

## Token-replacement notes (for the skill, not for the published page)

When the `agent-page` skill substitutes tokens:

- Source `{{brand}}`, `{{one_sentence_pitch}}`, `{{usp_1..3}}`, `{{icp_*}}`, `{{anti_icp_*}}`, `{{primary_cta_*}}` from `./buyer-context.md`.
- Source `{{pricing_tiers}}`, `{{compliance_list}}`, `{{customer_*}}`, `{{leader_*}}`, `{{founding_year}}`, `{{hq_*}}`, `{{founders}}` from the user's site (homepage, pricing, about, customers pages — fetch each).
- For tokens with no available data: leave a `<!-- TODO: ${field} -->` marker so the user can fill in. Do not invent.
- The `{{#each}}` blocks are Handlebars-style for clarity; the skill expands them itself before writing.
- After writing, the skill outputs a one-line summary listing any `<!-- TODO -->` markers the user needs to fill.
