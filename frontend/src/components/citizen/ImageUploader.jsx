import React, { useState } from 'react';
import { Camera, X, Image as ImageIcon, UploadCloud } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export default function ImageUploader({ onImageSelected, selectedImage }) {
  const { t } = useLanguage();
  const [preview, setPreview] = useState(selectedImage || null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
        onImageSelected(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onImageSelected(null);
  };

  return (
    <div className="space-y-1.5">
      <label className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700">
        <Camera className="w-3.5 h-3.5 text-teal-700" />
        <span>{t('photo_label')}</span>
      </label>

      {preview ? (
        <div className="relative rounded-2xl overflow-hidden border border-slate-200 max-h-44 w-full bg-slate-50 group">
          <img
            src={preview}
            alt="Complaint Attachment"
            className="w-full h-44 object-cover"
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-900/80 hover:bg-rose-600 text-white backdrop-blur-sm transition-all shadow-md cursor-pointer"
            title="Remove image"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 hover:border-teal-600 rounded-2xl p-4 cursor-pointer bg-slate-50 hover:bg-teal-50/40 transition-all group">
          <UploadCloud className="w-6 h-6 text-slate-400 group-hover:text-teal-700 mb-1 transition-colors" />
          <span className="text-xs font-semibold text-slate-600 group-hover:text-teal-900">
            {t('drop_photo')}
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5">
            PNG, JPG, WebP up to 5MB
          </span>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>
      )}
    </div>
  );
}
