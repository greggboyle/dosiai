import type { Channel, ChannelItem, ChannelType } from '@/lib/types'
import type { ListCardData } from '@/lib/types/dosi'
import { getMISBand } from '@/lib/types'

const typeLabels: Record<ChannelType, string> = {
  publication: 'Publication',
  conference: 'Conference',
  podcast: 'Podcast',
  webinar: 'Webinar',
  community: 'Community',
  'analyst-firm': 'Analyst Firm',
}

export function channelToListCardData(channel: Channel): ListCardData<Channel> {
  const appearancePreview =
    channel.appearances.length > 0
      ? channel.appearances
          .slice(0, 4)
          .map((a) => `${a.competitorName} (${a.count})`)
          .join(' · ')
      : undefined

  return {
    recordId: channel.id,
    recordType: 'channel',
    title: channel.name,
    preview: appearancePreview,
    primaryBadge: { label: typeLabels[channel.type], variant: 'channel' },
    scoreIndicator: {
      value: channel.authorityScore,
      label: 'Authority',
    },
    metadata: {
      sourceLabel: `${channel.itemCount} item${channel.itemCount === 1 ? '' : 's'}`,
    },
    scopeLabel: channel.url
      ? (() => {
          try {
            return new URL(channel.url).hostname
          } catch {
            return channel.url
          }
        })()
      : undefined,
    timestamp: channel.mostRecentDate,
    userState: 'read',
    raw: channel,
  }
}

export function channelItemToListCardData(item: ChannelItem): ListCardData<ChannelItem> {
  return {
    recordId: item.id,
    recordType: 'channel',
    title: item.title,
    preview: item.summary,
    primaryBadge: { label: item.competitorName, variant: 'neutral' },
    scoreIndicator: {
      value: item.mis.value,
      band: item.mis.band ?? getMISBand(item.mis.value),
    },
    metadata: {
      sourceLabel: item.channelName,
    },
    timestamp: item.timestamp,
    userState: 'read',
    raw: item,
  }
}
