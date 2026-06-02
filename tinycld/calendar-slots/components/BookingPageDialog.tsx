import { mutation, useMutation } from '@tinycld/core/lib/mutations'
import { newRecordId } from 'pbtsdb/core'
import { useBreakpoint } from '@tinycld/core/components/workspace/useBreakpoint'
import { useOrgSlug } from '@tinycld/core/lib/use-org-slug'
import { useStore } from '@tinycld/core/lib/pocketbase'
import { useOrgLiveQuery } from '@tinycld/core/lib/use-org-live-query'
import { useThemeColor } from '@tinycld/core/lib/use-app-theme'
import { SuretyGuard } from '@tinycld/core/components/SuretyGuard'
import { handleMutationErrorsWithForm } from '@tinycld/core/lib/errors'
import { useCurrentUserOrg } from '@tinycld/core/lib/use-current-user-org'
import { useOrgInfo } from '@tinycld/core/lib/use-org-info'
import { FormErrorSummary, TextInput, Toggle, TextAreaInput } from '@tinycld/core/ui/form'
import { Modal, ModalBackdrop, ModalContent } from '@tinycld/core/ui/modal'
import { X } from 'lucide-react-native'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { AvailabilityEditor } from './AvailabilityEditor'
import { BookingRulesEditor } from './BookingRulesEditor'
import { BookingUrlRow } from './BookingUrlRow'
import { SlotTypeEditor } from './SlotTypeEditor'
import { useBookingPageDialogStore } from '../stores/booking-page-dialog-store'

function generateSlug(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
}

export function BookingPageDialog() {
    const fg = useThemeColor('foreground')
    const muted = useThemeColor('muted-foreground')
    const orgSlug = useOrgSlug()
    const { orgId } = useOrgInfo()
    const userOrg = useCurrentUserOrg(orgSlug)
    const [pagesCollection] = useStore('booking_pages')
    const isMobile = useBreakpoint() === 'mobile'

    const { isOpen, pageId, close, setPageId } = useBookingPageDialogStore()
    const isNew = pageId === null
    const pendingNewId = useRef<string | null>(null)
    const [shouldScrollToTypes, setShouldScrollToTypes] = useState(false)
    const scrollViewRef = useRef<ScrollView>(null)

    const appointmentTypesRef = useRef<View>(null)

    const { data: pages } = useOrgLiveQuery(
        (query, _org) => {
            if (isNew) return null
            return query.from({ p: pagesCollection })
        },
        [isNew, pageId]
    )

    const page = pages?.find(p => p.id === pageId) ?? null

    const {
        control,
        handleSubmit,
        watch,
        setValue,
        reset,
        setError,
        getValues,
        formState: { errors, isSubmitted },
    } = useForm({
        defaultValues: {
            name: '',
            slug: '',
            intro_text: '',
            active: true,
        },
    })

    const nameValue = watch('name')

    useEffect(() => {
        if (isOpen) {
            if (page) {
                setValue('name', page.name)
                setValue('slug', page.slug)
                setValue('intro_text', page.intro_text || '')
                setValue('active', page.active ?? true)
            } else {
                reset({ name: '', slug: '', intro_text: '', active: true })
            }
        }
    }, [isOpen, page, setValue, reset])

    useEffect(() => {
        if (isNew && nameValue) {
            setValue('slug', generateSlug(nameValue))
        }
    }, [isNew, nameValue, setValue])

    useEffect(() => {
        if (!isNew && shouldScrollToTypes && page) {
            setShouldScrollToTypes(false)
            setTimeout(() => {
                if (appointmentTypesRef.current && scrollViewRef.current) {
                    appointmentTypesRef.current.measureLayout(
                        scrollViewRef.current.getInnerViewNode(),
                        (_x, y) => {
                            scrollViewRef.current?.scrollTo({ y: y - 16, animated: true })
                        },
                        () => {}
                    )
                }
            }, 300)
        }
    }, [isNew, page, shouldScrollToTypes])

    const saveMutation = useMutation({
        mutationFn: mutation(function* (data: {
            name: string
            slug: string
            intro_text: string
            active: boolean
        }) {
            if (isNew) {
                if (!orgId || !userOrg) throw new Error('No organization context')
                const newId = newRecordId()
                pendingNewId.current = newId
                yield pagesCollection.insert({
                    id: newId,
                    ...data,
                    org: orgId,
                    owner: userOrg.id,
                    min_notice_hours: 0,
                    booking_window: '' as any,
                    booking_rolling_days: 0,
                    booking_date_from: '',
                    booking_date_to: '',
                    max_bookings_count: 0,
                    max_bookings_period: '' as any,
                })
            } else {
                yield pagesCollection.update(pageId!, (draft) => {
                    draft.name = data.name
                    draft.slug = data.slug
                    draft.intro_text = data.intro_text
                    draft.active = data.active
                })
            }
        }),
        onSuccess: () => {
            if (pendingNewId.current) {
                setShouldScrollToTypes(true)
                setPageId(pendingNewId.current)
                pendingNewId.current = null
            }
        },
        onError: handleMutationErrorsWithForm({ setError, getValues }),
    })

    const handleSave = handleSubmit((data) => {
        saveMutation.mutate(data)
    })

    const deleteMutation = useMutation({
        mutationFn: mutation(function* () {
            yield pagesCollection.delete(pageId!)
        }),
        onSuccess: () => {
            close()
        },
    })

    if (!isOpen) return null
    if (!isNew && !page) return null

    return (
        <Modal isOpen={isOpen} onClose={close}>
            <ModalBackdrop />
            <ModalContent className="max-w-140 w-[95vw] max-h-[90vh] p-0 rounded-xl">
                <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
                    <Text className="text-lg font-semibold text-foreground">
                        {isNew ? 'New Booking Page' : page?.name || ''}
                    </Text>
                    <Pressable onPress={close} className="p-1">
                        <X size={18} color={muted} />
                    </Pressable>
                </View>

                <ScrollView ref={scrollViewRef} className="flex-1" keyboardShouldPersistTaps="handled">
                    <View className="p-4 gap-6">
                        <FormErrorSummary errors={errors} isEnabled={isSubmitted} />

                        <View className="bg-card border border-border rounded-xl p-4 gap-3">
                            <View className={isMobile ? 'flex-col gap-3' : 'flex-row items-start gap-3'}>
                                <View style={{ flex: 1, minWidth: 0 }}>
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

                            <View className={isMobile ? 'flex-col gap-3' : 'flex-row items-center gap-3'}>
                                <View style={{ flex: 1, minWidth: 0 }}>
                                    <BookingUrlRow orgSlug={orgSlug} slug={watch('slug')} />
                                </View>
                                <View style={{ width: 100 }}>
                                    <Toggle control={control} name="active" label="Active" wrapperProps={{ style: { marginBottom: 0 } }} />
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

                        {!isNew && (
                            <>
                                <View ref={appointmentTypesRef}>
                                    <View className="h-px bg-border my-2" />

                                    <Text style={{ color: fg, fontSize: 18, fontWeight: '600' }}>
                                        Appointment Types
                                    </Text>
                                </View>
                                <SlotTypeEditor pageId={pageId!} />

                                <View className="h-px bg-border my-2" />

                                <Text style={{ color: fg, fontSize: 18, fontWeight: '600' }}>
                                    Availability
                                </Text>
                                <AvailabilityEditor pageId={pageId!} />

                                <View className="h-px bg-border my-2" />

                                {page && <BookingRulesEditor pageId={pageId!} page={page} />}

                            </>
                        )}

                        <View className="gap-2">
                            {!isNew && (
                                <SuretyGuard
                                    message={`Are you sure you want to delete "${page?.name || 'this booking page'}"? This cannot be undone.`}
                                    confirmLabel="Delete"
                                    onConfirmed={() => deleteMutation.mutateAsync()}
                                >
                                    {onOpen => (
                                        <Pressable
                                            onPress={onOpen}
                                            className="border border-red-500 px-6 py-3 rounded-xl items-center"
                                        >
                                            <Text style={{ color: '#ef4444', fontSize: 14, fontWeight: '600' }}>
                                                {deleteMutation.isPending ? 'Deleting...' : 'Delete Page'}
                                            </Text>
                                        </Pressable>
                                    )}
                                </SuretyGuard>
                            )}

                            <Pressable
                                onPress={handleSave}
                                className="bg-primary px-6 py-3 rounded-xl items-center"
                            >
                                <Text className="text-primary-foreground" style={{ fontSize: 15, fontWeight: '600' }}>
                                    {saveMutation.isPending ? 'Saving...' : 'Save Page'}
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </ScrollView>
            </ModalContent>
        </Modal>
    )
}
