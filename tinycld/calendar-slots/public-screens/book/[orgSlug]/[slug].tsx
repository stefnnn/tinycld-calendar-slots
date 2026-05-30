import { PB_SERVER_ADDR } from '@tinycld/core/lib/pocketbase'
import { Stack, useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from 'react-native'

interface SlotType {
    id: string
    name: string
    duration_minutes: number
    padding_minutes: number
}

interface Slot {
    start: string
    end: string
    slot_type_id: string
}

interface DaySlots {
    date: string
    slots: Slot[]
}

interface BookingPageData {
    page_name: string
    intro_text: string
    slot_types: SlotType[]
    time_slots: DaySlots[]
}

const MONTHS = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function formatDate(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00')
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const dayLabel = d.getTime() === today.getTime()
        ? 'Today'
        : d.getTime() === tomorrow.getTime()
            ? 'Tomorrow'
            : `${DAY_NAMES[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`

    return dayLabel
}

function formatTime(isoString: string): string {
    const d = new Date(isoString)
    const h = d.getHours()
    const m = d.getMinutes()
    const ampm = h >= 12 ? 'PM' : 'AM'
    const h12 = h % 12 || 12
    return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`
}

export default function PublicBookPage() {
    const { orgSlug = '', slug = '' } = useLocalSearchParams<{ orgSlug: string; slug: string }>()
    const [data, setData] = useState<BookingPageData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [step, setStep] = useState<'pick' | 'form' | 'done'>('pick')
    const [selectedSlotType, setSelectedSlotType] = useState<SlotType | null>(null)
    const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
    const [guestName, setGuestName] = useState('')
    const [guestEmail, setGuestEmail] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [submitError, setSubmitError] = useState('')

    useEffect(() => {
        if (!orgSlug || !slug) return
        setLoading(true)
        fetch(`${PB_SERVER_ADDR}/api/book/${orgSlug}/${slug}/available-slots`)
            .then(r => {
                if (!r.ok) throw new Error('Booking page not found')
                return r.json()
            })
            .then((d: BookingPageData) => {
                setData(d)
                if (d.slot_types.length > 0) {
                    setSelectedSlotType(d.slot_types[0])
                }
            })
            .catch(e => setError(e.message))
            .finally(() => setLoading(false))
    }, [orgSlug, slug])

    const handleSlotSelect = useCallback((slot: Slot) => {
        setSelectedSlot(slot)
        setStep('form')
    }, [])

    const handleSubmit = useCallback(async () => {
        if (!guestName.trim() || !guestEmail.trim() || !selectedSlot || !selectedSlotType) return
        setSubmitting(true)
        setSubmitError('')
        try {
            const resp = await fetch(`${PB_SERVER_ADDR}/api/book/${orgSlug}/${slug}/book`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    slot_type_id: selectedSlotType.id,
                    guest_name: guestName.trim(),
                    guest_email: guestEmail.trim(),
                    start: selectedSlot.start,
                }),
            })
            if (!resp.ok) {
                const body = await resp.json().catch(() => ({}))
                throw new Error(body.error || body.message || 'Booking failed')
            }
            setStep('done')
        } catch (e: unknown) {
            setSubmitError(e instanceof Error ? e.message : 'Something went wrong')
        } finally {
            setSubmitting(false)
        }
    }, [guestName, guestEmail, selectedSlot, selectedSlotType, orgSlug, slug])

    const groupedSlots = useMemo(() => {
        if (!data || !selectedSlotType) return []
        const groups: DaySlots[] = []
        for (const day of data.time_slots) {
            const filtered = day.slots.filter(s => s.slot_type_id === selectedSlotType.id)
            if (filtered.length > 0) {
                groups.push({ date: day.date, slots: filtered })
            }
        }
        return groups
    }, [data, selectedSlotType])

    if (loading) {
        return (
            <View className="flex-1 bg-background items-center justify-center">
                <ActivityIndicator size="large" />
            </View>
        )
    }

    if (error || !data) {
        return (
            <View className="flex-1 bg-background items-center justify-center p-6">
                <Text style={{ color: '#ef4444', fontSize: 16, textAlign: 'center' }}>
                    {error || 'Booking page not found'}
                </Text>
            </View>
        )
    }

    if (step === 'done') {
        return (
            <View className="flex-1 bg-background items-center justify-center p-6 gap-4">
                <Text style={{ fontSize: 48 }}>✓</Text>
                <Text style={{ color: '#22c55e', fontSize: 20, fontWeight: '600', textAlign: 'center' }}>
                    Booking Confirmed!
                </Text>
                <Text style={{ color: '#6b7280', fontSize: 14, textAlign: 'center' }}>
                    {data.page_name} — {selectedSlot && formatDate(selectedSlot.start.split('T')[0])} at{' '}
                    {selectedSlot && formatTime(selectedSlot.start)}
                </Text>
                <Pressable
                    onPress={() => {
                        setStep('pick')
                        setSelectedSlot(null)
                    }}
                    className="bg-primary px-6 py-3 rounded-xl mt-4"
                >
                    <Text className="text-primary-foreground" style={{ fontSize: 14, fontWeight: '600' }}>
                        Book Another
                    </Text>
                </Pressable>
            </View>
        )
    }

    return (
        <View className="flex-1 bg-background">
            <Stack.Screen options={{ headerShown: false }} />
            <ScrollView className="flex-1">
                <View className="max-w-lg mx-auto w-full p-4 gap-6">
                    {step === 'pick' && (
                        <>
                            <View className="gap-2 py-6">
                                <Text style={{ fontSize: 24, fontWeight: '700', color: '#111827' }}>
                                    {data.page_name}
                                </Text>
                                {data.intro_text ? (
                                    <Text style={{ fontSize: 14, color: '#6b7280' }}>
                                        {data.intro_text}
                                    </Text>
                                ) : null}
                            </View>

                            {data.slot_types.length > 1 && (
                                <View className="gap-2">
                                    <Text style={{ fontSize: 13, color: '#6b7280', fontWeight: '600' }}>
                                        APPOINTMENT TYPE
                                    </Text>
                                    <View className="flex-row flex-wrap gap-2">
                                        {data.slot_types.map(st => (
                                            <Pressable
                                                key={st.id}
                                                onPress={() => setSelectedSlotType(st)}
                                                className={`border rounded-lg px-4 py-2.5 ${
                                                    selectedSlotType?.id === st.id
                                                        ? 'bg-primary border-primary'
                                                        : 'border-border'
                                                }`}
                                            >
                                                <Text
                                                    style={{
                                                        fontSize: 14,
                                                        fontWeight: '500',
                                                        color: selectedSlotType?.id === st.id ? '#fff' : '#111827',
                                                    }}
                                                >
                                                    {st.name}
                                                </Text>
                                                <Text
                                                    style={{
                                                        fontSize: 12,
                                                        color: selectedSlotType?.id === st.id ? '#e0e7ff' : '#6b7280',
                                                    }}
                                                >
                                                    {st.duration_minutes}m
                                                </Text>
                                            </Pressable>
                                        ))}
                                    </View>
                                </View>
                            )}

                            {data.slot_types.length === 1 && selectedSlotType && (
                                <View className="gap-2">
                                    <Text style={{ fontSize: 13, color: '#6b7280', fontWeight: '600' }}>
                                        APPOINTMENT TYPE
                                    </Text>
                                    <Text style={{ fontSize: 15, color: '#111827' }}>
                                        {selectedSlotType.name} ({selectedSlotType.duration_minutes}m)
                                    </Text>
                                </View>
                            )}

                            <Text style={{ fontSize: 13, color: '#6b7280', fontWeight: '600' }}>
                                SELECT A TIME
                            </Text>

                            {groupedSlots.length === 0 && (
                                <View className="py-8 items-center">
                                    <Text style={{ color: '#6b7280', fontSize: 14 }}>
                                        No available slots in the next 4 weeks.
                                    </Text>
                                </View>
                            )}

                            {groupedSlots.map(day => (
                                <View key={day.date} className="gap-2">
                                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>
                                        {formatDate(day.date)}
                                    </Text>
                                    <View className="flex-row flex-wrap gap-2">
                                        {day.slots.map((slot, i) => (
                                            <Pressable
                                                key={i}
                                                onPress={() => handleSlotSelect(slot)}
                                                className="border border-primary rounded-lg px-4 py-2.5 active:bg-primary"
                                            >
                                                <Text
                                                    style={{
                                                        fontSize: 14,
                                                        fontWeight: '500',
                                                        color: '#2563eb',
                                                    }}
                                                >
                                                    {formatTime(slot.start)}
                                                </Text>
                                            </Pressable>
                                        ))}
                                    </View>
                                </View>
                            ))}
                        </>
                    )}

                    {step === 'form' && selectedSlot && (
                        <>
                            <View className="py-6 gap-1">
                                <Pressable
                                    onPress={() => setStep('pick')}
                                    className="mb-4"
                                >
                                    <Text style={{ fontSize: 14, color: '#2563eb' }}>
                                        ← Back to times
                                    </Text>
                                </Pressable>
                                <Text style={{ fontSize: 22, fontWeight: '700', color: '#111827' }}>
                                    Enter your details
                                </Text>
                                <Text style={{ fontSize: 14, color: '#6b7280' }}>
                                    {formatDate(selectedSlot.start.split('T')[0])} at{' '}
                                    {formatTime(selectedSlot.start)}
                                </Text>
                            </View>

                            <View className="gap-3">
                                <View>
                                    <Text style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>
                                        Name
                                    </Text>
                                    <TextInput
                                        value={guestName}
                                        onChangeText={setGuestName}
                                        placeholder="Your name"
                                        className="bg-card border border-border rounded-lg px-4 py-3"
                                        style={{ fontSize: 15 }}
                                        placeholderTextColor="#9ca3af"
                                    />
                                </View>
                                <View>
                                    <Text style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>
                                        Email
                                    </Text>
                                    <TextInput
                                        value={guestEmail}
                                        onChangeText={setGuestEmail}
                                        placeholder="your@email.com"
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        className="bg-card border border-border rounded-lg px-4 py-3"
                                        style={{ fontSize: 15 }}
                                        placeholderTextColor="#9ca3af"
                                    />
                                </View>

                                {submitError ? (
                                    <Text style={{ color: '#ef4444', fontSize: 13 }}>
                                        {submitError}
                                    </Text>
                                ) : null}

                                <Pressable
                                    onPress={handleSubmit}
                                    disabled={submitting || !guestName.trim() || !guestEmail.trim()}
                                    className={`px-6 py-3.5 rounded-xl items-center ${
                                        submitting || !guestName.trim() || !guestEmail.trim()
                                            ? 'bg-gray-300'
                                            : 'bg-primary'
                                    }`}
                                >
                                    <Text
                                        className="text-primary-foreground"
                                        style={{ fontSize: 15, fontWeight: '600' }}
                                    >
                                        {submitting ? 'Booking...' : 'Confirm Booking'}
                                    </Text>
                                </Pressable>
                            </View>
                        </>
                    )}
                </View>
            </ScrollView>
        </View>
    )
}
