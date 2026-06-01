import { mutation, useMutation } from '@tinycld/core/lib/mutations'
import { useStore } from '@tinycld/core/lib/pocketbase'
import { useThemeColor } from '@tinycld/core/lib/use-app-theme'
import { PlainInput } from '@tinycld/core/ui/PlainInput'
import { ChevronDown, ChevronRight } from 'lucide-react-native'
import { useEffect, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import type { BookingPages } from '../types'

type BookingWindow = 'infinite' | 'rolling' | 'range'
type MaxPeriod = '' | 'day' | 'week' | 'month'

interface Rules {
    minNoticeHours: number
    bookingWindow: BookingWindow
    bookingRollingDays: number
    bookingDateFrom: string
    bookingDateTo: string
    maxBookingsCount: number
    maxBookingsPeriod: MaxPeriod
}

const MIN_NOTICE_OPTIONS: { label: string; hours: number }[] = [
    { label: 'None', hours: 0 },
    { label: '1h', hours: 1 },
    { label: '2h', hours: 2 },
    { label: '4h', hours: 4 },
    { label: '8h', hours: 8 },
    { label: '12h', hours: 12 },
    { label: '1d', hours: 24 },
    { label: '2d', hours: 48 },
    { label: '3d', hours: 72 },
]

function toRules(page: BookingPages): Rules {
    return {
        minNoticeHours: page.min_notice_hours ?? 0,
        bookingWindow: (page.booking_window as BookingWindow) || 'infinite',
        bookingRollingDays: page.booking_rolling_days ?? 14,
        bookingDateFrom: page.booking_date_from ?? '',
        bookingDateTo: page.booking_date_to ?? '',
        maxBookingsCount: page.max_bookings_count ?? 0,
        maxBookingsPeriod: (page.max_bookings_period as MaxPeriod) ?? '',
    }
}

interface BookingRulesEditorProps {
    pageId: string
    page: BookingPages
}

export function BookingRulesEditor({ pageId, page }: BookingRulesEditorProps) {
    const fg = useThemeColor('foreground')
    const muted = useThemeColor('muted-foreground')
    const borderColor = useThemeColor('border')
    const primaryColor = useThemeColor('primary')
    const placeholderColor = useThemeColor('field-placeholder')
    const [pagesCollection] = useStore('booking_pages')

    const [expanded, setExpanded] = useState(false)
    const [rules, setRules] = useState<Rules>(() => toRules(page))
    const [saved, setSaved] = useState(false)

    useEffect(() => {
        setRules(toRules(page))
    }, [page.id])

    const saveMutation = useMutation({
        mutationFn: mutation(function* () {
            yield pagesCollection.update(pageId, draft => {
                draft.min_notice_hours = rules.minNoticeHours
                draft.booking_window = rules.bookingWindow
                draft.booking_rolling_days = rules.bookingRollingDays
                draft.booking_date_from = rules.bookingDateFrom
                draft.booking_date_to = rules.bookingDateTo
                draft.max_bookings_count = rules.maxBookingsCount
                draft.max_bookings_period = rules.maxBookingsPeriod as any
            })
        }),
        onSuccess: () => {
            setSaved(true)
            setTimeout(() => setSaved(false), 2000)
        },
    })

    function chip(
        label: string,
        selected: boolean,
        onPress: () => void,
    ) {
        return (
            <Pressable
                key={label}
                onPress={onPress}
                className={`px-2.5 py-1 rounded-md border items-center justify-center ${selected ? 'bg-primary' : ''}`}
                style={{ borderColor: selected ? primaryColor : borderColor }}
            >
                <Text
                    className={selected ? 'text-primary-foreground' : 'text-foreground'}
                    style={{ fontSize: 13, fontWeight: selected ? '600' : '400' }}
                >
                    {label}
                </Text>
            </Pressable>
        )
    }

    return (
        <View className="gap-3">
            <Pressable
                onPress={() => setExpanded(e => !e)}
                className="flex-row items-center justify-between"
            >
                <Text style={{ color: fg, fontSize: 18, fontWeight: '600' }}>Booking Rules</Text>
                {expanded
                    ? <ChevronDown size={18} color={muted} />
                    : <ChevronRight size={18} color={muted} />
                }
            </Pressable>

            {!expanded && (
                <Text style={{ color: muted, fontSize: 13 }}>
                    {summaryText(rules)}
                </Text>
            )}

            {expanded && <View className="gap-5">
            {/* Min notice */}
            <View className="gap-2">
                <Text style={{ color: muted, fontSize: 12, fontWeight: '600' }}>MINIMUM NOTICE</Text>
                <View className="flex-row flex-wrap gap-1.5">
                    {MIN_NOTICE_OPTIONS.map(opt =>
                        chip(opt.label, rules.minNoticeHours === opt.hours, () =>
                            setRules(r => ({ ...r, minNoticeHours: opt.hours }))
                        )
                    )}
                </View>
            </View>

            {/* Booking window */}
            <View className="gap-2">
                <Text style={{ color: muted, fontSize: 12, fontWeight: '600' }}>BOOKING WINDOW</Text>
                <View className="flex-row gap-1.5">
                    {(['infinite', 'rolling', 'range'] as BookingWindow[]).map(w =>
                        chip(
                            w === 'infinite' ? 'Infinite' : w === 'rolling' ? 'Rolling' : 'Specific dates',
                            rules.bookingWindow === w,
                            () => setRules(r => ({ ...r, bookingWindow: w })),
                        )
                    )}
                </View>

                {rules.bookingWindow === 'rolling' && (
                    <View className="flex-row items-center gap-2 mt-1">
                        <Text style={{ color: fg, fontSize: 13 }}>Up to</Text>
                        <PlainInput
                            value={String(rules.bookingRollingDays)}
                            onChangeText={v => {
                                const n = parseInt(v, 10)
                                if (!isNaN(n) && n > 0) setRules(r => ({ ...r, bookingRollingDays: n }))
                            }}
                            keyboardType="number-pad"
                            placeholderTextColor={placeholderColor}
                            className="border border-border rounded-lg px-3 py-2 text-base text-foreground bg-background"
                            style={{ width: 64 }}
                        />
                        <Text style={{ color: fg, fontSize: 13 }}>days in advance</Text>
                    </View>
                )}

                {rules.bookingWindow === 'range' && (
                    <View className="flex-row items-center gap-2 mt-1 flex-wrap">
                        <Text style={{ color: fg, fontSize: 13 }}>From</Text>
                        <PlainInput
                            value={rules.bookingDateFrom}
                            onChangeText={v => setRules(r => ({ ...r, bookingDateFrom: v }))}
                            placeholder="YYYY-MM-DD"
                            placeholderTextColor={placeholderColor}
                            className="border border-border rounded-lg px-3 py-2 text-base text-foreground bg-background"
                            style={{ width: 120 }}
                        />
                        <Text style={{ color: fg, fontSize: 13 }}>to</Text>
                        <PlainInput
                            value={rules.bookingDateTo}
                            onChangeText={v => setRules(r => ({ ...r, bookingDateTo: v }))}
                            placeholder="YYYY-MM-DD"
                            placeholderTextColor={placeholderColor}
                            className="border border-border rounded-lg px-3 py-2 text-base text-foreground bg-background"
                            style={{ width: 120 }}
                        />
                    </View>
                )}
            </View>

            {/* Max bookings */}
            <View className="gap-2">
                <Text style={{ color: muted, fontSize: 12, fontWeight: '600' }}>MAX BOOKINGS</Text>
                <View className="flex-row gap-1.5">
                    {chip('No limit', rules.maxBookingsPeriod === '', () =>
                        setRules(r => ({ ...r, maxBookingsPeriod: '' }))
                    )}
                    {(['day', 'week', 'month'] as MaxPeriod[]).map(p =>
                        chip(
                            `Per ${p}`,
                            rules.maxBookingsPeriod === p,
                            () => setRules(r => ({ ...r, maxBookingsPeriod: p })),
                        )
                    )}
                </View>

                {rules.maxBookingsPeriod !== '' && (
                    <View className="flex-row items-center gap-2 mt-1">
                        <Text style={{ color: fg, fontSize: 13 }}>Max</Text>
                        <PlainInput
                            value={rules.maxBookingsCount > 0 ? String(rules.maxBookingsCount) : ''}
                            onChangeText={v => {
                                const n = parseInt(v, 10)
                                setRules(r => ({ ...r, maxBookingsCount: isNaN(n) ? 0 : n }))
                            }}
                            keyboardType="number-pad"
                            placeholder="e.g. 5"
                            placeholderTextColor={placeholderColor}
                            className="border border-border rounded-lg px-3 py-2 text-base text-foreground bg-background"
                            style={{ width: 64 }}
                        />
                        <Text style={{ color: fg, fontSize: 13 }}>per {rules.maxBookingsPeriod}</Text>
                    </View>
                )}
            </View>

            <Pressable
                onPress={() => saveMutation.mutate()}
                className="bg-primary px-6 py-3 rounded-xl items-center"
            >
                <Text className="text-primary-foreground" style={{ fontSize: 15, fontWeight: '600' }}>
                    {saveMutation.isPending ? 'Saving…' : 'Save Rules'}
                </Text>
            </Pressable>

            {saved && (
                <Text style={{ color: '#22c55e', fontSize: 14, textAlign: 'center' }}>Saved!</Text>
            )}
            {saveMutation.error && (
                <Text style={{ color: '#ef4444', fontSize: 13, textAlign: 'center' }}>
                    {String(saveMutation.error)}
                </Text>
            )}
            </View>}
        </View>
    )
}

function summaryText(rules: Rules): string {
    const parts: string[] = []

    if (rules.minNoticeHours > 0) {
        const opt = MIN_NOTICE_OPTIONS.find(o => o.hours === rules.minNoticeHours)
        parts.push(`${opt ? opt.label : `${rules.minNoticeHours}h`} notice`)
    }

    if (rules.bookingWindow === 'rolling' && rules.bookingRollingDays > 0) {
        parts.push(`${rules.bookingRollingDays} days ahead`)
    } else if (rules.bookingWindow === 'range') {
        const from = rules.bookingDateFrom || '–'
        const to = rules.bookingDateTo || '–'
        parts.push(`${from} to ${to}`)
    }

    if (rules.maxBookingsPeriod && rules.maxBookingsCount > 0) {
        parts.push(`max ${rules.maxBookingsCount}/${rules.maxBookingsPeriod}`)
    }

    return parts.length > 0 ? parts.join(' · ') : 'No restrictions'
}
