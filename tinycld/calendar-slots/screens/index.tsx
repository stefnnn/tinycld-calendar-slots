import { useCurrentRole } from '@tinycld/core/lib/use-current-role'
import { useOrgHref } from '@tinycld/core/lib/org-routes'
import { useOrgSlug } from '@tinycld/core/lib/use-org-slug'
import { useOrgLiveQuery } from '@tinycld/core/lib/use-org-live-query'
import { useStore } from '@tinycld/core/lib/pocketbase'
import { useThemeColor } from '@tinycld/core/lib/use-app-theme'
import { Link, Stack, useRouter } from 'expo-router'
import { Plus } from 'lucide-react-native'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { BookingUrlRow } from '../components/BookingUrlRow'

export default function BookingPagesIndex() {
    const fg = useThemeColor('foreground')
    const muted = useThemeColor('muted-foreground')
    const router = useRouter()
    const orgHref = useOrgHref()
    const orgSlug = useOrgSlug()
    const [pagesCollection] = useStore('booking_pages')

    const { data: pages, isLoading } = useOrgLiveQuery(
        (query, _org) =>
            query.from({ p: pagesCollection }),
        []
    )

    return (
        <View className="flex-1 bg-background">
            <Stack.Screen options={{ title: 'Booking Pages' }} />
            <ScrollView className="flex-1">
                <View className="p-4 gap-4">
                    <View className="flex-row items-center justify-between">
                        <Text style={{ color: fg, fontSize: 22, fontWeight: '600' }}>
                            Booking Pages
                        </Text>
                        <Pressable
                            onPress={() => router.push(orgHref('calendar-slots/[id]', { id: 'new' }))}
                            className="bg-primary px-4 py-2 rounded-lg flex-row items-center gap-2"
                        >
                            <Plus size={16} color="#fff" />
                            <Text className="text-primary-foreground" style={{ fontSize: 14, fontWeight: '600' }}>
                                New Page
                            </Text>
                        </Pressable>
                    </View>

                    {isLoading && (
                        <Text style={{ color: muted, fontSize: 14 }}>Loading...</Text>
                    )}

                    {!isLoading && pages && pages.length === 0 && (
                        <View className="py-12 items-center gap-3">
                            <Text style={{ color: muted, fontSize: 15 }}>
                                No booking pages yet
                            </Text>
                            <Text style={{ color: muted, fontSize: 13 }}>
                                Create a booking page to let people schedule time on your calendar.
                            </Text>
                        </View>
                    )}

                    {pages && pages.map(page => (
                        <Link
                            key={page.id}
                            href={orgHref('calendar-slots/[id]', { id: page.id })}
                            style={{ width: '100%' }}
                        >
                            <View className="bg-card border border-border rounded-xl p-4 gap-2 w-full">
                                <View className="flex-row items-center justify-between gap-2">
                                    <Text style={{ color: fg, fontSize: 16, fontWeight: '600' }}>
                                        {page.name}
                                    </Text>
                                    <View
                                        className="px-2 py-0.5 rounded-full"
                                        style={{
                                            backgroundColor: page.active ? '#22c55e20' : '#6b728020',
                                        }}
                                    >
                                        <Text
                                            style={{
                                                fontSize: 12,
                                                color: page.active ? '#22c55e' : '#6b7280',
                                            }}
                                        >
                                            {page.active ? 'Active' : 'Inactive'}
                                        </Text>
                                    </View>
                                </View>
                                <BookingUrlRow orgSlug={orgSlug} slug={page.slug} />
                                {page.intro_text ? (
                                    <Text
                                        numberOfLines={2}
                                        style={{ color: muted, fontSize: 13 }}
                                    >
                                        {page.intro_text}
                                    </Text>
                                ) : null}
                            </View>
                        </Link>
                    ))}
                </View>
            </ScrollView>
        </View>
    )
}
