export type ActionResult = {
  error?: string
  issues?: unknown
  success?: boolean
  session?: { id: string } & Record<string, unknown>
  match?: { id: string } & Record<string, unknown>
  tournament?: { id: string } & Record<string, unknown>
  player?: { id: string } & Record<string, unknown>
  count?: number
  [key: string]: unknown
}
