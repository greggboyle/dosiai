export class SweepRejectedError extends Error {
  readonly code: string
  constructor(code: string, message?: string) {
    super(message ?? code)
    this.name = 'SweepRejectedError'
    this.code = code
  }
}
