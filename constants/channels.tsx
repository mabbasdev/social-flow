import { InstagramIcon, NewTwitterIcon, FacebookIcon, TiktokIcon, ThreadsIcon, YoutubeIcon, LinkedinIcon, BlueskyIcon } from '@hugeicons/core-free-icons'

export enum ChannelTypeEnum {
    TWITTER = "twitter",
    INSTAGRAM = "instagram",
    THREADS = "threads",
    FACEBOOK = "facebook",
    LINKEDIN = "linkedin",
    BLUESKY = "bluesky",
    YOUTUBE = "youtube",
    TIKTOK = "tiktok"
}

export const CHANNEL_TYPE_ICONS: Record<string, any> = {
    twitter: NewTwitterIcon,
    TWITTER: NewTwitterIcon,
    linkedin: LinkedinIcon,
    LINKEDIN: LinkedinIcon,
    instagram: InstagramIcon,
    INSTAGRAM: InstagramIcon,
    threads: ThreadsIcon,
    THREADS: ThreadsIcon,
    facebook: FacebookIcon,
    FACEBOOK: FacebookIcon,
    bluesky: BlueskyIcon,
    BLUESKY: BlueskyIcon,
    youtube: YoutubeIcon,
    YOUTUBE: YoutubeIcon,
    tiktok: TiktokIcon,
    TIKTOK: TiktokIcon,
}

export const CHANNEL_TYPE_URLS: Record<string, string> = {
    twitter: "https://x.com",
    linkedin: "https://linkedin.com",
    instagram: "https://instagram.com",
    threads: "https://threads.com",
    facebook: "https://facebook.com",
    bluesky: "https://bluesky.com",
    youtube: "https://youtube.com",
    tiktok: "https://tiktok.com",
}

export function getChannelUrl(type: string | ChannelTypeEnum | undefined) {
    if (!type) return ""
    return CHANNEL_TYPE_URLS[type.toString().toLowerCase()] || ""
}

export function getChannelIcon(type: string | ChannelTypeEnum | undefined) {
    if (!type) return null
    return CHANNEL_TYPE_ICONS[type.toString().toLowerCase()] || null
}