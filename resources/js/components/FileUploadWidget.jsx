import React, { useRef, useState } from 'react';

const FileUploadWidget = ({ label = "Upload Image", onFileSelect, error, required = false }) => {
  const inputRef = useRef();
  const [preview, setPreview] = useState(null);
  const [touched, setTouched] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    handleFile(file);
  };

  const handleFile = (file) => {
    setTouched(true);
    if (file && file.type.startsWith('image/')) {
      if (file.size <= 5 * 1024 * 1024) { // 5MB limit
        setPreview(URL.createObjectURL(file));
        onFileSelect(file);
      } else {
        alert('File size must be less than 5MB');
      }
    } else if (file) {
      alert('Please upload a valid image file');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    handleFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const showError = touched && required && !preview && error;

  return (
    <div className="mb-4">
      <label className="block text-sm text-gray-600 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div
        className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 transition-colors
          ${isDragging ? 'border-blue-500 bg-blue-50' : showError ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-gray-50 hover:border-blue-500 hover:bg-blue-50'}`}
        onClick={() => inputRef.current.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        style={{ minHeight: '150px', cursor: 'pointer' }}
      >
        {!preview ? (
          <div className="flex flex-col items-center text-center">
            <svg className="w-12 h-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="mb-2 text-sm text-gray-500">
              <span className="font-semibold">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-gray-500">
              Supported formats: JPEG, PNG, GIF, WebP. Max size: 5MB
            </p>
          </div>
        ) : (
          <div className="relative w-full max-w-[200px]">
            <img src={preview} alt="Preview" className="w-full h-auto rounded-lg shadow-md" />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setPreview(null);
                onFileSelect(null);
                setTouched(false);
              }}
              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full text-white flex items-center justify-center hover:bg-red-600 focus:outline-none"
            >
              ×
            </button>
          </div>
        )}
        <input
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          ref={inputRef}
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>
      {showError && (
        <p className="text-red-500 text-sm mt-1">{error || 'This field is required'}</p>
      )}
    </div>
  );
};

export default FileUploadWidget;