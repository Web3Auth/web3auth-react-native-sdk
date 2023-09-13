import { URL } from "react-native-url-polyfill";

export function constructURL(params: { baseURL: string; query?: Record<string, unknown>; hash?: Record<string, unknown> }): string {
  const { baseURL, query, hash } = params;

  const url = new URL(baseURL);
  if (query) {
    Object.keys(query).forEach((key) => {
      url.searchParams.append(key, query[key] as string);
    });
  }
  if (hash) {
    const h = new URL(constructURL({ baseURL, query: hash })).searchParams.toString();
    url.hash = h;
  }
  return url.toString();
}

export function extractHashValues(url: string): { sessionId: string | null; sessionNamespace: string | null; error: string | null } {
  // Split the URL at the '#' symbol to get the fragment
  const fragments = url.split("#");

  // Check if there is a fragment in the URL
  if (fragments.length === 2) {
    // Extract the fragment part
    const fragment = fragments[1];

    // Split the fragment at '&' to separate key-value pairs
    const keyValuePairs = fragment.split("&");

    // Create an object to store the key-value pairs
    const params: Record<string, string> = {};

    // Iterate through the key-value pairs and store them in the object
    keyValuePairs.forEach((pair) => {
      const [key, value] = pair.split("=");
      params[key] = value;
    });

    // Get the values of sessionId and sessionNamespace
    const sessionId = params.sessionId || null;
    const sessionNamespace = params.sessionNamespace || null;
    const error = params.error || null;

    return { sessionId, sessionNamespace, error };
  }

  // Return default values if there is no fragment in the URL
  return { sessionId: null, sessionNamespace: null, error: null };
}
