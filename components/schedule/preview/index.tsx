import { ChannelType } from "@/types/channel.type"
import { TwitterPreview } from "@/components/schedule/preview/twitter-preview"
import { FacebookPreview } from "@/components/schedule/preview/facebook-preview"
import { InstagramPreview } from "@/components/schedule/preview/instagram-preview"
import { BlueSkyPreview } from "@/components/schedule/preview/bluesky-preview"
import { InfoIcon } from "lucide-react"
import { ThreadPreview } from "@/components/schedule/preview/thread-preview"
import { LinkedinPreview } from "@/components/schedule/preview/linkedin-preview"
import { YoutubePreview } from "@/components/schedule/preview/youtube-preview"
import { ImageObject } from "@/types/post.type"
import { ChannelTypeEnum } from "@/constants/channels"

type ChannelContent = {
  text: string
  images: ImageObject[]
}

const PreviewPanel = ({
  channel,
  content,
}: {
  channel: ChannelType | null
  content: ChannelContent
}) => {
  if (!channel) {
    return (
      <div className="flex flex-1 h-full items-center justify-center text-sm text-muted-foreground">
        Select a channel to preview
      </div>
    )
  }

  const label = `${channel?.name} Preview`
  const imageUrls = content?.images?.map(img => img.url)

  const renderPreview = () => {
    const type = channel.type?.toUpperCase(); // Normalize comparison

    switch (type) {
      case ChannelTypeEnum.TWITTER:
      case "TWITTER":
        return (
          <TwitterPreview
            text={content.text}
            images={imageUrls}
            profileImage={channel?.profile_image || ""}
            handle={channel?.handle || ""}
          />
        );

      case ChannelTypeEnum.LINKEDIN:
      case "LINKEDIN":
        return (
          <LinkedinPreview
            text={content.text}
            images={imageUrls}
            profileImage={channel?.profile_image || ""}
            handle={channel?.handle || ""}
          />
        );

      case ChannelTypeEnum.INSTAGRAM:
      case "INSTAGRAM":
        return (
          <InstagramPreview
            text={content.text}
            images={imageUrls}
          />
        );

      case ChannelTypeEnum.THREADS:
      case "THREADS":
        return (
          <ThreadPreview
            text={content.text}
            images={imageUrls}
          />
        );

      case ChannelTypeEnum.FACEBOOK:
      case "FACEBOOK":
        return (
          <FacebookPreview
            text={content.text}
            images={imageUrls}
          />
        );

      case ChannelTypeEnum.BLUESKY:
      case "BLUESKY":
        return (
          <BlueSkyPreview
            text={content.text}
            images={imageUrls}
          />
        );

      case ChannelTypeEnum.YOUTUBE:
      case "YOUTUBE":
        return (
          <YoutubePreview
            text={content.text}
            images={imageUrls}
          />
        );

      default:
        return (
          <div className="p-4 text-xs text-muted-foreground">
            No preview available for type: {channel.type}
          </div>
        );
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-4 h-full py-1">
      <div className="flex items-center gap-2 px-7">
        <h3 className="text-sm font-medium">{label}</h3>
        <InfoIcon className="size-4" />
      </div>
      <div className="w-full flex-1 px-7 py-1 overflow-y-auto">
        {renderPreview()}
      </div>
    </div>
  )
}

export default PreviewPanel