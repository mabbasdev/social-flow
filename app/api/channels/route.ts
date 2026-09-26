import { getInsforgeServerClient } from "@/lib/insforge-server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate the request and instantiate the server-side Insforge client
    const { insforge, userId } = await getInsforgeServerClient();

    // Block unauthenticated users immediately with a 401 Unauthorized status
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // 2. Extract query parameters (e.g., /api/channels?filter=connected)
    const filter = request.nextUrl.searchParams.get("filter");

    // 3. Concurrently fetch platform metadata and user account status using Promise.all
    const [typesRes, userChannelsRes] = await Promise.all([
      // Query A: Fetch all supported platform types (e.g., Twitter, LinkedIn)
      insforge.database
        .from("channel_types")
        .select("*")
        .order("created_at", { ascending: true }),

      // Query B: Fetch accounts linked specifically to the logged-in user
      insforge.database
        .from("user_channels")
        .select("*")
        .eq("user_id", userId),
    ]);

    // Check for database errors in either response
    if (typesRes.error || userChannelsRes.error) {
      return new NextResponse("Internal Server Error", { status: 500 });
    }

    // 4. Create an O(1) fast lookup Map: [channel_type_id -> userChannel Object]
    // This turns array searching into instant key-value dictionary lookups
    const userChannelMap = new Map(
      (userChannelsRes.data || []).map((channel) => [
        channel.channel_type_id,
        channel,
      ])
    );

    // 5. Merge system channel metadata with user connection data
    let channels = (typesRes.data || []).map((channel_type) => {
      // Find if the current user has connected this specific channel type
      const userChannel = userChannelMap.get(channel_type.id);

      return {
        // Global platform attributes
        id: channel_type.id,
        type: channel_type.type,
        name: channel_type.name,
        color: channel_type.color,
        character_limit: channel_type.character_limit,

        // User-specific connection fields (fall back to null/false if not connected)
        user_channel_id: userChannel?.id ?? null,
        handle: userChannel?.handle ?? null,
        profile_image: userChannel?.profile_image ?? null,
        profile_url: userChannel?.profile_url ?? null,
        connected: userChannel?.is_connected ?? false,
      };
    });

    // 6. Calculate channel metrics before applying client-side filters
    const totalChannels = typesRes.data?.length || 0;
    const connectedCount = channels.filter((channel) => channel.connected).length;

    // 7. Apply optional array filtering based on the 'filter' query parameter
    if (filter === "connected") {
      channels = channels.filter((channel) => channel.connected);
    } else if (filter === "unconnected") {
      channels = channels.filter((channel) => !channel.connected);
    }

    // 8. Return structured JSON payload with processed channel list and metadata
    return NextResponse.json({
      channels,
      totalChannels,
      connectedCount,
    });
  } catch (error) {
    // Gracefully catch and log unhandled server exceptions
    console.error("Error fetching channels:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}