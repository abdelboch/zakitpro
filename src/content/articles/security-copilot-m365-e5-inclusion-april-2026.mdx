---
title: "Security Copilot Is Rolling Out to Every M365 E5 Tenant on April 20 — Here's What to Do Now"
slug: "security-copilot-m365-e5-inclusion-april-2026"
description: "Microsoft is auto-provisioning Security Copilot for all Microsoft 365 E5 tenants starting April 20, 2026. Here's what you get, how SCUs work, which agents are available, and the gotchas to know before your tenant activates."
publishedAt: "2026-04-09"
pillar: ai
difficulty: mid
type: deep-dive
tags: ["security-copilot", "microsoft-365", "e5", "scu", "licensing", "copilot", "enterprise-security", "intune", "entra-id", "defender"]
draft: false
---

If you run an M365 E5 environment, check your Message Center. MC1261596 has been sitting there for a few weeks telling you that Security Copilot is about to land in your tenant automatically. The rollout starts April 20, 2026, and runs through June 30. At some point in that window, Security Copilot will be provisioned for your organization whether you did anything or not.

That's the headline. The practical reality is more nuanced. You're not getting unlimited AI security tooling. You're getting a capped pool of Security Compute Units, a set of agents that vary in maturity, and a default configuration with data sharing turned on. None of that is bad, but each piece deserves a look before your users start clicking things.

Here's what you actually need to know.

## What You're Getting and What You're Not

The E5 inclusion covers Security Copilot's core surface area: the standalone portal, embedded chat inside Defender, Intune, Entra, and Purview, plus promptbooks and the agentic scenarios. Developer tooling including Agent Builder and the Graph APIs is also included.

What's excluded: Microsoft Sentinel data lake compute and storage. If your analysts hit Sentinel regularly, those charges still flow through Azure. Flag this for budget owners before activation.

The SCU allocation formula is 400 Security Compute Units per month for every 1,000 paid E5 user licenses, capped at 10,000 SCUs per month. A 3,000-user org gets 1,200 SCUs. A 15,000-user org hits the 10,000 ceiling. SCUs reset monthly without rollover, so unused capacity disappears at the end of each period.

Microsoft hasn't published a per-task consumption table, but the Security Copilot admin portal includes usage dashboards you can monitor after activation. A simple prompt costs a fraction of an SCU; a full phishing triage run across a batch of alerts will cost meaningfully more.

## How Auto-Provisioning Works

No action is required on your side. Microsoft creates a Default Security Copilot Capacity tied to a default workspace in your tenant. You'll see an in-product banner when it happens. The tenant notification arrives seven days before your activation date, then again on the day itself.

Two settings to check as soon as your workspace appears. First, the data storage location. This controls where Security Copilot logs and interaction data are stored. If your org has data residency requirements, verify the default location matches your policy and change it if needed. Second, data sharing. It's enabled by default, meaning Microsoft can use interaction data to improve the product. The setting is in the Security Copilot portal under workspace settings and requires a Capacity Contributor role to change. Check this on day one.

## RBAC: Who Controls What

Security Copilot uses its own role model layered on Entra ID.

**Security Copilot Owner** covers workspace management, settings configuration, and role assignment. Global Administrators and Security Administrators are automatically eligible to take this role.

**Security Copilot Contributor** is the analyst-level role. Contributors run prompts, interact with agents, and build promptbooks, but can't touch workspace settings or capacity configuration.

The recommended pattern is to create Entra ID security groups and assign those groups to the Copilot roles rather than assigning individuals directly. This stays consistent with your existing IAM model and makes access reviews straightforward.

One thing worth noting about permissions: Security Copilot respects the access controls already defined in each integrated product. If an analyst doesn't have access to a specific Defender workspace or Entra tenant, Security Copilot won't surface that data to them. The AI doesn't bypass your existing RBAC.

## The Agents Worth Knowing About

Maturity varies significantly across the Security Copilot agent catalog, so it's worth knowing which ones are production-ready versus still developing.

**Phishing Triage Agent (Defender):** The most mature agent in the bundle. It analyzes phishing alert queues, scores confidence, surfaces indicators, and produces a triage summary with recommended actions. For environments drowning in Defender phishing alerts, this is where you'll see the most immediate return.

**Security Alert Triage Agent (Defender):** Extends the triage concept into cloud and identity alerts beyond phishing. It hit preview in April. Useful for SOC teams, but expect rough edges as it encounters edge cases outside phishing alert categories.

**Conditional Access Optimization Agent (Entra):** Reviews your CA policy set, simulates potential changes, and flags access gaps. It's particularly useful if your CA configuration has grown organically and hasn't had a full audit recently. This agent surfaces recommendations. It does not make changes on its own.

**Data Security Triage Agent (Purview):** Handles DLP and insider risk alert triage with an advanced reasoning layer. It now includes improved interpretation of custom Sensitive Information Types. If your SIT library is well-defined, the outputs are reasonably accurate. If your SIT configuration is messy, sort that out first before relying on this agent.

**Data Security Posture Agent (Purview):** Maps your data landscape, identifies sensitive data at risk, and flags posture gaps. It delivers more value in mature Purview deployments where classification and labeling are already established.

For Intune, Security Copilot agents can handle policy compliance queries, device vulnerability mapping, and configuration gap reviews, building on the agent work that landed in the Intune admin center earlier this year.

## A Practical Pre-Activation Checklist

Most tenants won't need to do anything for provisioning itself. These five items are worth completing before your activation date arrives.

**1. Identify workspace owners.** Decide which Global or Security Admins will hold the Capacity Owner role and document it. You don't want to land on day one with nobody able to change settings.

**2. Create your access groups.** Build two Entra security groups, one for Owners and one for Contributors, and populate them before activation. Doing this retroactively is much messier.

**3. Review data storage and sharing settings.** Check the data storage location immediately after your workspace is provisioned. Turn off data sharing if your compliance posture requires it.

**4. Estimate your SCU budget.** Divide your E5 license count by 1,000 and multiply by 400. That number is your monthly ceiling. Prioritize which agents and scenarios are highest value so you direct SCUs toward high-signal use cases.

**5. Account for Sentinel costs separately.** If your security team uses Sentinel, Security Copilot interactions that pull Sentinel data still generate Azure costs. The increased accessibility of Security Copilot may drive higher usage than analysts were generating manually, so factor that in.

## What Happens When You Hit the SCU Limit

When your monthly pool runs out, Security Copilot returns throttling errors. Analysts see a message that Security Copilot can't respond due to high usage. There's no graceful degradation and no warning as you approach the ceiling. It's a hard stop.

Microsoft is planning a pay-as-you-go overage option at $6 per SCU, with 30 days of advance notice before that billing option becomes available. As of the April rollout, usage beyond the allocation is throttled rather than automatically charged. Watch the usage dashboard in the first month to calibrate actual consumption against your allocation.

If you're a large org and hit the ceiling consistently, additional SCU capacity is available as a paid add-on through the same mechanism that existed before E5 inclusion.

## Monitoring SCU Usage After Activation

Once your workspace is live, the Security Copilot portal shows a usage dashboard under Settings. It breaks down consumption by day, by user, and by scenario type. Check this at the end of week one.

The most common surprise for new tenants is that agent runs cost significantly more than manual chat prompts. A phishing triage agent processing 50 alerts will consume far more SCUs than 50 individual analyst prompts. This isn't a reason to avoid agents, but it does affect how you think about capacity planning. If you have a SOC running Phishing Triage against high-volume alert queues, model that expected consumption before enabling it broadly.

Usage visibility is per workspace by default. If your organization ends up creating multiple workspaces (for instance, a separate one for different business units), you'll need to track consumption per workspace. There's no consolidated cross-workspace view in the initial rollout.

Administrators with the Capacity Contributor role can see usage detail. Analysts without that role cannot. If you want team leads to monitor their own consumption, they'll need explicit role access to the capacity settings area, not just Contributor access to the workspace.

## Promptbooks: The Feature Most Admins Overlook

Promptbooks don't get much coverage compared to agents, but they're one of the more practical features in the bundle for teams that do repeated security workflows.

A promptbook is a saved sequence of prompts that Security Copilot runs in order. You can build one for a standard incident investigation workflow, a weekly compliance review, or a pre-change CA policy check. Once built, anyone with Contributor access can run it without needing to know the individual prompts.

For desktop engineering teams that are newer to Security Copilot, promptbooks lower the barrier significantly. Instead of training everyone on effective prompting, you build the prompts once in a way that reflects your org's context, and analysts execute the workflow. The output quality is more consistent than ad-hoc prompting, and you can iterate on the promptbook as you learn what works.

Microsoft ships a set of default promptbooks covering incident summarization, threat intelligence lookup, and vulnerability prioritization. Start with those to understand the format, then build your own that reference your specific policies, naming conventions, and triage criteria.

## The Bottom Line

This is a meaningful shift for E5 shops that had been sitting out Security Copilot because the standalone pricing didn't make sense at their scale. A 5,000-user org is now getting 2,000 SCUs per month at no incremental cost. That's enough to run real agent workflows without careful rationing.

Start with Phishing Triage in Defender, the Conditional Access Optimization agent in Entra, and the Intune-embedded experiences. Get a baseline on SCU consumption in the first month, then expand from there.

The pre-activation work is light: set up your access groups, confirm your data storage location, and switch off data sharing if your policy requires it. Thirty minutes of prep now avoids a scramble after your tenant goes live.
