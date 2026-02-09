import { useState } from 'react';
import { FileInfo, SelectedImage } from '../types';

interface ImageGalleryProps {
  images: FileInfo[];
  selectedImages: SelectedImage[];
  onSelectionChange: (selected: SelectedImage[]) => void;
  onDeleteImage: (image: FileInfo) => void;
}

export default function ImageGallery({
  images,
  selectedImages,
  onSelectionChange,
  onDeleteImage,
  }: ImageGalleryProps) {
  const getSelectionIndex = (name: string): number => {
    return selectedImages.findIndex((img) => img.name === name);
  };

  const handleImageClick = (image: FileInfo) => {
    const existingIndex = getSelectionIndex(image.name);

    if (existingIndex >= 0) {
      const newSelection = selectedImages.filter((img) => img.name !== image.name);
      onSelectionChange(newSelection);
    } else {
      const baseName = image.name
        .replace(/^.*\//, '')
        .replace(/\.[^.]+$/, '');

      const newImage: SelectedImage = {
        name: image.name,
        newName: baseName,
      };
      onSelectionChange([...selectedImages, newImage]);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, image: FileInfo) => {
    e.stopPropagation();
    onDeleteImage(image);
  };

  if (images.length === 0) {
    return (
      <div className="gallery-empty">
        <p>No images found</p>
      </div>
    );
  }

  return (
    <div className="gallery">
      {images.map((image) => {
        const selectionIndex = getSelectionIndex(image.name);
        const isSelected = selectionIndex >= 0;

        return (
          <div
            key={image.name}
            className={`gallery-item ${isSelected ? 'selected' : ''}`}
            onClick={() => handleImageClick(image)}
          >
          <img
            src={`/api/files/image/${encodeURIComponent(image.name)}`}
            alt={image.name}
            loading="lazy"
          />
          {isSelected && (
            <div className="gallery-item-badge">{selectionIndex + 1}</div>
          )}
          {isSelected && (<div
            className="gallery-item-delete"
            onClick={(e) => handleDeleteClick(e, image)}
            title="Delete image"
          >
            &times;
          </div>
          )}
          </div>
        );
      })}
    </div>
  );
}
