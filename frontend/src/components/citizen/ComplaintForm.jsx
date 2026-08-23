import React, { useState, useEffect } from 'react';
import { 
  Droplet, 
  Construction, 
  Trash2, 
  Zap, 
  Biohazard, 
  ShieldAlert, 
  Sparkles, 
  Send, 
  Loader2,
  AlertCircle,
  HelpCircle,
  Clock
} from 'lucide-react';
import VoiceRecorder from './VoiceRecorder';
import LocationPicker from './LocationPicker';
import ImageUploader from './ImageUploader';
import FeedbackModal from './FeedbackModal';
import { citizenService } from '../../services/citizenService';
import { useLanguage } from '../../context/LanguageContext';

const CATEGORY_ICON_MAP = {
  ROADS: Construction,
  WATER: Droplet,
  WASTE: Trash2,
  ELECTRICITY: Zap,
  SEWAGE: Biohazard,
  SAFETY: ShieldAlert,
};

const PRESETS = [
  {
    label: "🚨 Water Burst near Hospital (Hindi)",
    text: "Bada paani ka pipe phat gaya hai hospital ke samne aur paani emergency gate par bhar raha hai",
    lat: 19.0814,
    lng: 72.8809,
    address: "Opposite Metro Hospital Gate 2",
    catCode: "WATER"
  },
  {
    label: "⚡ Sparking Live Wire near School (Marathi)",
    text: "शाळेजवळ विजेची मुख्य तार तुटून रस्त्यावर पडली आहे, ठिणग्या उडत आहेत आणि धोकादायक आहे",
    lat: 19.0792,
    lng: 72.8835,
    address: "St. Xavier School Road, Sector 4",
    catCode: "ELECTRICITY"
  },
  {
    label: "🕳️ Hazardous Pothole on Highway (English)",
    text: "Huge crater pothole on station arterial road causing severe traffic backup and vehicle skidding",
    lat: 19.0760,
    lng: 72.8777,
    address: "Central Station Flyover Junction",
    catCode: "ROADS"
  },
  {
    label: "🚰 Sewage Overflow near Market (Spanish)",
    text: "Drenaje colapsado y aguas residuales desbordándose con fuerte olor cerca del mercado central",
    lat: 19.0725,
    lng: 72.8850,
    address: "Mercado Municipal, Pasaje 5",
    catCode: "SEWAGE"
  }
];

export default function ComplaintForm({ onSwitchToTrack }) {
  const { t } = useLanguage();
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  // Form State
  const [citizenName, setCitizenName] = useState('');
  const [citizenContact, setCitizenContact] = useState('');
  const [rawText, setRawText] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [latitude, setLatitude] = useState(19.0814);
  const [longitude, setLongitude] = useState(72.8809);
  const [address, setAddress] = useState('');
  const [imageData, setImageData] = useState(null);

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submissionResult, setSubmissionResult] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    async function fetchCategories() {
      try {
        const data = await citizenService.getCategories();
        setCategories(data);
      } catch (err) {
        console.error("Failed to load categories", err);
      } finally {
        setLoadingCategories(false);
      }
    }
    fetchCategories();
  }, []);

  const handleApplyPreset = (preset) => {
    setRawText(preset.text);
    setLatitude(preset.lat);
    setLongitude(preset.lng);
    setAddress(preset.address);
    const cat = categories.find(c => c.code === preset.catCode);
    if (cat) setSelectedCategoryId(cat.id);
  };

  const handleVoiceTranscript = (transcript) => {
    setRawText((prev) => (prev ? `${prev} ${transcript}` : transcript));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    if (!rawText.trim()) {
      setSubmitError("Please provide a description of the issue (type or speak).");
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        citizen_name: citizenName.trim() || undefined,
        citizen_contact: citizenContact.trim() || undefined,
        raw_text: rawText.trim(),
        latitude,
        longitude,
        address: address.trim() || undefined,
        category_id: selectedCategoryId || undefined,
        image_url: imageData || undefined,
      };

      const result = await citizenService.submitComplaint(payload);
      setSubmissionResult(result);
      setShowModal(true);

      // Reset form
      setRawText('');
      setAddress('');
      setSelectedCategoryId(null);
      setImageData(null);
    } catch (err) {
      console.error("Submission failed", err);
      setSubmitError(
        err.response?.data?.detail || "Failed to submit grievance. Please check backend connection."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Demo Presets Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-card">
        <div className="flex items-center space-x-1.5 text-xs font-bold text-teal-800 mb-2.5">
          <Sparkles className="w-3.5 h-3.5 text-teal-600" />
          <span>{t('demo_presets_title')}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {PRESETS.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleApplyPreset(p)}
              className="text-left text-xs p-2.5 rounded-xl bg-slate-50 hover:bg-teal-50/70 hover:border-teal-300 border border-slate-200/80 text-slate-700 hover:text-slate-900 transition-all truncate cursor-pointer font-medium"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Submission Form */}
      <form onSubmit={handleSubmit} className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-card space-y-6">
        <div className="border-b border-slate-100 pb-4">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            {t('form_heading')}
          </h2>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            {t('form_subheading')}
          </p>
        </div>

        {/* Citizen Contact Details (Optional) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t('name_label')}
            </label>
            <input
              type="text"
              value={citizenName}
              onChange={(e) => setCitizenName(e.target.value)}
              placeholder="e.g. Ramesh Kumar"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 transition-all font-sans"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t('contact_label')}
            </label>
            <input
              type="text"
              value={citizenContact}
              onChange={(e) => setCitizenContact(e.target.value)}
              placeholder="e.g. +91 98765 43210"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 transition-all font-sans"
            />
          </div>
        </div>

        {/* Grievance Description & Voice Input */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-slate-700">
              {t('desc_label')} <span className="text-rose-600">*</span>
            </label>
            <VoiceRecorder
              onTranscriptReceived={handleVoiceTranscript}
              isProcessing={submitting}
            />
          </div>

          <textarea
            rows={4}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder={t('desc_placeholder')}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 transition-all resize-y leading-relaxed font-sans"
            required
          />
        </div>

        {/* Category Selector with Badges */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-slate-700">
              {t('category_label')}
            </label>
            {selectedCategoryId && (
              <button
                type="button"
                onClick={() => setSelectedCategoryId(null)}
                className="text-[11px] text-teal-700 hover:underline font-semibold cursor-pointer"
              >
                Clear Selection (Auto-Detect by AI)
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {categories.map((cat) => {
              const Icon = CATEGORY_ICON_MAP[cat.code] || HelpCircle;
              const isSelected = selectedCategoryId === cat.id;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategoryId(isSelected ? null : cat.id)}
                  className={`flex items-center space-x-2.5 p-3 rounded-xl border text-xs font-medium transition-all text-left cursor-pointer ${
                    isSelected
                      ? 'bg-teal-50 border-teal-600 text-teal-900 shadow-sm ring-1 ring-teal-600'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-100/80'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-teal-700' : 'text-slate-500'}`} />
                  <div className="truncate">
                    <div className="truncate font-semibold">{cat.name}</div>
                    <div className="text-[10px] text-slate-500 font-normal">SLA: {cat.default_sla_hours}h</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Leaflet GPS Location Picker */}
        <LocationPicker
          latitude={latitude}
          longitude={longitude}
          onLocationChange={(lat, lng) => {
            setLatitude(lat);
            setLongitude(lng);
          }}
        />

        {/* Landmark / Street Address */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            {t('address_label')}
          </label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder={t('address_placeholder')}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 transition-all font-sans"
          />
        </div>

        {/* Photo Attachment Upload */}
        <ImageUploader
          selectedImage={imageData}
          onImageSelected={setImageData}
        />

        {/* Error notification */}
        {submitError && (
          <div className="flex items-center space-x-2 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full flex items-center justify-center space-x-2 py-3.5 px-4 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{t('submitting')}</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>{t('submit_btn')}</span>
            </>
          )}
        </button>
      </form>

      {/* Result Confirmation Modal */}
      <FeedbackModal
        isOpen={showModal}
        data={submissionResult}
        onClose={() => setShowModal(false)}
        onTrackNow={(trackingId) => {
          setShowModal(false);
          if (onSwitchToTrack) onSwitchToTrack(trackingId);
        }}
      />
    </div>
  );
}
