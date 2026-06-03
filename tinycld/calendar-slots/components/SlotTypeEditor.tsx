import { mutation, useMutation } from '@tinycld/core/lib/mutations'
import { useStore } from '@tinycld/core/lib/pocketbase'
import { useThemeColor } from '@tinycld/core/lib/use-app-theme'
import { useOrgLiveQuery } from '@tinycld/core/lib/use-org-live-query'
import { PlainInput } from '@tinycld/core/ui/PlainInput'
import { Plus, Trash2 } from 'lucide-react-native'
import { newRecordId } from 'pbtsdb/core'
import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'

const COLORS = [
    '#3b82f6',
    '#22c55e',
    '#ef4444',
    '#f59e0b',
    '#8b5cf6',
    '#ec4899',
    '#06b6d4',
    '#14b8a6',
]

interface SlotTypeEditorProps {
    pageId: string
}

export function SlotTypeEditor({ pageId }: SlotTypeEditorProps) {
    const fg = useThemeColor('foreground')
    const muted = useThemeColor('muted-foreground')
    const borderColor = useThemeColor('border')
    const primaryColor = useThemeColor('primary')
    const placeholderColor = useThemeColor('field-placeholder')
    const [slotTypesCollection] = useStore('booking_slot_types')
    const [adding, setAdding] = useState(false)
    const [name, setName] = useState('')
    const [duration, setDuration] = useState('30')
    const [padding, setPadding] = useState('15')
    const [color, setColor] = useState(COLORS[0])

    const { data: slotTypes } = useOrgLiveQuery(
        (query, _org) => query.from({ s: slotTypesCollection }),
        [pageId]
    )

    const pageTypes = slotTypes?.filter(s => s.page === pageId) ?? []

    const addMutation = useMutation({
        mutationFn: mutation(function* () {
            yield slotTypesCollection.insert({
                id: newRecordId(),
                page: pageId,
                name,
                duration_minutes: parseInt(duration, 10),
                padding_minutes: parseInt(padding, 10),
                color,
            })
        }),
    })

    const deleteMutation = useMutation({
        mutationFn: mutation(function* (slotId: string) {
            yield slotTypesCollection.delete(slotId)
        }),
    })

    const handleAdd = () => {
        if (!name.trim()) return
        addMutation.mutate(undefined, {
            onSuccess: () => {
                setAdding(false)
                setName('')
                setDuration('30')
                setPadding('15')
                setColor(COLORS[0])
            },
        })
    }

    return (
        <View className="gap-3">
            {pageTypes.length === 0 && (
                <Text style={{ color: muted, fontSize: 13 }}>
                    No appointment types yet. Add types like "Haircut" or "Consultation".
                </Text>
            )}

            {pageTypes.map(st => (
                <View
                    key={st.id}
                    className="flex-row items-center justify-between bg-card border border-border rounded-lg px-4 py-3"
                >
                    <View className="flex-row items-center gap-3">
                        <View
                            style={{
                                width: 12,
                                height: 12,
                                borderRadius: 6,
                                backgroundColor: st.color,
                            }}
                        />
                        <View>
                            <Text style={{ color: fg, fontSize: 14, fontWeight: '600' }}>
                                {st.name}
                            </Text>
                            <Text style={{ color: muted, fontSize: 12 }}>
                                {st.duration_minutes}m
                                {st.padding_minutes > 0 ? ` · ${st.padding_minutes}m padding` : ''}
                            </Text>
                        </View>
                    </View>
                    <Pressable onPress={() => deleteMutation.mutate(st.id)} className="p-2">
                        <Trash2 size={16} color="#ef4444" />
                    </Pressable>
                </View>
            ))}

            {adding ? (
                <View className="bg-card border border-border rounded-lg p-4 gap-3">
                    <View>
                        <Text style={{ color: muted, fontSize: 12, marginBottom: 4 }}>Name</Text>
                        <PlainInput
                            value={name}
                            onChangeText={setName}
                            placeholder="e.g. Haircut"
                            placeholderTextColor={placeholderColor}
                            className="border border-border rounded-lg px-3 py-2.5 text-base text-foreground bg-background"
                            autoFocus
                        />
                    </View>

                    <View className="flex-row gap-3">
                        <View className="flex-1">
                            <Text style={{ color: muted, fontSize: 12, marginBottom: 6 }}>
                                Duration (min)
                            </Text>
                            <View className="flex-row gap-1.5">
                                {[15, 30, 45, 60].map(d => {
                                    const selected = duration === String(d)
                                    return (
                                        <Pressable
                                            key={d}
                                            onPress={() => setDuration(String(d))}
                                            className={`px-2.5 py-1 rounded-md border items-center justify-center ${selected ? 'bg-primary' : ''}`}
                                            style={{
                                                borderColor: selected ? primaryColor : borderColor,
                                            }}
                                        >
                                            <Text
                                                className={
                                                    selected
                                                        ? 'text-primary-foreground'
                                                        : 'text-foreground'
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
                        </View>
                        <View className="flex-1">
                            <Text style={{ color: muted, fontSize: 12, marginBottom: 6 }}>
                                Padding (min)
                            </Text>
                            <View className="flex-row gap-1.5">
                                {[0, 5, 10, 15, 30].map(p => {
                                    const selected = padding === String(p)
                                    return (
                                        <Pressable
                                            key={p}
                                            onPress={() => setPadding(String(p))}
                                            className={`px-2.5 py-1 rounded-md border items-center justify-center ${selected ? 'bg-primary' : ''}`}
                                            style={{
                                                borderColor: selected ? primaryColor : borderColor,
                                            }}
                                        >
                                            <Text
                                                className={
                                                    selected
                                                        ? 'text-primary-foreground'
                                                        : 'text-foreground'
                                                }
                                                style={{
                                                    fontSize: 13,
                                                    fontWeight: selected ? '600' : '400',
                                                }}
                                            >
                                                {p}
                                            </Text>
                                        </Pressable>
                                    )
                                })}
                            </View>
                        </View>
                    </View>

                    <View>
                        <Text style={{ color: muted, fontSize: 12, marginBottom: 6 }}>Color</Text>
                        <View className="flex-row gap-2">
                            {COLORS.map(c => (
                                <Pressable
                                    key={c}
                                    onPress={() => setColor(c)}
                                    style={{
                                        width: 28,
                                        height: 28,
                                        borderRadius: 14,
                                        backgroundColor: c,
                                        borderWidth: color === c ? 3 : 0,
                                        borderColor: fg,
                                    }}
                                />
                            ))}
                        </View>
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
                                {addMutation.isPending ? 'Adding...' : 'Add'}
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
                    <Text style={{ color: muted, fontSize: 14 }}>Add appointment type</Text>
                </Pressable>
            )}
        </View>
    )
}
