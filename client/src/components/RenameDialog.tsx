import { useState } from 'react';
import { SelectedImage } from '../types';

interface RenameDialogProps {
  images: SelectedImage[];
  threeMfName: string;
  onSave: (renamedImages: SelectedImage[]) => void;
  onCancel: () => void;
  isSaving: boolean;
}

export default function RenameDialog({
  images,
  threeMfName,
  onSave,
  onCancel,
  isSaving,
}: RenameDialogProps) {
  const [editedImages, setEditedImages] = useState<SelectedImage[]>(images);

  const handleNameChange = (index: number, newName: string) => {
    setEditedImages((prev) =>
      prev.map((img, i) =>
        i === index ? { ...img, newName } : img
      )
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(editedImages);
  };

  const folderName = threeMfName.replace(/\.3mf$/i, '');

  return (
    <div className="dialog-overlay">
      <div className="dialog">
        <h2>Save Group</h2>
        <p className="dialog-subtitle">
          Files will be saved to <code>{folderName}</code>
        </p>

        <form onSubmit={handleSubmit}>
          <div className="dialog-list">
            {editedImages.map((img, index) => (
              <div key={img.name} className="dialog-item">
                <span className="dialog-item-index">{index + 1}</span>
                <input
                  type="text"
                  value={img.newName}
                  onChange={(e) => handleNameChange(index, e.target.value)}
                  disabled={isSaving}
                />
                <span className="dialog-item-ext">
                  {img.name.match(/\.[^.]+$/)?.[0] || '.jpg'}
                </span>
              </div>
            ))}
          </div>
          <div className="dialog-action">
            <button type="button" onClick={onCancel} disabled={isSaving}>
              Cancel
            </button>
            <button type="submit" className="dialog-save" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
