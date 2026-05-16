/** PostgREST schema cache miss — table/view not exposed or does not exist. */
export function isPostgrestMissingTable(error: { code?: string } | null | undefined): boolean {
  return error?.code === 'PGRST205'
}
