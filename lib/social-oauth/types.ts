import { ChannelTypeEnum } from "@/constants/channels";

export type OAuthConnectionProfile = {
    providerAccountId?: string | null
    handle?: string;
    profileImage?: string | null
}

export type OAtuhTokenResponse = {
    accessToken: string | null;
    refreshToken: string | null;
    expiresAt: string | null;
};

export type OAuthProvider = {
    type: ChannelTypeEnum;
    getAuthizationUrl: (params: {
        state: string;
        redirectUri: string
        codeChallenge?: string;
        codeChallengeMethod?: string;
    }) => string;
    exchangeCodeForToken: (params: {
        code: string;
        redirectUri: string;
        codeVerifier?: string;
    }) => Promise<OAtuhTokenResponse>;

    refreshToken: (params: {
        refreshToken: string;
        redirectUri?: string;
    }) => Promise<OAtuhTokenResponse>;
    getProfile: (params: {
        accessToken: string;
    }) => Promise<OAuthConnectionProfile>;
};
