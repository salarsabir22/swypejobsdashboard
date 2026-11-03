type SsoClaims = {
  email: string
  fullName: string
  subject: string
}

function firstMatch(xml: string, pattern: RegExp) {
  return xml.match(pattern)?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, "").trim() || ""
}

/** Pull email / name from a SAML Response without an IdP-specific schema. */
export function claimsFromSamlXml(xml: string): SsoClaims {
  const subject = firstMatch(xml, /<(?:[\w-]+:)?NameID\b[^>]*>([^<]+)/i)
  const emailAttr = firstMatch(
    xml,
    /<(?:[\w-]+:)?Attribute\b[^>]*(?:Name|FriendlyName)="[^"]*(?:mail|email)[^"]*"[^>]*>[\s\S]*?<(?:[\w-]+:)?AttributeValue\b[^>]*>([^<]+)/i
  )
  const displayName = firstMatch(
    xml,
    /<(?:[\w-]+:)?Attribute\b[^>]*(?:Name|FriendlyName)="[^"]*(?:displayName|cn|name)[^"]*"[^>]*>[\s\S]*?<(?:[\w-]+:)?AttributeValue\b[^>]*>([^<]+)/i
  )
  const given = firstMatch(
    xml,
    /<(?:[\w-]+:)?Attribute\b[^>]*(?:Name|FriendlyName)="[^"]*(?:givenName|firstName)[^"]*"[^>]*>[\s\S]*?<(?:[\w-]+:)?AttributeValue\b[^>]*>([^<]+)/i
  )
  const family = firstMatch(
    xml,
    /<(?:[\w-]+:)?Attribute\b[^>]*(?:Name|FriendlyName)="[^"]*(?:surname|sn|lastName)[^"]*"[^>]*>[\s\S]*?<(?:[\w-]+:)?AttributeValue\b[^>]*>([^<]+)/i
  )
  let email = (emailAttr || (subject.includes("@") ? subject : "")).toLowerCase()
  if (!email) {
    const found = xml.match(/[\w.+-]+@(?:[\w-]+\.)?iobm\.edu\.pk/i)
    if (found) email = found[0].toLowerCase()
  }
  if (!email) throw new Error("IoBM SAML did not include an email address.")
  const fullName = displayName || [given, family].filter(Boolean).join(" ")
  return { email, fullName, subject: subject || email }
}

export function claimsFromOidcProfile(profile: Record<string, unknown>): SsoClaims {
  const emailRaw = profile.email || profile.preferred_username || profile.upn
  const email = typeof emailRaw === "string" ? emailRaw.toLowerCase() : ""
  if (!email) throw new Error("IoBM sign-in did not include an email address.")
  const given = typeof profile.given_name === "string" ? profile.given_name : ""
  const family = typeof profile.family_name === "string" ? profile.family_name : ""
  const name = typeof profile.name === "string" ? profile.name : [given, family].filter(Boolean).join(" ")
  const subject = typeof profile.sub === "string" ? profile.sub : email
  return { email, fullName: name, subject }
}
