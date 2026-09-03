import React, { useState, useEffect } from 'react';
import type { Playground, PlaygroundPhoto } from '../../types/playground';
import type { SceneAnnotation } from '../../types/shadow';
import { fetchPlayground, fetchScene } from '../../lib/api';
import { ViewerShadowCanvas } from './ViewerShadowCanvas';
import { t, type Locale } from '../../lib/i18n';
import { getSolarPosition } from '../../lib/solar';
import {
  useWeather,
  deriveShadePct,
  deriveTempLabel,
  buildEnvironmentEffects,
} from '../../lib/weather';

interface PlaygroundDetailProps {
  playgroundId: string;
}

export const PlaygroundDetail: React.FC<PlaygroundDetailProps> = ({ playgroundId }) => {
  const [playground, setPlayground] = useState<Playground | null>(null);
  const [activePhoto, setActivePhoto] = useState<PlaygroundPhoto | null>(null);
  const [activeScene, setActiveScene] = useState<SceneAnnotation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // i18n Language State
  const [lang, setLang] = useState<Locale>('en');

  // Time Machine Slider: minutes from midnight (Default 09:45 -> 9*60 + 45 = 585)
  const [timeMinutes, setTimeMinutes] = useState<number>(585);

  // Live weather for the playground location (debounced + cached). Called at the top of the
  // component so it is unconditional (before any early return) — required by the Rules of Hooks.
  const { weather } = useWeather(
    playground?.latitude ?? 0,
    playground?.longitude ?? 0,
    timeMinutes
  );

  useEffect(() => {
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
        const data = await fetchPlayground(playgroundId);
        setPlayground(data);

        // Select initial photo (thumbnail photo or first photo)
        if (data.photos.length > 0) {
          const initial =
            data.photos.find((p) => p.id === data.thumbnail_photo_id) || data.photos[0];
          setActivePhoto(initial);

          // Load scene annotation for this photo if it's shadow enabled
          if (!initial.is_additional) {
            const scene = await fetchScene(data.id, initial.id);
            setActiveScene(scene);
          } else {
            setActiveScene(null);
          }
        }
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to load playground');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [playgroundId]);

  // Handle switching photo in gallery
  const handleSelectPhoto = async (photo: PlaygroundPhoto) => {
    setActivePhoto(photo);
    if (!playground) return;
    if (!photo.is_additional) {
      try {
        const scene = await fetchScene(playground.id, photo.id);
        setActiveScene(scene);
      } catch {
        setActiveScene(null);
      }
    } else {
      setActiveScene(null);
    }
  };

  // Format time minutes to "HH:MM"
  const formatTime = (totalMinutes: number): string => {
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  };

  // Compute dynamic shade for the display line (weather-driven once loaded).
  const timeStr = formatTime(timeMinutes);
  const hours = Math.floor(timeMinutes / 60);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mb-3"></div>
        <span className="text-xs font-semibold">{t('detail.loading', lang)}</span>
      </div>
    );
  }

  if (error || !playground) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center justify-center text-center space-y-4">
        <div className="text-4xl">⚠️</div>
        <div className="text-sm font-bold text-slate-800">
          {error || t('detail.not_found', lang)}
        </div>
        <a
          href="/viewer"
          className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
        >
          {t('nav.back', lang)}
        </a>
      </div>
    );
  }

  const buildDate = (mins: number): Date => {
    const d = new Date();
    d.setHours(Math.floor(mins / 60), mins % 60, 0, 0);
    return d;
  };
  const sol = getSolarPosition(buildDate(timeMinutes), playground.latitude, playground.longitude);
  const shadePct = weather
    ? deriveShadePct(sol, weather, activeScene?.annotations.length ?? 0)
    : hours < 11
      ? 75
      : hours >= 12 && hours <= 17
        ? 82
        : 45;
  const effects = buildEnvironmentEffects(weather);

  const name = playground.name[lang] || playground.name.en;
  const location = playground.location_name[lang] || playground.location_name.en;
  const shadowText = playground.attributes.shadow_coverage[lang] || playground.attributes.shadow_coverage.en;
  const tempText = weather
    ? deriveTempLabel(weather)[lang]
    : playground.attributes.surface_temperature[lang] || playground.attributes.surface_temperature.en;
  const ageText = playground.attributes.target_age_group[lang] || playground.attributes.target_age_group.en;

  const currentPhotoUrl = activePhoto
    ? `/api/playgrounds/${playground.id}/photo/${activePhoto.filename}`
    : '';
  const currentDepthUrl = activePhoto?.depth_map_filename
    ? `/api/playgrounds/${playground.id}/photo/${activePhoto.depth_map_filename}`
    : '';
  const currentSegUrl = activePhoto?.semantic_mask_filename
    ? `/api/playgrounds/${playground.id}/photo/${activePhoto.semantic_mask_filename}`
    : '';

  const isCurrentPhotoAdditional = !!activePhoto?.is_additional;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Sticky Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-2.5 flex items-center justify-between shadow-sm">
        <a
          href="/viewer"
          className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 px-2 py-1 -ml-2 rounded-lg"
        >
          <span>←</span>
          <span>{t('nav.back', lang)}</span>
        </a>

        <div className="text-center flex-1 mx-2 truncate">
          {location && (
            <div className="text-[10px] text-slate-400 font-medium truncate">
              {location}
            </div>
          )}
          <div className="text-xs font-bold text-slate-900 truncate">{name}</div>
        </div>

        {/* Language Switcher */}
        <button
          type="button"
          onClick={toggleLanguage}
          className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold border border-slate-200"
        >
          <span>{lang === 'en' ? '🇬🇧' : '🇵🇹'}</span>
          <span className="uppercase">{lang}</span>
        </button>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex flex-col">
        {/* Playground Title Banner */}
        <div className="bg-white px-4 pt-3 pb-2 text-center border-b border-slate-100">
          <h2 className="font-extrabold text-sm text-slate-900 tracking-tight">
            {name}: {lang === 'en' ? 'Sun & Shadow Explorer' : 'Sol e Sombra'}
          </h2>
        </div>

        {/* Big Image Container with White Background (matches reference mockup) */}
        <div className="w-full bg-white border-b border-slate-200">
          {activePhoto ? (
            <ViewerShadowCanvas
              imageUrl={currentPhotoUrl}
              depthMapUrl={currentDepthUrl}
              segMaskUrl={currentSegUrl}
              scene={activeScene}
              latitude={playground.latitude}
              longitude={playground.longitude}
              simulatedTimeMinutes={timeMinutes}
              isAdditional={isCurrentPhotoAdditional}
              weather={weather}
              effects={effects}
            />
          ) : (
            <div className="w-full aspect-[4/3] flex flex-col items-center justify-center text-slate-400 bg-white">
              <span className="text-4xl mb-2">📸</span>
              <span className="text-xs font-medium">{t('detail.no_photos', lang)}</span>
            </div>
          )}
        </div>

        {/* Thumbnail Gallery (horizontal scroll of mini thumbnails) */}
        {playground.photos.length > 0 && (
          <div className="bg-white px-4 py-2.5 border-b border-slate-200">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <span>🖼️</span> {t('detail.gallery', lang)} ({playground.photos.length})
              </span>
              {isCurrentPhotoAdditional && (
                <span className="text-[10px] text-indigo-600 font-semibold lowercase">
                  (gallery photo selected)
                </span>
              )}
            </div>

            <div className="flex items-center gap-2.5 overflow-x-auto pb-1 no-scrollbar">
              {playground.photos.map((photo, i) => {
                const isSelected = activePhoto?.id === photo.id;
                const thumbUrl = `/api/playgrounds/${playground.id}/photo/${photo.filename}`;

                return (
                  <button
                    key={photo.id}
                    type="button"
                    onClick={() => handleSelectPhoto(photo)}
                    className={`relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 border-2 transition active:scale-95 ${
                      isSelected
                        ? 'border-amber-500 ring-2 ring-amber-500/30 scale-105'
                        : 'border-slate-200 opacity-80 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={thumbUrl}
                      alt={`Thumbnail ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-0.5 right-0.5 text-[9px]">
                      {photo.is_additional ? '🖼️' : '☀️'}
                    </div>
                    <div className="absolute bottom-0 inset-x-0 bg-slate-950/60 text-white text-[9px] font-mono text-center leading-tight py-0.5">
                      #{i + 1}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Time Machine & Attributes Controls Box (matches mockup in prompt) */}
        <div className="bg-white p-4 space-y-4 border-b border-slate-200 shadow-sm">
          {/* Time Machine Header & Current Time Indicator */}
          <div className="flex flex-col items-center space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-3 py-0.5 bg-blue-600 text-white rounded-md text-xs font-black tracking-wider shadow-sm">
                {timeStr}
              </span>
              <span className="text-xs font-bold text-slate-800">
                {t('detail.time_machine', lang)}
              </span>
            </div>

            {/* Slider */}
            <div className="w-full pt-2">
              <input
                type="range"
                min="480" // 08:00
                max="1200" // 20:00
                step="15"
                value={timeMinutes}
                onChange={(e) => setTimeMinutes(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none"
              />
              {/* Tick labels */}
              <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1 px-1">
                <span>08:00</span>
                <span>10:00</span>
                <span>12:00</span>
                <span>14:00</span>
                <span>16:00</span>
                <span>18:00</span>
                <span>20:00</span>
              </div>
            </div>
          </div>

          {/* 3 Attributes Buttons Row (Shadow, Temperature, Age) */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            {/* Shadow Pill */}
            <div className="flex items-center justify-center gap-1 py-2 px-2 rounded-xl bg-amber-400 text-slate-950 font-bold text-xs shadow-sm text-center">
              <span>☀️</span>
              <span className="truncate">{shadowText}</span>
            </div>

            {/* Temperature Pill */}
            <div className="flex items-center justify-center gap-1 py-2 px-2 rounded-xl bg-red-500 text-white font-bold text-xs shadow-sm text-center">
              <span>🌡️</span>
              <span className="truncate">{tempText}</span>
            </div>

            {/* Age Group Pill */}
            <div className="flex items-center justify-center gap-1 py-2 px-2 rounded-xl bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs shadow-sm text-center">
              <span>👶</span>
              <span className="truncate">{ageText}</span>
            </div>
          </div>

          {/* Dynamic Summary Line (matches prompt: "09:45: Горка в тени на 78%. Поверхность...") */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700 font-medium">
            <span className="font-bold text-slate-900">{timeStr}: </span>
            {lang === 'en' ? (
              <span>
                Playground is in <strong>{shadePct}% shade</strong>. Surface: <strong>{tempText}</strong>.
              </span>
            ) : (
              <span>
                Parque com <strong>{shadePct}% de sombra</strong>. Superfície: <strong>{tempText}</strong>.
              </span>
            )}
          </div>
        </div>

        {/* Playground Details / Description */}
        {playground.full_description && (
          <div className="p-4 bg-slate-50 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {lang === 'en' ? 'About this playground' : 'Sobre este parque'}
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {playground.full_description[lang] || playground.full_description.en}
            </p>
          </div>
        )}
      </main>
    </div>
  );
};
