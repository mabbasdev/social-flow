import { ChannelTypeEnum } from "@/constants/channels";
import { OAuthProvider, OAuthTokenResponse } from "./types";

function getEnv(key: string): string {
    const value = process.env[key];
    if (!value) {
        return "";
    }
    return value;
}

function getConfig(type: ChannelTypeEnum) {
    const upper = type.toUpperCase();

    const authUrl = getEnv(`${upper}_AUTH_URL`);
    const tokenUrl = getEnv(`${upper}_TOKEN_URL`);
    const clientId = getEnv(`${upper}_CLIENT_ID`);

    if (!authUrl || !tokenUrl || !clientId) {
        throw new Error(`Missing OAuth configuration for channel: ${type}. Please check your environment variables.`);
    }

    return {
        authUrl,
        tokenUrl,
        profileUrl: getEnv(`${upper}_PROFILE_URL`),
        clientId,
        clientSecret: process.env[`${upper}_CLIENT_SECRET`] || "",
        scope: getEnv(`${upper}_SCOPES`)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
    };
}

async function requestToken(type: ChannelTypeEnum, body: URLSearchParams) {
    const config = getConfig(type);
    const headers: Record<string, string> = {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
    };

    // Twitter/X requires Basic Auth header for confidential client token requests
    const isTwitter = type.toString().toLowerCase() === ChannelTypeEnum.TWITTER.toString().toLowerCase();

    if (isTwitter && config.clientSecret) {
        const authHeader = Buffer.from(
            `${config.clientId}:${config.clientSecret}`
        ).toString("base64");
        headers.Authorization = `Basic ${authHeader}`;
    }

    const response = await fetch(config.tokenUrl, {
        method: "POST",
        headers,
        body,
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data?.error_description ||
            data?.error ||
            `Token exchange failed with status ${response.status}: ${response.statusText}`
        );
    }

    return data;
}

function createProvider(
    type: ChannelTypeEnum,
    opts: { pkce?: boolean } = {}
): OAuthProvider {
    return {
        type,
        getAuthorizationUrl: ({
            state,
            redirectUri,
            codeChallenge,
            codeChallengeMethod,
        }) => {
            const config = getConfig(type);
            const params = new URLSearchParams({
                client_id: config.clientId,
                redirect_uri: redirectUri,
                response_type: "code",
                scope: config.scope.join(" "),
                state,
            });

            if (codeChallenge) {
                params.append("code_challenge", codeChallenge);
                params.append("code_challenge_method", (codeChallengeMethod || "s256").toLowerCase());
            }

            return `${config.authUrl}?${params.toString()}`;
        },

        exchangeCodeForToken: async ({
            code,
            redirectUri,
            codeVerifier,
        }): Promise<OAuthTokenResponse> => {
            const config = getConfig(type);
            const params = new URLSearchParams({
                grant_type: "authorization_code",
                code,
                redirect_uri: redirectUri,
                client_id: config.clientId,
            });

            // Pass client_secret if not using PKCE
            if (!opts.pkce && config.clientSecret) {
                params.append("client_secret", config.clientSecret);
            }

            if (codeVerifier) {
                params.append("code_verifier", codeVerifier);
            }

            const data = await requestToken(type, params);
            const seconds = Number(data.expires_in);
            const expiresAt =
                seconds > 0 ? new Date(Date.now() + seconds * 1000).toISOString() : null;

            return {
                accessToken: data.access_token,
                refreshToken: data.refresh_token ?? null,
                expiresAt,
            };
        },

        refreshToken: async ({ refreshToken, redirectUri }) => {
            const config = getConfig(type);
            const params = new URLSearchParams({
                grant_type: "refresh_token",
                refresh_token: refreshToken,
                client_id: config.clientId,
            });

            if (config.clientSecret) {
                params.append("client_secret", config.clientSecret);
            }
            if (redirectUri) {
                params.append("redirect_uri", redirectUri);
            }

            const data = await requestToken(type, params);
            const seconds = Number(data.expires_in);
            const expiresAt =
                seconds > 0 ? new Date(Date.now() + seconds * 1000).toISOString() : null;

            return {
                accessToken: data.access_token,
                refreshToken: data.refresh_token ?? refreshToken ?? null,
                expiresAt,
            };
        },

        getProfile: async ({ accessToken }) => {
            const config = getConfig(type);
            const isTwitter = type.toString().toLowerCase() === ChannelTypeEnum.TWITTER.toString().toLowerCase();

            // Append Twitter v2 user fields parameter if fetching Twitter profile
            let targetUrl = config.profileUrl;
            if (isTwitter && targetUrl) {
                const urlObj = new URL(targetUrl);
                urlObj.searchParams.set("user.fields", "profile_image_url,username,name");
                targetUrl = urlObj.toString();
            }

            const response = await fetch(targetUrl, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    Accept: "application/json",
                },
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to fetch profile for ${type}: ${response.status} - ${errorText}`);
            }

            const data = await response.json();

            const profileData = data?.data ?? data?.user ?? data?.items?.[0] ?? data;

            const providerAccountId =
                profileData?.id ?? profileData?.sub ?? profileData?.user_id ?? null;

            const handle =
                profileData?.username ??
                profileData?.screen_name ??
                profileData?.handle ??
                profileData?.name ??
                profileData?.snippet?.title ??
                null;

            const profileImage =
                profileData?.profile_image_url ??
                profileData?.thread_profile_picture ??
                profileData?.avatar_url ??
                profileData?.profile_image ??
                profileData?.picture?.data?.url ??
                profileData?.picture?.url ??
                profileData?.picture ??
                profileData?.snippet?.thumbnails?.default?.url ??
                null;

            const profileUrl =
                profileData?.profile_url ??
                (isTwitter && handle ? `https://x.com/${handle}` : null);

            return {
                providerAccountId,
                handle,
                profileImage,
                profileUrl
            };
        },
    };
}

// Lazy provider dictionary cache
const providerCache: Record<string, OAuthProvider> = {};

export function getOAuthProvider(type: ChannelTypeEnum): OAuthProvider {
    const key = type.toString().toLowerCase();
    if (!providerCache[key]) {
        const isPkce = key === ChannelTypeEnum.TWITTER.toString().toLowerCase();
        providerCache[key] = createProvider(type, { pkce: isPkce });
    }
    return providerCache[key]!;
}

export async function refreshOauthToken(
    type: ChannelTypeEnum,
    refreshToken: string,
    redirectUri: string
) {
    const provider = getOAuthProvider(type);
    if (!provider?.refreshToken) {
        throw new Error("Refresh token not supported for this provider");
    }
    return await provider.refreshToken({ refreshToken, redirectUri });
}