import { GoogleGenAI } from "@google/genai";
import { getInsforgeServerClient } from "@/lib/insforge-server";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const ACTIONS = ["generate", "rephrase", "shorten", "expand"] as const;
type ActionType = (typeof ACTIONS)[number];

export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const {
            action,
            content = "",
            prompt = "",
            channelId
        } = await request.json();

        if (!ACTIONS.includes(action as ActionType)) {
            return NextResponse.json({ error: "Invalid action" }, { status: 400 });
        }
        if (action === "generate" && !prompt.trim()) {
            return NextResponse.json({ error: "Prompt is required for generate action" }, { status: 400 });
        }

        let channelType: string | undefined;
        let characterLimit: number | undefined;

        if (channelId) {
            try {
                const { insforge } = await getInsforgeServerClient();
                const { data: channelData, error: channelError } = await insforge.database
                    .from("channel_types")
                    .select("type, character_limit")
                    .eq("id", channelId)
                    .single();

                if (!channelError && channelData) {
                    channelType = channelData.type;
                    characterLimit = channelData.character_limit;
                }
            } catch (err) {
                console.warn("Could not fetch channel_types:", err);
            }
        }

        // Generate content directly using Google Gemini SDK with active model endpoint
        const response = await ai.models.generateContent({
            model: "gemini-3.8-flash",
            contents: buildPrompt(action as ActionType, content, prompt),
            config: {
                systemInstruction: buildSystemPrompt(channelType, characterLimit),
            },
        });

        const text = response.text ?? "";
        return NextResponse.json({ content: text });
    } catch (error: any) {
        console.error("AI Generation Route Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to generate post" },
            { status: 500 }
        );
    }
}

function buildSystemPrompt(channelType?: string, characterLimit?: number) {
    const system_prompt = [
        "You are a social media writing assistant.",
        "Return only the final post text.",
        "Do not add quotes, labels, bullet points, or explanations.",
        "Do not use markdown formatting like **, *, #, or backticks.",
        "Return plain text only.",
    ];
    if (channelType) {
        system_prompt.push(`Write for ${channelType}. Match the platform's tone, style, and expected length and relevant hashtags.`);
    }
    if (characterLimit) {
        system_prompt.push(`Must be less than the maximum character limit: ${characterLimit}.`);
    }
    return system_prompt.join("\n");
}

function buildPrompt(action: ActionType, content: string, prompt: string) {
    if (action === "generate") {
        return `Write one clean social media post based on this request:\n${prompt}`;
    }
    if (!content.trim()) {
        throw new Error("Content is required for this action");
    }
    if (action === "rephrase") {
        return `Rephrase this social media post while keeping the meaning:\n${content}`;
    }
    if (action === "shorten") {
        return `Shorten this social media post while keeping the key message:\n${content}`;
    }
    return `Expand this social media post with more helpful detail while keeping the same tone:\n${content}`;
}