import { PB_SERVER_ADDR } from '@tinycld/core/lib/pocketbase'
import { useThemeColor } from '@tinycld/core/lib/use-app-theme'
import * as Clipboard from 'expo-clipboard'
import { Copy } from 'lucide-react-native'
import { useState } from 'react'
import { Pressable, Text } from 'react-native'

export function BookingUrlRow({ orgSlug, slug }: { orgSlug: string; slug: string }) {
    const fg = useThemeColor('foreground')
    const muted = useThemeColor('muted-foreground')
    const [copied, setCopied] = useState(false)
    const [hovered, setHovered] = useState(false)

    const fullUrl = `${PB_SERVER_ADDR}/p/calendar-slots/${orgSlug}/${slug || '...'}`

    const handleCopy = async () => {
        if (!slug) return
        await Clipboard.setStringAsync(fullUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 3000)
    }

    const color = hovered ? fg : muted

    return (
        <Pressable
            onPress={handleCopy}
            onHoverIn={() => setHovered(true)}
            onHoverOut={() => setHovered(false)}
            className="flex-row items-center gap-1.5 flex-1"
        >
            <Text numberOfLines={1} style={{ color, fontSize: 13, flexShrink: 1 }}>
                {fullUrl}
            </Text>
            <Copy size={13} color={color} style={{ flexShrink: 0 }} />
            {copied && <Text style={{ color: muted, fontSize: 12 }}>Copied!</Text>}
        </Pressable>
    )
}
