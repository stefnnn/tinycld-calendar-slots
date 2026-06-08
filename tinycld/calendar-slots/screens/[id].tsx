import { mutation, useMutation } from '@tinycld/core/lib/mutations'
import { useOrgHref } from '@tinycld/core/lib/org-routes'
import { useStore } from '@tinycld/core/lib/pocketbase'
import { useThemeColor } from '@tinycld/core/lib/use-app-theme'
import { useCurrentRole } from '@tinycld/core/lib/use-current-role'
import { useOrgInfo } from '@tinycld/core/lib/use-org-info'
import { useOrgLiveQuery } from '@tinycld/core/lib/use-org-live-query'
import { useOrgSlug } from '@tinycld/core/lib/use-org-slug'
import { TextAreaInput, TextInput, Toggle } from '@tinycld/core/ui/form'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { newRecordId } from 'pbtsdb/core'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { AvailabilityEditor } from '../components/AvailabilityEditor'
import { BookingRulesEditor } from '../components/BookingRulesEditor'
import { BookingUrlRow } from '../components/BookingUrlRow'
import { SlotTypeEditor } from '../components/SlotTypeEditor'

function generateSlug(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
}

export default function BookingPageEdit() {
    const { id } = useLocalSearchParams<{ id: string }>()
    const isNew = id === 'new'
    const fg = useThemeColor('foreground')
    const muted = useThemeColor('muted-foreground')
    const router = useRouter()
    const orgHref = useOrgHref()
    const orgSlug = useOrgSlug()
    const { orgId } = useOrgInfo()
    const { userOrgId } = useCurrentRole()
    const [pagesCollection] = useStore('booking_pages')
    const [_slotTypesCollection] = useStore('booking_slot_types')
    const [_availabilityCollection] = useStore('booking_availability')
    const [_bookingsCollection] = useStore('bookings')

    const [saved, setSaved] = useState(false)

    const { data: pages } = useOrgLiveQuery(
        (query, _org) => {
            if (isNew) return null
            return query.from({ p: pagesCollection })
        },
        [isNew, id]
    )

    const page = pages?.find(p => p.id === id) ?? null

    const { control, handleSubmit, watch, setValue } = useForm({
        defaultValues: {
            name: '',
            slug: '',
            intro_text: '',
            active: true,
        },
    })

    const nameValue = watch('name')

    useEffect(() => {
        if (page) {
            setValue('name', page.name)
            setValue('slug', page.slug)
            setValue('intro_text', page.intro_text || '')
            setValue('active', page.active ?? true)
        }
    }, [page, setValue])

    useEffect(() => {
        if (isNew && nameValue) {
            setValue('slug', generateSlug(nameValue))
        }
    }, [isNew, nameValue, setValue])

    const saveMutation = useMutation({
        mutationFn: mutation(function* (data: {
            name: string
            slug: string
            intro_text: string
            active: boolean
        }) {
            if (isNew) {
                if (!orgId || !userOrgId) throw new Error('No organization context')
                yield pagesCollection.insert({
                    id: newRecordId(),
                    ...data,
                    org: orgId,
                    owner: userOrgId,
                    min_notice_hours: 0,
                    booking_window: 'infinite',
                    booking_rolling_days: 0,
                    booking_date_from: '',
                    booking_date_to: '',
                    max_bookings_count: 0,
                    // '' means "no limit"; the generated schema omits the empty
                    // option for this required:false select, so cast through unknown.
                    max_bookings_period: '' as unknown as 'day' | 'week' | 'month',
                })
            } else {
                yield pagesCollection.update(id, draft => {
                    draft.name = data.name
                    draft.slug = data.slug
                    draft.intro_text = data.intro_text
                    draft.active = data.active
                })
            }
        }),
        onSuccess: () => {
            setSaved(true)
            if (isNew) {
                router.replace(orgHref('calendar-slots'))
            }
        },
    })

    const handleSave = handleSubmit(data => {
        saveMutation.mutate(data)
    })

    const deleteMutation = useMutation({
        mutationFn: mutation(function* () {
            yield pagesCollection.delete(id)
        }),
        onSuccess: () => {
            router.replace(orgHref('calendar-slots'))
        },
    })

    if (!isNew && !page) {
        return (
            <View className="flex-1 bg-background items-center justify-center">
                <Text style={{ color: muted }}>Loading...</Text>
            </View>
        )
    }

    return (
        <View className="flex-1 bg-background">
            <Stack.Screen options={{ title: isNew ? 'New Booking Page' : page?.name || '' }} />
            <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
                <View className="p-4 gap-6">
                    <View className="bg-card border border-border rounded-xl p-4 gap-3">
                        <View className="flex-row items-start gap-3">
                            <View style={{ flex: 2, minWidth: 0 }}>
                                <TextInput
                                    control={control}
                                    name="name"
                                    label="Page Name"
                                    placeholder="e.g. Jane's Haircuts"
                                />
                            </View>
                            <View style={{ flex: 1, minWidth: 0 }}>
                                <TextInput
                                    control={control}
                                    name="slug"
                                    label="URL Slug"
                                    placeholder="janes-haircuts"
                                />
                            </View>
                        </View>

                        <View className="flex-row items-center gap-3">
                            <View style={{ flex: 2, minWidth: 0 }}>
                                <BookingUrlRow orgSlug={orgSlug} slug={watch('slug')} />
                            </View>
                            <View style={{ flex: 1, minWidth: 0 }}>
                                <Toggle
                                    control={control}
                                    name="active"
                                    label="Active"
                                    wrapperProps={{ style: { marginBottom: 0 } }}
                                />
                            </View>
                        </View>
                    </View>

                    <TextAreaInput
                        control={control}
                        name="intro_text"
                        label="Intro Text"
                        placeholder="Welcome! Pick a time below..."
                        numberOfLines={3}
                    />

                    <Pressable
                        onPress={handleSave}
                        className="bg-primary px-6 py-3 rounded-xl items-center"
                    >
                        <Text
                            className="text-primary-foreground"
                            style={{ fontSize: 15, fontWeight: '600' }}
                        >
                            {saveMutation.isPending ? 'Saving...' : 'Save Page'}
                        </Text>
                    </Pressable>

                    {saved && (
                        <Text style={{ color: '#22c55e', fontSize: 14, textAlign: 'center' }}>
                            Saved!
                        </Text>
                    )}

                    {saveMutation.error && (
                        <Text style={{ color: '#ef4444', fontSize: 13, textAlign: 'center' }}>
                            {String(saveMutation.error)}
                        </Text>
                    )}

                    {!isNew && (
                        <>
                            <View className="h-px bg-border my-2" />

                            <Text style={{ color: fg, fontSize: 18, fontWeight: '600' }}>
                                Appointment Types
                            </Text>
                            <SlotTypeEditor pageId={id} />

                            <View className="h-px bg-border my-2" />

                            <Text style={{ color: fg, fontSize: 18, fontWeight: '600' }}>
                                Availability
                            </Text>
                            <AvailabilityEditor pageId={id} />

                            <View className="h-px bg-border my-2" />

                            {page && <BookingRulesEditor pageId={id} page={page} />}

                            <View className="h-px bg-border my-2" />

                            <Pressable
                                onPress={() => deleteMutation.mutate()}
                                className="border border-red-500 px-6 py-3 rounded-xl items-center"
                            >
                                <Text style={{ color: '#ef4444', fontSize: 14, fontWeight: '600' }}>
                                    {deleteMutation.isPending ? 'Deleting...' : 'Delete Page'}
                                </Text>
                            </Pressable>
                        </>
                    )}
                </View>
            </ScrollView>
        </View>
    )
}
