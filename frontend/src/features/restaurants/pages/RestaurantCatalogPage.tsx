// Trang thuộc module nhà hàng. File được đặt trong features/restaurants để gom UI, hook, service và type cùng miền nghiệp vụ.
import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Heart, Map, MapPin } from 'lucide-react'
import { AuthActions } from '../../../components/layout/AuthActions'
import { UserAiRecommendations } from '../../ai'
import { CatalogSearchBar } from '../../catalog/components'
import { useAuth } from '../../../hooks/useAuth'
import { useQueryParams } from '../../../hooks/useQueryParams'
import { useRestaurantSearch } from '../hooks/useRestaurantSearch'
import { getRestaurantFilterOptions } from '../services/restaurantService'
import type { RestaurantCatalog } from '../types'
import type { FilterOption } from '../../hotels/types'
import { formatFilterLabel, formatPriceBounds } from '../../../utils/display'
import {
  clearSearchCriteria,
  readSearchCriteria,
  RESTAURANT_SEARCH_CRITERIA_KEY,
  writeSearchCriteria,
} from '../../catalog/utils/searchCriteriaMemory'

// ─── Helpers ─────────────────────────────────────────────────
function toggleItem(list: string[], item: string): string[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item]
}

function getVisiblePageNumbers(currentPage: number, totalPages: number) {
  const maxButtons = 7
  if (totalPages <= maxButtons) {
    return Array.from({ length: totalPages }, (_, i) => i)
  }

  let start = Math.max(0, currentPage - 3)
  const end = Math.min(totalPages - 1, start + maxButtons - 1)
  start = Math.max(0, end - maxButtons + 1)

  const result: number[] = []
  for (let i = start; i <= end; i += 1) {
    result.push(i)
  }
  return result
}

type RestaurantHeaderForm = {
  city: string
  date: string
  time: string
  guests: number
}

// ─── Component ───────────────────────────────────────────────
export function RestaurantCatalogPage() {
  const { query, getString, getNumber, getCsvArray, setQuery } = useQueryParams()
  const { isAuthenticated, user } = useAuth()
  const [cuisineOptions, setCuisineOptions] = useState<FilterOption[]>([])
  const [amenityOptions, setAmenityOptions] = useState<FilterOption[]>([])
  const isCustomer = String(user?.role ?? '').replace(/^ROLE[_-]/, '').toUpperCase() === 'KHACH_HANG'

  const city = getString('city')
  const keyword = getString('keyword')
  const date = getString('date')
  const time = getString('time')
  const guests = Math.max(1, getNumber('guests', 4))
  const minPrice = Math.max(0, getNumber('minPrice', 0))
  const maxPrice = Math.max(0, getNumber('maxPrice', 0))
  const cuisineTypes = getCsvArray('cuisine')
  const amenities = getCsvArray('amenities')
  const rating = Math.max(0, getNumber('rating', 0))
  const sort = getString('sort', 'popular')
  const page = Math.max(0, getNumber('page', 0))
  const size = Math.min(50, Math.max(1, getNumber('size', 10)))
  const savedHeaderCriteria = useMemo(
    () => (query.toString() ? null : readSearchCriteria(RESTAURANT_SEARCH_CRITERIA_KEY)),
    [query],
  )

  const searchParams = useMemo(
    () => ({
      city,
      keyword,
      date,
      time,
      guests,
      cuisine: cuisineTypes,
      amenities,
      minPrice: minPrice > 0 ? minPrice : undefined,
      maxPrice: maxPrice > 0 ? maxPrice : undefined,
      rating: rating > 0 ? rating : undefined,
      sort:
        sort === 'priceAsc'
          ? 'price_asc'
          : sort === 'priceDesc'
            ? 'price_desc'
            : sort === 'ratingDesc'
              ? 'rating_desc'
              : 'popular_desc',
      page,
      size,
    }),
    [amenities, city, cuisineTypes, date, guests, keyword, maxPrice, minPrice, page, rating, size, sort, time],
  )

  const { data, loading, error, refetch } = useRestaurantSearch(searchParams, { enabled: !savedHeaderCriteria })

  const headerSearch = useMemo<RestaurantHeaderForm>(() => ({
    city,
    date,
    time,
    guests,
  }), [city, date, guests, time])
  const [headerForm, setHeaderForm] = useState<RestaurantHeaderForm>(headerSearch)

  useEffect(() => {
    if (!savedHeaderCriteria) {
      return
    }

    setQuery({ ...savedHeaderCriteria, page: 0, size }, { replace: true })
  }, [savedHeaderCriteria, setQuery, size])

  useEffect(() => {
    setHeaderForm(headerSearch)
  }, [headerSearch])

  useEffect(() => {
    let mounted = true

    const loadFilterOptions = async () => {
      try {
        const options = await getRestaurantFilterOptions()
        if (!mounted) {
          return
        }
        setCuisineOptions(options.cuisines)
        setAmenityOptions(options.amenities)
      } catch (loadError) {
        console.error(loadError)
      }
    }

    void loadFilterOptions()
    return () => {
      mounted = false
    }
  }, [])

  const handleHeaderSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const nextCriteria = {
      city: headerForm.city,
      date: headerForm.date,
      time: headerForm.time,
      guests: Math.max(1, headerForm.guests || 1),
    }

    writeSearchCriteria(RESTAURANT_SEARCH_CRITERIA_KEY, nextCriteria)
    setQuery({
      city: nextCriteria.city || null,
      date: nextCriteria.date || null,
      time: nextCriteria.time || null,
      guests: nextCriteria.guests,
      page: 0,
      size,
    }, { resetPage: true })
  }

  const handleHeaderCriteriaClear = () => {
    clearSearchCriteria(RESTAURANT_SEARCH_CRITERIA_KEY)
    setHeaderForm({
      city: '',
      date: '',
      time: '',
      guests: 4,
    })
    setQuery({
      city: null,
      date: null,
      time: null,
      guests: null,
      cuisine: null,
      page: 0,
      size,
      sort: 'popular',
    }, { resetPage: true })
  }

  const hasCatalogCriteria = Boolean(
    city ||
    keyword ||
    date ||
    time ||
    cuisineTypes.length > 0 ||
    minPrice > 0 ||
    maxPrice > 0 ||
    amenities.length > 0 ||
    rating > 0,
  )
  const currentPage = data?.page ?? page
  const totalPages = data?.totalPages ?? 1
  const restaurants: RestaurantCatalog[] = data?.content ?? []
  const pageNumbers = getVisiblePageNumbers(currentPage, totalPages)

  const resultsTitle = hasCatalogCriteria ? `Nhà hàng tại ${city || 'Việt Nam'}` : 'Nhà hàng phổ biến'

  // ─── Render ───────────────────────────────────────────────
  return (
    <div className="flex min-h-screen flex-col bg-surface font-sans text-on-surface antialiased">

      {/* ── Navbar ── */}
      <header className="sticky top-0 z-50 border-b border-outline-variant/30 bg-white/60 shadow-sm backdrop-blur-xl">
        <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between gap-6 px-5 md:px-12">

          {/* Left: Logo + Search */}
          <div className="flex items-center gap-6">
            <Link to="/" className="shrink-0 cursor-pointer font-display text-2xl font-bold text-primary">TraVi</Link>
            <CatalogSearchBar
              mode="restaurants"
              form={headerForm}
              onChange={(form) => {
                setHeaderForm(form)
              }}
	              onSubmit={handleHeaderSearchSubmit}
	              onClear={handleHeaderCriteriaClear}
	            />
          </div>

          {/* Center: Nav */}
          <nav className="hidden shrink-0 items-center gap-1 text-sm font-semibold xl:flex">
            <Link to="/hotels" className="cursor-pointer rounded-lg px-3 py-2 text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary">Khách sạn</Link>
            <Link to="/restaurants" className="cursor-pointer border-b-2 border-primary px-3 py-2 text-primary">Nhà hàng</Link>
            <Link to="/search" className="cursor-pointer rounded-lg px-3 py-2 text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary">Tra cứu</Link>
          </nav>

          {/* Right: Auth */}
          <AuthActions />
        </div>
      </header>

      {/* ── Main grid ── */}
      <div className="mx-auto w-full max-w-7xl flex-1 px-5 py-8 md:px-12 lg:grid lg:grid-cols-12 lg:gap-8">

        {/* ── Sidebar ── */}
        <aside className="mb-6 lg:col-span-3 lg:mb-0">
          <div className="space-y-6 rounded-2xl border border-outline-variant/40 bg-surface-container-lowest p-5 shadow-sm lg:sticky lg:top-28 lg:max-h-[calc(100vh-9rem)] lg:overflow-y-auto">
            <div className="flex items-center justify-between border-b border-outline-variant/30 pb-4">
              <h2 className="font-display text-xl font-bold text-on-surface">Bộ lọc</h2>
              <button
                type="button"
                onClick={() =>
                  setQuery({
                    city: city || null,
                    date: date || null,
                    time: time || null,
                    guests,
                    page: 0,
                    size,
                    sort: 'popular',
                    keyword: null,
                    cuisine: null,
                    minPrice: null,
                    maxPrice: null,
                    amenities: null,
                    rating: null,
                  })
                }
                className="cursor-pointer text-sm font-semibold text-secondary hover:underline">Xóa tất cả</button>
            </div>

            {/* Cuisine type */}
            <div className="space-y-2.5">
              <h3 className="text-sm font-semibold text-on-surface">Loại ẩm thực</h3>
              {cuisineOptions.map((option) => (
                <label key={option.id} className="flex cursor-pointer items-center gap-2.5">
                  <input type="checkbox" checked={cuisineTypes.includes(option.id)}
                    onChange={() => {
                      const next = toggleItem(cuisineTypes, option.id)
                      setQuery({ cuisine: next.length ? next.join(',') : null }, { resetPage: true })
                    }}
                    className="h-4 w-4 rounded border-outline-variant accent-primary"
                  />
                  <span className="text-sm text-on-surface-variant">{formatFilterLabel(option.name)}</span>
                </label>
              ))}
            </div>

            {/* Price */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-on-surface">Khoảng giá / khách</h3>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs text-on-surface-variant">
                  Từ (VNĐ)
                  <input type="number" min={0} value={minPrice || ''} placeholder="0"
                    onChange={(e) => setQuery({ minPrice: e.target.value || null }, { resetPage: true })}
                    className="mt-1 w-full rounded-lg border border-outline-variant/60 px-2.5 py-1.5 text-sm focus:border-primary focus:outline-none" />
                </label>
                <label className="text-xs text-on-surface-variant">
                  Đến (VNĐ)
                  <input type="number" min={0} value={maxPrice || ''} placeholder="1000000"
                    onChange={(e) => setQuery({ maxPrice: e.target.value || null }, { resetPage: true })}
                    className="mt-1 w-full rounded-lg border border-outline-variant/60 px-2.5 py-1.5 text-sm focus:border-primary focus:outline-none" />
                </label>
              </div>
              <p className="text-xs font-medium text-primary">{formatPriceBounds(minPrice, maxPrice)}</p>
            </div>

            {/* Amenities */}
            <div className="space-y-2.5">
              <h3 className="text-sm font-semibold text-on-surface">Tiện ích</h3>
              {amenityOptions.map((option) => (
                <label key={option.id} className="flex cursor-pointer items-center gap-2.5">
                  <input type="checkbox" checked={amenities.includes(option.id)}
                    onChange={() => {
                      const next = toggleItem(amenities, option.id)
                      setQuery({ amenities: next.length ? next.join(',') : null }, { resetPage: true })
                    }}
                    className="h-4 w-4 rounded border-outline-variant accent-primary"
                  />
                  <span className="text-sm text-on-surface-variant">{formatFilterLabel(option.name)}</span>
                </label>
              ))}
            </div>

            {/* Review score */}
            <div className="space-y-2.5">
              <h3 className="text-sm font-semibold text-on-surface">Điểm đánh giá</h3>
              {[{ label: 'Xuất sắc (4.5+)', val: 4.5 }, { label: 'Rất tốt (4.0+)', val: 4 }, { label: 'Tốt (3.5+)', val: 3.5 }].map((opt) => (
                <label key={opt.val} className="flex cursor-pointer items-center gap-2.5">
                  <input type="radio" name="rst-review" checked={rating === opt.val}
                    onChange={() => setQuery({ rating: String(opt.val) }, { resetPage: true })}
                    className="h-4 w-4 accent-primary"
                  />
                  <span className="text-sm text-on-surface-variant">{opt.label}</span>
                </label>
              ))}
              {rating > 0 && (
                <button type="button" onClick={() => setQuery({ rating: null }, { resetPage: true })} className="cursor-pointer text-xs font-medium text-secondary hover:underline">Bỏ chọn</button>
              )}
            </div>

            {/* Map */}
            <button type="button" className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-outline-variant/50 px-4 py-2.5 text-sm font-semibold text-on-surface-variant transition-colors hover:border-primary hover:text-primary">
              <Map size={15} /> Xem trên bản đồ
            </button>
          </div>
        </aside>

        {/* ── Results ── */}
        <section className="space-y-5 lg:col-span-9">
          {isCustomer && (
            <UserAiRecommendations enabled={isAuthenticated && isCustomer} type="RESTAURANT" city={city} />
          )}

          {/* Sort header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="font-display text-2xl font-bold text-on-surface">{resultsTitle}</h1>
              <p className="mt-1 text-sm text-on-surface-variant">{data?.totalElements ?? 0} kết quả được tìm thấy</p>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Sắp xếp theo</span>
              <select value={sort} onChange={(e) => setQuery({ sort: e.target.value }, { resetPage: true })}
                className="cursor-pointer rounded-lg border border-outline-variant/60 bg-surface-container-lowest px-3 py-2 text-sm font-medium text-on-surface focus:border-primary focus:outline-none">
                <option value="popular">Phổ biến nhất</option>
                <option value="ratingDesc">Đánh giá cao nhất</option>
                <option value="priceAsc">Giá tăng dần</option>
                <option value="priceDesc">Giá giảm dần</option>
              </select>
            </div>
          </div>

          {/* Loading skeleton */}
          {loading && restaurants.length === 0 && (
            <div className="space-y-4">
              {[1,2,3].map((i) => (
                <div key={i} className="flex h-56 animate-pulse overflow-hidden rounded-2xl border border-outline-variant/30 bg-surface-container-lowest">
                  <div className="w-2/5 bg-surface-container-high" />
                  <div className="flex-1 space-y-3 p-5">
                    <div className="h-3 w-24 rounded bg-surface-container-high" />
                    <div className="h-5 w-3/4 rounded bg-surface-container-high" />
                    <div className="h-3 w-1/2 rounded bg-surface-container-high" />
                    <div className="mt-4 h-3 w-1/3 rounded bg-surface-container-high" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-2xl border border-error-container bg-error-container/30 p-6">
              <p className="font-semibold text-error">{error}</p>
              <button type="button" onClick={() => { void refetch() }}
                className="mt-4 cursor-pointer rounded-xl bg-error px-5 py-2 text-sm font-bold text-on-error hover:opacity-90">Thử lại</button>
            </div>
          )}

          {/* Empty */}
          {!loading && !error && restaurants.length === 0 && (
            <div className="rounded-2xl border border-outline-variant/40 bg-surface-container-lowest p-8 text-center">
              <p className="font-display text-xl font-bold text-on-surface">Rất tiếc, không tìm thấy kết quả phù hợp.</p>
              <p className="mt-2 text-sm text-on-surface-variant">Hãy thử:</p>
              <ul className="mt-3 space-y-1 text-sm text-on-surface-variant">
                <li>• Thử đổi ngày hoặc giờ dùng bữa</li>
                <li>• Tăng khoảng giá tìm kiếm</li>
                <li>• Chọn khu vực khác</li>
                <li>• Giảm số lượng khách</li>
              </ul>
            </div>
          )}

          {/* Cards */}
          {!loading && !error && restaurants.length > 0 && (
            <>
              <div className="space-y-4">
                {restaurants.map((rst) => (
                  <article key={rst.id} className="overflow-hidden rounded-2xl border border-outline-variant/40 bg-surface-container-lowest shadow-sm transition-all duration-300 hover:shadow-[0_8px_24px_rgba(20,83,45,0.08)]">
                    <div className="flex flex-col sm:flex-row">
                      {/* Image */}
                      <div className="relative h-56 shrink-0 overflow-hidden sm:h-auto sm:w-2/5">
                        <img src={rst.thumbnailUrl || ''} alt={rst.name} loading="lazy" className="h-full w-full object-cover" />
                        <button type="button" className="absolute right-3 top-3 cursor-pointer rounded-full bg-white/80 p-2 text-on-surface-variant backdrop-blur-sm transition hover:text-error">
                          <Heart size={15} />
                        </button>
                      </div>

                      {/* Info */}
                      <div className="flex flex-1 flex-col justify-between p-5">
                        <div>
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h2 className="font-display text-xl font-bold text-on-surface">{rst.name}</h2>
                              <p className="mt-1 flex items-center gap-1 text-sm text-on-surface-variant">
                                <MapPin size={13} />{rst.district || rst.address}
                              </p>
                              <p className="mt-1.5 text-sm font-medium text-on-surface-variant">{rst.cuisine}</p>
                            </div>
                            <div className="min-w-17 shrink-0 rounded-xl bg-surface-container-low px-3 py-2 text-center">
                              <p className="font-display text-2xl font-bold text-primary">{rst.rating.toFixed(1)}</p>
                              <p className="text-xs text-on-surface-variant">{rst.reviewCount} đánh giá</p>
                            </div>
                          </div>

                          {/* Amenities chips */}
                          <div className="mt-4 flex flex-wrap gap-2">
                            {rst.amenityHighlights.slice(0, 2).map((a) => (
                              <span key={a} className="flex items-center gap-1 rounded-full border border-outline-variant/50 bg-surface px-3 py-1 text-xs text-on-surface-variant">
                                {a}
                              </span>
                            ))}
                          </div>

                          {/* Seats */}
                          <p className="mt-3 text-sm text-on-surface-variant">
                            Số ghế còn trống: <span className="font-semibold text-on-surface">{rst.availableSeats} ghế</span>
                          </p>
                        </div>

                        {/* CTA */}
                        <div className="mt-5 flex items-end justify-between border-t border-outline-variant/30 pt-4">
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">
                              Khoảng giá
                            </p>
                            <p className="mt-1 font-display text-lg font-semibold leading-relaxed text-primary">
                              {rst.priceRange}
                            </p>
                          </div>
                          <Link
                            to={`/restaurants/${rst.id}?${new URLSearchParams({
                              date,
                              time,
                              guests: String(guests),
                            }).toString()}`}
                            className="cursor-pointer rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-on-primary shadow-sm transition hover:bg-primary-container"
                          >
                            Xem chi tiết
                          </Link>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              {totalPages > 1 && (
                <nav className="flex items-center justify-center gap-1.5 pt-2">
                  <button
                    type="button"
                    disabled={currentPage <= 0}
                    onClick={() => setQuery({ page: Math.max(0, currentPage - 1), size })}
                    className="cursor-pointer rounded-lg border border-outline-variant/50 p-2 text-on-surface-variant transition hover:bg-surface-container-low disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  {pageNumbers.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setQuery({ page: p, size })}
                      className={`flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg text-sm font-bold transition ${p === currentPage ? 'bg-primary text-on-primary shadow-sm' : 'border border-outline-variant/50 text-on-surface hover:bg-surface-container-low'}`}
                    >
                      {p + 1}
                    </button>
                  ))}
                  <button
                    type="button"
                    disabled={currentPage >= totalPages - 1}
                    onClick={() => setQuery({ page: Math.min(totalPages - 1, currentPage + 1), size })}
                    className="cursor-pointer rounded-lg border border-outline-variant/50 p-2 text-on-surface-variant transition hover:bg-surface-container-low disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronRight size={16} />
                  </button>
                </nav>
              )}
            </>
          )}
        </section>
      </div>

      {/* ── Footer ── */}
      <footer className="border-t border-outline-variant/30 bg-surface-container-lowest">
        <div className="mx-auto grid w-full max-w-7xl gap-6 px-5 py-10 text-sm md:grid-cols-4 md:px-12">
          <div>
            <Link to="/" className="font-display text-xl font-bold text-primary">TraVi</Link>
            <p className="mt-2 text-on-surface-variant">© 2024 TraVi Vietnam. Bảo lưu mọi quyền.</p>
          </div>
          <div className="space-y-2 text-on-surface-variant">
            <p>Về chúng tôi</p>
            <p>Liên hệ</p>
          </div>
          <div className="space-y-2 text-on-surface-variant">
            <p>Chính sách bảo mật</p>
            <p>Điều khoản dịch vụ</p>
          </div>
          <div className="space-y-2 text-on-surface-variant">
            <p>VNPay</p>
            <p>MoMo</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
