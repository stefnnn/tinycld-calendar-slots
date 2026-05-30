import {
    SidebarActionButton,
    SidebarItem,
    SidebarNav,
} from '@tinycld/core/components/sidebar-primitives'
import { useOrgHref } from '@tinycld/core/lib/org-routes'
import { useStore } from '@tinycld/core/lib/pocketbase'
import { useThemeColor } from '@tinycld/core/lib/use-app-theme'
import { useOrgLiveQuery } from '@tinycld/core/lib/use-org-live-query'
import { usePathname, useRouter } from 'expo-router'
import { CalendarPlus2 } from 'lucide-react-native'

export default function CalendarSlotsSidebar() {
    const router = useRouter()
    const pathname = usePathname()
    const orgHref = useOrgHref()
    const muted = useThemeColor('muted-foreground')
    const [pagesCollection] = useStore('booking_pages')

    const { data: pages } = useOrgLiveQuery(
        (query, _org) => query.from({ p: pagesCollection }),
        []
    )

    const isAllPagesActive =
        pathname.endsWith('/calendar-slots') || pathname.endsWith('/calendar-slots/')

    return (
        <SidebarNav>
            <SidebarActionButton
                label="+ New Booking Page"
                onPress={() => router.push(orgHref('calendar-slots/[id]', { id: 'new' }))}
            />

            <SidebarItem
                label="All Pages"
                icon={CalendarPlus2}
                badge={pages?.length || undefined}
                isActive={isAllPagesActive}
                closesDrawer
                onPress={() => router.push(orgHref('calendar-slots'))}
            />

            {pages?.map(page => (
                <SidebarItem
                    key={page.id}
                    label={page.name}
                    colorDot={page.active ? '#22c55e' : `${muted}80`}
                    isActive={pathname.endsWith(`/calendar-slots/${page.id}`)}
                    closesDrawer
                    onPress={() =>
                        router.push(orgHref('calendar-slots/[id]', { id: page.id }))
                    }
                />
            ))}
        </SidebarNav>
    )
}
