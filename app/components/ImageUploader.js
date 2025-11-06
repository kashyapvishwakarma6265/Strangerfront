'use client';

import { useRef, useState } from 'react';

export default function ImageUploader({ onImageSelect, disabled }) {
  const fileInputRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    console.log('📷 Image selected:', file.name);

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('❌ Please select an image file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert(`❌ Image must be less than 10MB. Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB`);
      return;
    }

    setIsLoading(true);

    try {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const imageData = {
            file: file,
            blob: new Blob([e.target.result], { type: file.type }),
            url: e.target.result,
            base64: e.target.result,
            name: file.name,
            size: file.size,
            type: file.type,
          };

          console.log('✅ Image ready:', {
            name: imageData.name,
            size: (imageData.size / 1024).toFixed(2) + 'KB',
            type: imageData.type,
          });

          onImageSelect(imageData);
          setIsLoading(false);

          // Reset input
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        } catch (error) {
          console.error('❌ Image processing error:', error);
          setIsLoading(false);
        }
      };

      reader.onerror = () => {
        console.error('❌ FileReader error');
        alert('Failed to read image file');
        setIsLoading(false);
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error('❌ Image upload error:', error);
      alert('Failed to process image');
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled || isLoading}
        className="w-10 h-10 md:w-11 md:h-11 bg-gradient-to-br from-purple-400 to-purple-600 text-white rounded-lg flex items-center justify-center text-lg md:text-xl hover:shadow-md hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
        title="Send Image"
      >
        {isLoading ? '⏳' : '📷'}
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
    </>
  );
}
