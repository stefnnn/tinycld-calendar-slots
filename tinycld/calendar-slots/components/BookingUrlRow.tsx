import { PB_SERVER_ADDR } from '@tinycld/core/lib/pocketbase'
import { useThemeColor } from '@tinycld/core/lib/use-app-theme'
import * as Clipboard from 'expo-clipboard'
import { useState } from 'react'
import { Pressable, Text } from 'react-native'
import { Copy } from 'lucide-react-native'

export function BookingUrlRow({ orgSlug, slug }: { orgSlug: string; slug: string }) {
    const fg = useThemeColor('foreground')
    const muted = useThemeColor('muted-foreground')
    const [copied, setCopied] = useState(false)
    const [hovered, setHovered] = useState(false)

    const fullUrl = `${PB_SERVER_ADDR}/book/${orgSlug}/${slug || '...'}`

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
            className="flex-row items-center gap-1.5"
        >
            <Text style={{ color, fontSize: 13 }}>{fullUrl}</Text>
            <Copy size={13} color={color} />
            {copied && <Text style={{ color: muted, fontSize: 12 }}>Copied!</Text>}
        </Pressable>
    )
}
