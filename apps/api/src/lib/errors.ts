export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly meta?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const Errors = {
  badRequest: (code: string, message: string) => new AppError(400, code, message),
  unauthorized: (message = "Autenticação necessária") =>
    new AppError(401, "UNAUTHORIZED", message),
  notFound: (what = "Recurso") => new AppError(404, "NOT_FOUND", `${what} não encontrado`),
  forbidden: (message = "Sem permissão") => new AppError(403, "FORBIDDEN", message),
  conflict: (code: string, message: string) => new AppError(409, code, message),
  invalidTransition: (from: string, to: string) =>
    new AppError(409, "INVALID_TRANSITION", `Não é possível passar de ${from} para ${to}`),
  businessRule: (code: string, message: string) => new AppError(422, code, message),
  tooMany: (message = "Demasiados pedidos. Tenta novamente.") =>
    new AppError(429, "RATE_LIMITED", message),
};
