import { getInsforgeServerClient } from "@/lib/insforge-server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
        const { insforge, userId } = await getInsforgeServerClient();
        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // 1. Try reading body payload safely
        let body: Record<string, any> = {};
        try {
            body = await request.json();
        } catch {
            // Body might be empty if query params were used instead
        }

        // 2. Read search params from URL as fallback
        const { searchParams } = new URL(request.url);

        // 3. Extract channelTypeId or channel ID from all possible keys
        const channelTypeId =
            body?.channelTypeId ||
            body?.channel_type_id ||
            body?.channelId ||
            body?.id ||
            searchParams.get("channelTypeId") ||
            searchParams.get("channel_type_id") ||
            searchParams.get("id");

        const userChannelId = body?.user_channel_id || body?.userChannelId;

        // Log incoming payload to ease frontend debugging
        console.log("Disconnect payload received:", { body, channelTypeId, userChannelId });

        if (!channelTypeId && !userChannelId) {
            return NextResponse.json(
                {
                    error: "Missing channelTypeId or userChannelId",
                    receivedBody: body,
                },
                { status: 400 }
            );
        }

        // 4. Update user_channels table
        let query = insforge.database
            .from("user_channels")
            .update({
                is_connected: false,
                is_active: false,
                access_token: null,
                refresh_token: null,
                token_expires_at: null,
                handle: null,
                profile_image: null,
                provider_account_id: null,
            })
            .eq("user_id", userId);

        if (channelTypeId) {
            query = query.eq("channel_type_id", channelTypeId);
        } else if (userChannelId) {
            query = query.eq("id", userChannelId);
        }

        const { error } = await query;

        if (error) {
            console.error("Database error during disconnect:", error);
            return NextResponse.json(
                { error: "Failed to update channel status in database" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: "Channel disconnected successfully",
        });

    } catch (error: any) {
        console.error("Error in disconnect route:", error?.message || error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}