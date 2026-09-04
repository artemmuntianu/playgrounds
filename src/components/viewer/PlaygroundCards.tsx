import React, { useState, useEffect } from 'react';
import type { AgeGroup, EquipmentCategoryId, PlaygroundSummary } from '../../types/playground';
import { fetchPlaygrounds } from '../../lib/api';
import { t, type Locale } from '../../lib/i18n';
import {
  useReferenceData,
  getAgeGroups,
  getAgeGroupLabel,
  getEquipmentCategories,
  getCategory,
  getCategoryLabel,
} from '../../lib/equipment';

export const PlaygroundCards: React.FC = () => {
  const [playgrounds, setPlaygrounds] = useState<PlaygroundSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // i18n Language State
  const [lang, setLang] = useState<Locale>('en');

  // Filter & Sort state
  const [ageFilter, setAgeFilter] = useState<AgeGroup | 'all'>('all');
  const [equipFilter, setEquipFilter] = useState<EquipmentCategoryId | 'all'>('all');
  const [sortBy, setSortBy] = useState<string>('name_asc');

  // Reference vocabulary (age groups + equipment catalog) — single source of truth from the DB.
  const { ready: refReady } = useReferenceData();

  useEffect(() => {
    // Read stored language or default to en
    const stored = localStorage.getItem('pmp_lang') as Locale | null;
    if (stored === 'en' || stored === 'pt') {
      setLang(stored);
    }
  }, []);

  const toggleLanguage = () => {
    const nextLang: Locale = lang === 'en' ? 'pt' : 'en';
    setLang(nextLang);
    localStorage.setItem('pmp_lang', nextLang);
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await fetchPlaygrounds();
        setPlaygrounds(data);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to load playgrounds');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Filter logic: age groups come from the playground's *equipment*; element groups too.
  const filteredPlaygrounds = playgrounds.filter((pg) => {
    if (ageFilter !== 'all') {
      const hasAge = pg.equipment_age_groups.includes(ageFilter);
      if (!hasAge) return false;
    }
    if (equipFilter !== 'all') {
      const hasEquip = pg.equipment_types.some((type) => getCategory(type) === equipFilter);
      if (!hasEquip) return false;
    }
    return true;
  });

  // Sort logic
  const sortedPlaygrounds = [...filteredPlaygrounds].sort((a, b) => {
    const nameA = (a.name[lang] || a.name.en).toLowerCase();
    const nameB = (b.name[lang] || b.name.en).toLowerCase();
    if (sortBy === 'name_asc') return nameA.localeCompare(nameB);
    if (sortBy === 'name_desc') return nameB.localeCompare(nameA);
    if (sortBy === 'newest') return b.created_at.localeCompare(a.created_at);
    if (sortBy === 'oldest') return a.created_at.localeCompare(b.created_at);
    return 0;
  });

  if (!refReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400 text-sm font-semibold">
        Loading catalogue...
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen pb-12 bg-slate-50">
      {/* Sticky Mobile Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-slate-900 font-extrabold text-sm shadow-md shadow-amber-500/20">
            ☀️
          </div>
          <div>
            <h1 className="font-extrabold text-sm text-slate-900 leading-tight">
              {t('app.title', lang)}
            </h1>
            <div className="text-[10px] font-semibold text-amber-600">
              {t('master.count', lang, { n: sortedPlaygrounds.length })}
            </div>
          </div>
        </div>

        {/* Language Switcher Button */}
        <button
          type="button"
          onClick={toggleLanguage}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition border border-slate-200 shadow-sm"
        >
          <span className="text-sm">{lang === 'en' ? '🇬🇧' : '🇵🇹'}</span>
          <span className="uppercase">{lang}</span>
        </button>
      </header>

      {/* Filter and Sort Toolbar */}
      <div className="px-4 py-3 bg-white border-b border-slate-100 space-y-2">
        <div className="flex items-center gap-2">
          {/* Age Group Filter (from equipment) */}
          <div className="flex-1">
            <select
              value={ageFilter}
              onChange={(e) => setAgeFilter(e.target.value as AgeGroup | 'all')}
              aria-label={t('master.filter_label', lang)}
              className="w-full bg-slate-100 text-slate-700 text-xs font-semibold px-3 py-2 rounded-xl border-0 focus:ring-2 focus:ring-amber-500 focus:outline-none"
            >
              <option value="all">👶 {t('master.filter.all', lang)}</option>
              {getAgeGroups()
                .filter((g) => g !== 'all')
                .map((g) => (
                  <option key={g} value={g}>
                    👶 {getAgeGroupLabel(g)[lang]}
                  </option>
                ))}
            </select>
          </div>

          {/* Equipment Group Filter */}
          <div className="flex-1">
            <select
              value={equipFilter}
              onChange={(e) => setEquipFilter(e.target.value as EquipmentCategoryId | 'all')}
              aria-label={t('master.filter_label_equip', lang)}
              className="w-full bg-slate-100 text-slate-700 text-xs font-semibold px-3 py-2 rounded-xl border-0 focus:ring-2 focus:ring-amber-500 focus:outline-none"
            >
              <option value="all">🧩 {t('master.filter_any', lang)}</option>
              {getEquipmentCategories().map((c) => (
                <option key={c} value={c}>
                  🧩 {getCategoryLabel(c)[lang]}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Selector */}
          <div className="flex-1">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              aria-label={t('master.sort_label', lang)}
              className="w-full bg-slate-100 text-slate-700 text-xs font-semibold px-3 py-2 rounded-xl border-0 focus:ring-2 focus:ring-amber-500 focus:outline-none"
            >
              <option value="name_asc">🔤 {t('master.sort.name_asc', lang)}</option>
              <option value="name_desc">🔤 {t('master.sort.name_desc', lang)}</option>
              <option value="newest">⏱️ {t('master.sort.newest', lang)}</option>
              <option value="oldest">⏱️ {t('master.sort.oldest', lang)}</option>
            </select>
          </div>
        </div>
        {/* Clear filters */}
        {(ageFilter !== 'all' || equipFilter !== 'all') && (
          <div className="text-right">
            <button
              type="button"
              onClick={() => {
                setAgeFilter('all');
                setEquipFilter('all');
              }}
              className="text-[11px] font-semibold text-amber-700 hover:underline"
            >
              ✕ Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Main List */}
      <main className="p-4 space-y-4 flex-1">
        {loading ? (
          <div className="py-20 text-center text-slate-400 text-xs font-semibold">
            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            {t('detail.loading', lang)}
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 text-red-700 rounded-xl text-xs font-semibold text-center border border-red-200">
            {error}
          </div>
        ) : sortedPlaygrounds.length === 0 ? (
          <div className="py-20 text-center text-slate-400 text-xs space-y-2">
            <div className="text-4xl">🎪</div>
            <div className="font-bold text-slate-600">{t('master.empty', lang)}</div>
          </div>
        ) : (
          sortedPlaygrounds.map((pg) => {
            const name = pg.name[lang] || pg.name.en;
            const location = pg.location_name[lang] || pg.location_name.en;
            const shortDesc = pg.short_description[lang] || pg.short_description.en;
            const shadowText = pg.attributes.shadow_coverage[lang] || pg.attributes.shadow_coverage.en;
            const tempText = pg.attributes.surface_temperature[lang] || pg.attributes.surface_temperature.en;
            const ageText = getAgeGroupLabel(pg.attributes.target_age_group.id)[lang];

            return (
              <a
                key={pg.id}
                href={`/viewer/${pg.id}`}
                className="block bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden hover:shadow-md transition active:scale-[0.99]"
              >
                {/* Thumbnail Container */}
                <div className="relative aspect-[16/9] bg-slate-900 overflow-hidden">
                  {pg.thumbnail_url ? (
                    <img
                      src={pg.thumbnail_url}
                      alt={name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
                      <span className="text-2xl">📸</span>
                      <span className="text-[10px] mt-1">No preview</span>
                    </div>
                  )}

                  {location && (
                    <div className="absolute bottom-2.5 left-2.5 bg-slate-950/70 backdrop-blur-md text-white text-[11px] font-medium px-2.5 py-1 rounded-lg flex items-center gap-1 shadow">
                      <span>📍</span> {location}
                    </div>
                  )}
                </div>

                {/* Card Content */}
                <div className="p-4 space-y-3">
                  <div>
                    <h2 className="font-extrabold text-base text-slate-900 tracking-tight leading-snug">
                      {name}
                    </h2>
                    {shortDesc && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                        {shortDesc}
                      </p>
                    )}
                  </div>

                  {/* 3 Attributes Badges Row */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
                    <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-200/70 text-[10px] font-bold flex items-center gap-1">
                      <span>☀️</span> {shadowText}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-red-50 text-red-900 border border-red-200/70 text-[10px] font-bold flex items-center gap-1">
                      <span>🌡️</span> {tempText}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-900 border border-blue-200/70 text-[10px] font-bold flex items-center gap-1">
                      <span>👶</span> {ageText}
                    </span>
                    {pg.equipment_types.length > 0 && (
                      <span className="px-2.5 py-1 rounded-lg bg-violet-50 text-violet-900 border border-violet-200/70 text-[10px] font-bold flex items-center gap-1">
                        <span>🧩</span> {pg.equipment_types.length}
                      </span>
                    )}
                  </div>
                </div>
              </a>
            );
          })
        )}
      </main>
    </div>
  );
};
