import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, CheckCircle2, Loader } from 'lucide-react'
import { preferenceService, type DanhMucSoThich } from '../services/preferenceService'

type Step = 'categories' | 'preferences' | 'confirm'

interface StepState {
  selectedCategoryId: string | null
  selectedPreferenceIds: Set<string>
}

export function OnboardingPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('categories')
  const [categories, setCategories] = useState<DanhMucSoThich[]>([])
  const [state, setState] = useState<StepState>({
    selectedCategoryId: null,
    selectedPreferenceIds: new Set(),
  })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load categories on mount
  useEffect(() => {
    const loadCategories = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await preferenceService.getCategories()
        setCategories(data)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Không thể tải danh sách sở thích'
        )
      } finally {
        setLoading(false)
      }
    }

    void loadCategories()
  }, [])

  const currentCategory = useMemo(() => {
    return categories.find((c) => c.id === state.selectedCategoryId)
  }, [categories, state.selectedCategoryId])

  const selectedPreferences = useMemo(() => {
    return (currentCategory?.danhSachSoThich ?? []).filter((p) =>
      state.selectedPreferenceIds.has(p.id)
    )
  }, [currentCategory, state.selectedPreferenceIds])

  const handleSelectCategory = (categoryId: string) => {
    setState({
      selectedCategoryId: categoryId,
      selectedPreferenceIds: new Set(),
    })
  }

  const handleTogglePreference = (preferenceId: string) => {
    const newIds = new Set(state.selectedPreferenceIds)
    if (newIds.has(preferenceId)) {
      newIds.delete(preferenceId)
    } else {
      newIds.add(preferenceId)
    }
    setState((current) => ({
      ...current,
      selectedPreferenceIds: newIds,
    }))
  }

  const handleNext = () => {
    if (step === 'categories') {
      if (!state.selectedCategoryId) {
        setError('Vui lòng chọn một danh mục')
        return
      }
      setStep('preferences')
    } else if (step === 'preferences') {
      if (state.selectedPreferenceIds.size === 0) {
        setError('Vui lòng chọn ít nhất một sở thích')
        return
      }
      setStep('confirm')
    }
    setError(null)
  }

  const handleBack = () => {
    if (step === 'preferences') {
      setStep('categories')
    } else if (step === 'confirm') {
      setStep('preferences')
    }
    setError(null)
  }

  const handleSubmit = async () => {
    try {
      setSubmitting(true)
      setError(null)
      const preferenceIds = Array.from(state.selectedPreferenceIds)
      await preferenceService.updateUserPreferences(preferenceIds)
      // Redirect to home after successful submission
      navigate('/', { replace: true })
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Không thể lưu sở thích. Vui lòng thử lại.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  const handleSkip = () => {
    navigate('/', { replace: true })
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <Loader className="mx-auto mb-4 h-12 w-12 animate-spin text-primary" />
          <p className="text-on-surface-variant">Đang tải...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="border-b border-outline-variant/20 bg-white/50 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
          <h1 className="font-display text-2xl font-bold text-primary">TraVi</h1>
          <button
            onClick={handleSkip}
            className="text-sm font-medium text-on-surface-variant hover:text-on-surface"
          >
            Bỏ qua
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-2xl">
          {/* Progress indicator */}
          <div className="mb-8 flex items-center justify-center gap-2">
            {['categories', 'preferences', 'confirm'].map((s, i) => (
              <div key={s} className="flex items-center">
                <div
                  className={`h-2 w-8 rounded-full transition-all ${
                    step === s
                      ? 'bg-primary'
                      : ['categories', 'preferences', 'confirm'].indexOf(s) <
                          ['categories', 'preferences', 'confirm'].indexOf(step)
                        ? 'bg-primary/30'
                        : 'bg-outline-variant/30'
                  }`}
                />
                {i < 2 && <div className="mx-2 h-1 w-4 bg-outline-variant/20" />}
              </div>
            ))}
          </div>

          {/* Step content with fade animation */}
          <div className="relative min-h-96 overflow-hidden rounded-2xl bg-white p-8 shadow-lg">
            {error && (
              <div className="mb-6 rounded-lg bg-error-container p-4 text-error">
                {error}
              </div>
            )}

            {/* Step: Select Category */}
            <div
              className={`transition-all duration-500 ${
                step === 'categories'
                  ? 'opacity-100'
                  : 'pointer-events-none absolute opacity-0'
              }`}
            >
              <h2 className="mb-2 font-display text-2xl font-bold text-on-surface">
                Chọn sở thích của bạn
              </h2>
              <p className="mb-6 text-on-surface-variant">
                Giúp TraVi hiểu rõ hơn về các sở thích của bạn để đề xuất tốt hơn
              </p>

              <div className="space-y-3">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => handleSelectCategory(category.id)}
                    className={`w-full rounded-xl border-2 p-4 text-left transition-all ${
                      state.selectedCategoryId === category.id
                        ? 'border-primary bg-primary/5'
                        : 'border-outline-variant/40 bg-surface hover:border-primary/50'
                    }`}
                  >
                    <h3 className="font-semibold text-on-surface">
                      {category.tenDanhMuc}
                    </h3>
                    {category.moTa && (
                      <p className="mt-1 text-sm text-on-surface-variant">
                        {category.moTa}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Step: Select Preferences */}
            <div
              className={`transition-all duration-500 ${
                step === 'preferences'
                  ? 'opacity-100'
                  : 'pointer-events-none absolute opacity-0'
              }`}
            >
              <h2 className="mb-2 font-display text-2xl font-bold text-on-surface">
                {currentCategory?.tenDanhMuc}
              </h2>
              <p className="mb-6 text-on-surface-variant">
                Chọn những sở thích bạn quan tâm nhất
              </p>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {(currentCategory?.danhSachSoThich ?? []).map((preference) => (
                  <button
                    key={preference.id}
                    onClick={() => handleTogglePreference(preference.id)}
                    className={`rounded-lg border-2 p-4 text-center transition-all ${
                      state.selectedPreferenceIds.has(preference.id)
                        ? 'border-primary bg-primary/10 font-semibold text-primary'
                        : 'border-outline-variant/40 bg-surface text-on-surface hover:border-primary/50'
                    }`}
                  >
                    {preference.tenSoThich}
                  </button>
                ))}
              </div>
            </div>

            {/* Step: Confirm */}
            <div
              className={`transition-all duration-500 ${
                step === 'confirm'
                  ? 'opacity-100'
                  : 'pointer-events-none absolute opacity-0'
              }`}
            >
              <div className="text-center">
                <CheckCircle2 className="mx-auto mb-4 h-16 w-16 text-primary" />
                <h2 className="mb-2 font-display text-2xl font-bold text-on-surface">
                  Xác nhận sở thích
                </h2>
                <p className="mb-8 text-on-surface-variant">
                  Bạn đã chọn {selectedPreferences.length} sở thích từ danh mục{' '}
                  <span className="font-semibold text-primary">
                    {currentCategory?.tenDanhMuc}
                  </span>
                </p>

                <div className="mb-8 rounded-lg bg-surface-container-low p-4">
                  <div className="flex flex-wrap gap-2 justify-center">
                    {selectedPreferences.map((pref) => (
                      <span
                        key={pref.id}
                        className="rounded-full border border-primary bg-primary/10 px-3 py-1 text-sm font-medium text-primary"
                      >
                        {pref.tenSoThich}
                      </span>
                    ))}
                  </div>
                </div>

                <p className="mb-6 text-sm text-on-surface-variant">
                  Bạn có thể thay đổi sở thích này bất cứ lúc nào trong cài đặt
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="mt-8 flex gap-4">
              {step !== 'categories' && (
                <button
                  onClick={handleBack}
                  disabled={submitting}
                  className="flex-1 rounded-xl border border-outline px-6 py-3 font-semibold text-on-surface transition-colors hover:bg-surface-container-low disabled:opacity-60"
                >
                  Quay lại
                </button>
              )}

              {step !== 'confirm' ? (
                <button
                  onClick={handleNext}
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold text-on-primary transition-colors hover:bg-primary-container disabled:opacity-60"
                >
                  Tiếp tục
                  <ChevronRight size={18} />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold text-on-primary transition-colors hover:bg-primary-container disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <Loader size={18} className="animate-spin" />
                      Đang lưu...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={18} />
                      Xác nhận
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
