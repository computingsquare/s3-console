export function isPublicPolicy(policy: string | null): boolean {
  if (!policy) return false
  try {
    const parsed = JSON.parse(policy) as { Statement?: unknown }
    const statements = Array.isArray(parsed.Statement) ? parsed.Statement : [parsed.Statement]
    return statements.some((s: unknown) => {
      const stmt = s as { Effect?: string; Principal?: unknown }
      if (stmt?.Effect !== 'Allow') return false
      const principal = stmt.Principal
      if (principal === '*') return true
      if (typeof principal !== 'object' || principal === null) return false
      const aws = (principal as Record<string, unknown>).AWS
      return aws === '*' || (Array.isArray(aws) && aws.includes('*'))
    })
  } catch { return false }
}
