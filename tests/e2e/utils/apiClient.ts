export type ApiResponse<T> = {
  status: number;
  body: T;
};

export async function apiPost<T>(
  baseUrl: string,
  path: string,
  data: unknown,
  options: { headers?: Record<string, string> } = {}
): Promise<ApiResponse<T>> {
  const response = await fetch(new URL(path, baseUrl), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    body: JSON.stringify(data),
  });

  let body: T;
  try {
    body = (await response.json()) as T;
  } catch (error) {
    throw new Error(`Failed to parse JSON response for ${path}: ${(error as Error).message}`);
  }

  return {
    status: response.status,
    body,
  };
}
