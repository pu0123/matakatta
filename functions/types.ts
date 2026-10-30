export interface D1Result<T = unknown> {
  success: boolean
  results?: T[]
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement
  first<T = unknown>(): Promise<T | null>
  all<T = unknown>(): Promise<D1Result<T>>
  run<T = unknown>(): Promise<D1Result<T>>
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement
}

export interface PagesFunctionContext<
  Env,
  Params extends string = string,
> {
  request: Request
  env: Env
  params: Record<Params, string | string[]>
}

export type PagesFunction<Env, Params extends string = string> = (
  context: PagesFunctionContext<Env, Params>,
) => Response | Promise<Response>
