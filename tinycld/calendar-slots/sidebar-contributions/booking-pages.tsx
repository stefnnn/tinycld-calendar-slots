import { SidebarDivider, SidebarItem } from '@tinycld/core/components/sidebar-primitives'
import { useStore } from '@tinycld/core/lib/pocketbase'
import { useThemeColor } from '@tinycld/core/lib/use-app-theme'
import { useOrgLiveQuery } from '@tinycld/core/lib/use-org-live-query'
import { ChevronDown, ChevronRight, Plus } from 'lucide-react-native'
import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useBookingPageDialogStore } from '../stores/booking-page-dialog-store'

export default function BookingPagesSidebarContribution() {
    const fg = useThemeColor('foreground')
    const muted = useThemeColor('muted-foreground')
    const [pagesCollection] = useStore('booking_pages')
    const [expanded, setExpanded] = useState(true)
    const openDialog = useBookingPageDialogStore(s => s.open)

    const { data: pages } = useOrgLiveQuery((query, _org) => query.from({ p: pagesCollection }), [])

    const ChevronIcon = expanded ? ChevronDown : ChevronRight

    return (
        <>
            <View testID="booking-pages-sidebar" className="mt-2">
                <Pressable
                    className="flex-row items-center gap-1.5 px-3 py-1.5"
                    onPress={() => setExpanded(prev => !prev)}
                >
                    <ChevronIcon size={14} color={muted} />
                    <Text style={{ fontSize: 13, fontWeight: '600', color: muted }}>
                        Booking pages
                    </Text>
                </Pressable>
                {expanded && (
                    <>
                        {pages?.map(page => (
                            <SidebarItem
                                key={page.id}
                                label={page.name}
                                colorDot={page.active ? '#22c55e' : `${muted}80`}
                                onPress={() => openDialog(page.id)}
                            />
                        ))}
                        <Pressable
                            onPress={() => openDialog()}
                            className="flex-row items-center gap-2.5 px-3 py-2 rounded-lg"
                        >
                            <Plus size={10} color={fg} />
                            <Text style={{ fontSize: 14, color: fg }}>New booking page</Text>
                        </Pressable>
                    </>
                )}
            </View>
            <SidebarDivider />
        </>
    )
}
