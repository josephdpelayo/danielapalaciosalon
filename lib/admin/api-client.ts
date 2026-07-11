export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function parseErrorMessage(res: Response): Promise<string> {
  try {
    const body = await res.json();
    return (body as { error?: string }).error ?? `Error ${res.status}`;
  } catch {
    return `Error ${res.status}`;
  }
}

export async function adminGet<T>(path: string, secret: string): Promise<T> {
  const res = await fetch(path, { headers: { 'x-admin-secret': secret } });
  if (!res.ok) throw new ApiError(await parseErrorMessage(res), res.status);
  return res.json() as Promise<T>;
}

export async function adminMutate<T>(
  path: string,
  method: 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  body: unknown,
  secret: string
): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json', 'x-admin-secret': secret },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new ApiError(await parseErrorMessage(res), res.status);
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

/** Fetcher genérico para SWR — la key es el path, el secret viaja aparte via closure en cada hook. */
export function makeSwrFetcher(secret: string) {
  return <T>(path: string) => adminGet<T>(path, secret);
}
