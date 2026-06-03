import { mutation, useMutation } from '@tinycld/core/lib/mutations'
import { useStore } from '@tinycld/core/lib/pocketbase'
import { useThemeColor } from '@tinycld/core/lib/use-app-theme'
import { useOrgLiveQuery } from '@tinycld/core/lib/use-org-live-query'
import { PlainInput } from '@tinycld/core/ui/PlainInput'
import { Plus, Trash2 } from 'lucide-react-native'
import { newRecordId } from 'pbtsdb/core'
import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface AvailabilityEditorProps {
    pageId: string
}

export function AvailabilityEditor({ pageId }: AvailabilityEditorProps) {
    const fg = useThemeColor('foreground')
    const muted = useThemeColor('muted-foreground')
    const borderColor = useThemeColor('border')
    const primaryColor = useThemeColor('primary')
    const placeholderColor = useThemeColor('field-placeholder')
    const [availabilityCollection] = useStore('booking_availability')
    const [adding, setAdding] = useState(false)
    const [day, setDay] = useState(1)
    const [start, setStart] = useState('09:00')
    const [end, setEnd] = useState('17:00')

    const { data: availabilities } = useOrgLiveQuery(
        (query, _org) => query.from({ a: availabilityCollection }),
        [pageId]
    )

    const pageAvail = availabilities?.filter(a => a.page === pageId) ?? []

    const addMutation = useMutation({
        mutationFn: mutation(function* () {
            yield availabilityCollection.insert({
                id: newRecordId(),
                page: pageId,
                day_of_week: day,
                start_time: start,
                end_time: end,
            })
        }),
    })

    const deleteMutation = useMutation({
        mutationFn: mutation(function* (availId: string) {
            yield availabilityCollection.delete(availId)
        }),
    })

    const handleAdd = () => {
        addMutation.mutate(undefined, {
            onSuccess: () => setAdding(false),
        })
    }

    return (
        <View className="gap-3">
            {pageAvail.length === 0 && (
                <Text style={{ color: muted, fontSize: 13 }}>
                    No availability set. Add your weekly hours below.
                </Text>
            )}

            {pageAvail
                .sort((a, b) => {
                    if (a.day_of_week !== b.day_of_week) return a.day_of_week - b.day_of_week
                    return a.start_time.localeCompare(b.start_time)
                })
                .map(a => (
                    <View
                        key={a.id}
                        className="flex-row items-center justify-between bg-card border border-border rounded-lg px-4 py-3"
                    >
                        <View className="flex-row items-center gap-3">
                            <Text style={{ color: fg, fontSize: 14, fontWeight: '600', width: 36 }}>
                                {DAYS[a.day_of_week]}
                            </Text>
                            <Text style={{ color: fg, fontSize: 14 }}>
                                {a.start_time} — {a.end_time}
                            </Text>
                        </View>
                        <Pressable onPress={() => deleteMutation.mutate(a.id)} className="p-2">
                            <Trash2 size={16} color="#ef4444" />
                        </Pressable>
                    </View>
                ))}

            {adding ? (
                <View className="bg-card border border-border rounded-lg p-4 gap-3">
                    <View className="flex-row gap-1.5 flex-wrap">
                        {DAYS.map((d, i) => {
                            const selected = day === i
                            return (
                                <Pressable
                                    key={d}
                                    onPress={() => setDay(i)}
                                    className={`px-3 py-1.5 rounded-md border items-center justify-center ${selected ? 'bg-primary' : ''}`}
                                    style={{ borderColor: selected ? primaryColor : borderColor }}
                                >
                                    <Text
                                        className={
                                            selected ? 'text-primary-foreground' : 'text-foreground'
                                        }
                                        style={{
                                            fontSize: 13,
                                            fontWeight: selected ? '600' : '400',
                                        }}
                                    >
                                        {d}
                                    </Text>
                                </Pressable>
                            )
                        })}
                    </View>

                    <View className="flex-row items-center gap-3">
                        <Text style={{ color: fg, fontSize: 14 }}>From</Text>
                        <PlainInput
                            value={start}
                            onChangeText={setStart}
                            placeholder="09:00"
                            placeholderTextColor={placeholderColor}
                            className="border border-border rounded-lg px-3 py-2 text-base text-foreground bg-background"
                            style={{ width: 80 }}
                        />
                        <Text style={{ color: fg, fontSize: 14 }}>to</Text>
                        <PlainInput
                            value={end}
                            onChangeText={setEnd}
                            placeholder="17:00"
                            placeholderTextColor={placeholderColor}
                            className="border border-border rounded-lg px-3 py-2 text-base text-foreground bg-background"
                            style={{ width: 80 }}
                        />
                    </View>

                    <View className="flex-row gap-2">
                        <Pressable
                            onPress={handleAdd}
                            className="bg-primary flex-1 py-2 rounded-lg items-center"
                        >
                            <Text
                                className="text-primary-foreground"
                                style={{ fontSize: 14, fontWeight: '600' }}
                            >
                                Add
                            </Text>
                        </Pressable>
                        <Pressable
                            onPress={() => setAdding(false)}
                            className="border border-border flex-1 py-2 rounded-lg items-center bg-background"
                        >
                            <Text style={{ color: fg, fontSize: 14 }}>Cancel</Text>
                        </Pressable>
                    </View>
                </View>
            ) : (
                <Pressable
                    onPress={() => setAdding(true)}
                    className="flex-row items-center gap-2 py-2"
                >
                    <Plus size={16} color={muted} />
                    <Text style={{ color: muted, fontSize: 14 }}>Add availability</Text>
                </Pressable>
            )}
        </View>
    )
}
