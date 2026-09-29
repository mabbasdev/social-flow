import { ChannelTypeEnum } from "@/constants/channels";
import { encrypt } from "@/lib/encryption";
import { getInsforgeServerClient } from "@/lib/insforge-server";
import { getOAuthProvider } from "@/lib/social-oauth";
import { getPkceCookieName } from "@/lib/social-oauth/pkce";
import { verifyOAuthState } from "@/lib/social-oauth/state";
import { OAuthProvider } from "@/lib/social-oauth/types";
import { NextRequest, NextResponse } from "next/server";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;

function buildRedirectUrl(
    appUrl: string,
    redirectTo: string,
    params: Record<string, string>
) {
    // Safely construct URL whether redirectTo is relative ("/settings") or absolute ("https://...")
    const url = redirectTo.startsWith("http")
        ? new URL(redirectTo)
        : new URL(redirectTo, appUrl);

    Object.entries(params).forEach(([key, value]) => {
        if (value) url.searchParams.set(key, value);
    });

    return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const stateParams = searchParams.get('state');
    const providerError = searchParams.get('error');

    let fallbackChannelType = "Twitter";

    if (!stateParams) {
        return buildRedirectUrl(APP_URL, '/settings', {
            connected: "false",
            error: "missing_state",
            channelType: fallbackChannelType,
            channel: fallbackChannelType,
        });
    }

    try {
        const state = verifyOAuthState(stateParams);
        const redirectTo = state?.redirectTo || `${APP_URL}/settings`;
        const pkceCookieName = getPkceCookieName(stateParams);
        
        // Extract channel type safely
        const channelTypeStr = (state?.channelType || "TWITTER").toString();
        fallbackChannelType = channelTypeStr;

        // Case-insensitive check for Twitter PKCE cookie
        const isTwitter = channelTypeStr.toLowerCase() === ChannelTypeEnum.TWITTER.toString().toLowerCase();
        const codeVerifier = isTwitter ? request.cookies.get(pkceCookieName)?.value : undefined;

        if (providerError) {
            console.error("OAuth provider returned error:", providerError);
            const response = buildRedirectUrl(APP_URL, redirectTo, {
                connected: "false",
                error: providerError,
                channelType: channelTypeStr,
                channel: channelTypeStr,
            });
            response.cookies.delete(pkceCookieName);
            return response;
        }

        if (!code) {
            const response = buildRedirectUrl(APP_URL, redirectTo, {
                connected: "false",
                error: "missing_code",
                channelType: channelTypeStr,
                channel: channelTypeStr,
            });
            response.cookies.delete(pkceCookieName);
            return response;
        }

        const { insforge, userId } = await getInsforgeServerClient();

        if (!userId || userId !== state.userId) {
            console.error("User ID mismatch in OAuth state:", { userId, stateUserId: state.userId });
            const response = buildRedirectUrl(APP_URL, redirectTo, {
                connected: "false",
                error: "missing_user",
                channelType: channelTypeStr,
                channel: channelTypeStr,
            });
            response.cookies.delete(pkceCookieName);
            return response;
        }

        const provider = getOAuthProvider(state.channelType) as OAuthProvider;
        const redirectUri = `${APP_URL}/api/channels/callback`;

        // 1. Exchange authorization code for token
        const token = await provider.exchangeCodeForToken({
            code,
            redirectUri,
            codeVerifier,
        });

        // 2. Fetch user profile
        const profile = await provider.getProfile({
            accessToken: token.accessToken,
        });

        console.log("OAuth Callback Success - Profile Data:", JSON.stringify(profile, null, 2));

        const payload = {
            user_id: state.userId,
            channel_type_id: state.channelTypeId,
            provider_account_id: profile.providerAccountId ?? null,
            handle: profile.handle ?? null,
            profile_image: profile.profileImage ?? null,
            access_token: encrypt(token.accessToken),
            refresh_token: encrypt(token.refreshToken ?? null),
            token_expires_at: token.expiresAt ?? null,
            is_connected: true,
            is_active: true,
        };

        const { error: dbError } = await insforge.database
            .from("user_channels")
            .upsert(payload, {
                onConflict: "user_id,channel_type_id",
            });

        if (dbError) {
            console.error("Database upsert error:", dbError);
            const response = buildRedirectUrl(APP_URL, redirectTo, {
                connected: "false",
                error: "failed_to_upsert_user_channel",
                channelType: channelTypeStr,
                channel: channelTypeStr,
            });
            response.cookies.delete(pkceCookieName);
            return response;
        }

        // Success redirect
        const response = buildRedirectUrl(APP_URL, redirectTo, {
            connected: "true",
            channelType: channelTypeStr,
            channel: channelTypeStr,
        });
        response.cookies.delete(pkceCookieName);
        return response;

    } catch (error: any) {
        console.error("❌ OAuth Callback Exception:", error?.message || error);

        const response = buildRedirectUrl(APP_URL, '/settings', {
            connected: "false",
            error: "oauth_callback_failed",
            channelType: fallbackChannelType,
            channel: fallbackChannelType,
        });

        if (stateParams) {
            try {
                const pkceCookieName = getPkceCookieName(stateParams);
                response.cookies.delete(pkceCookieName);
            } catch (e) {
                // Ignore cookie delete errors on failure
            }
        }
        return response;
    }
}