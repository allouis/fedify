import { getLogger } from "@logtape/logtape";
import type { Context, RequestContext } from "../federation/context.ts";
import { RouterError } from "../federation/router.ts";
import { CryptographicKey } from "../vocab/vocab.ts";
import { mockDocumentLoader } from "./docloader.ts";

export function createContext<TContextData>(
  {
    url,
    data,
    documentLoader,
    contextLoader,
    getNodeInfoUri,
    getActorUri,
    getObjectUri,
    getOutboxUri,
    getInboxUri,
    getFollowingUri,
    getFollowersUri,
    getLikedUri,
    getFeaturedUri,
    getFeaturedTagsUri,
    parseUri,
    getActorKeyPairs,
    getActorKey,
    getDocumentLoader,
    sendActivity,
  }: Partial<Context<TContextData>> & { url?: URL; data: TContextData },
): Context<TContextData> {
  function throwRouteError(): URL {
    throw new RouterError("Not implemented");
  }
  url ??= new URL("http://example.com/");
  return {
    data,
    origin: url.origin,
    host: url.host,
    hostname: url.hostname,
    documentLoader: documentLoader ?? mockDocumentLoader,
    contextLoader: contextLoader ?? mockDocumentLoader,
    getNodeInfoUri: getNodeInfoUri ?? throwRouteError,
    getActorUri: getActorUri ?? throwRouteError,
    getObjectUri: getObjectUri ?? throwRouteError,
    getOutboxUri: getOutboxUri ?? throwRouteError,
    getInboxUri: getInboxUri ?? throwRouteError,
    getFollowingUri: getFollowingUri ?? throwRouteError,
    getFollowersUri: getFollowersUri ?? throwRouteError,
    getLikedUri: getLikedUri ?? throwRouteError,
    getFeaturedUri: getFeaturedUri ?? throwRouteError,
    getFeaturedTagsUri: getFeaturedTagsUri ?? throwRouteError,
    parseUri: parseUri ?? ((_uri) => {
      throw new Error("Not implemented");
    }),
    getDocumentLoader: getDocumentLoader ?? ((_params) => {
      throw new Error("Not implemented");
    }),
    getActorKeyPairs: getActorKeyPairs ?? ((_handle) => Promise.resolve([])),
    getActorKey: getActorKey ?? (async (handle) => {
      getLogger(["fedify", "federation"]).warn(
        "Context.getActorKeys() method is deprecated; " +
          "use Context.getActorKeyPairs() method instead.",
      );
      if (getActorKeyPairs == null) return null;
      for (const keyPair of await getActorKeyPairs(handle)) {
        const { privateKey } = keyPair;
        if (
          privateKey.algorithm.name !== "RSASSA-PKCS1-v1_5" ||
          (privateKey.algorithm as unknown as { hash: { name: string } }).hash
              .name !==
            "SHA-256"
        ) continue;
        return new CryptographicKey({
          id: keyPair.keyId,
          owner: getActorUri?.(handle) ?? throwRouteError(),
          publicKey: keyPair.publicKey,
        });
      }
      return null;
    }),
    sendActivity: sendActivity ?? ((_params) => {
      throw new Error("Not implemented");
    }),
  };
}

export function createRequestContext<TContextData>(
  args: Partial<RequestContext<TContextData>> & {
    url: URL;
    data: TContextData;
  },
): RequestContext<TContextData> {
  return {
    ...createContext(args),
    request: args.request ?? new Request(args.url),
    url: args.url,
    getActor: args.getActor ?? (() => Promise.resolve(null)),
    getObject: args.getObject ?? (() => Promise.resolve(null)),
    getSignedKey: args.getSignedKey ?? (() => Promise.resolve(null)),
    getSignedKeyOwner: args.getSignedKeyOwner ?? (() => Promise.resolve(null)),
    sendActivity: args.sendActivity ?? ((_params) => {
      throw new Error("Not implemented");
    }),
  };
}
