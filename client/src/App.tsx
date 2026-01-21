import { useState, useEffect } from 'react';
import { FileInfo, SelectedImage } from './types';
import { useFiles } from './hooks/useFiles';
import { useGroups } from './hooks/useGroups';
import Layout from './components/Layout';
import ThreeMFViewer from './components/ThreeMFViewer'
import ImageGallery from './components/ImageGallery';
import FileQueue from './components/FileQueue'
import RenameDialog from './components/RenameDialog';
import LoginForm from './components/LoginForm';

export default function App() {
  const [currentFile, setCurrentFile] = useState<FileInfo | null>(null);
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);

  const { files: threeMfFiles, state: threeMfState, refetch: refetchThreeMf } = useFiles('3mf');
  const { files: images, state: imagesState, refetch: refetchImages } = useFiles('images');
  const { saveGroup, state: saveState } = useGroups();

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/check');
      const data = await response.json();

      if (data.success && data.data.authenticated) {
        setIsAuthenticated(true);
        setUserEmail(data.data.email || null);
      } else {
        setIsAuthenticated(false);
        setUserEmail(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setIsAuthenticated(false);
    }
    setAuthChecked(true);
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setIsAuthenticated(false);
      setUserEmail(null);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (!authChecked) {
    return (
      <div className="login-container">
        <h1>3MF Photo Grouper</h1>
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginForm onCheckAuth={checkAuth} />;
  }

  const threeMfUrl = currentFile
  ? `/api/files/3mf/${encodeURIComponent(currentFile.name)}`
  : null;

  const handleFileSelect = (file: FileInfo) => {
    setCurrentFile(file);
    setSelectedImages([]);
  };

  const handleSaveClick = () => {
    setShowRenameDialog(true);
  };

  const handleSave = async (renamedImages: SelectedImage[]) => {
    if (!currentFile) return;

    const success = await saveGroup(currentFile.name, renamedImages);

    if (success) {
      setShowRenameDialog(false);
      setSelectedImages([]);
      setCurrentFile(null);
      refetchThreeMf();
      refetchImages();
    }
  };

  const handleCancelDialog = () => {
    setShowRenameDialog(false);
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>3MF Photo Grouper</h1>
        <div className="user-info">
          {threeMfState === 'loading' && <span>Loading files...</span>}
          <span className="user-email">{userEmail}</span>
          <button onClick={handleLogout} className="logout-button">
            Logout
          </button>
        </div>
      </header>
      <FileQueue
        files={threeMfFiles}
        currentFile={currentFile}
        onFileSelect={handleFileSelect}
        onSaveClick={handleSaveClick}
        canSave={currentFile !== null && selectedImages.length > 0}
      />
      <main className="app-main">
        <Layout
          leftPanel={<ThreeMFViewer fileUrl={threeMfUrl} />}
          rightPanel={
            imagesState === 'loading' ? (
              <div className="gallery-empty">Loading images...</div>
            ) : (
              <ImageGallery
                images={images}
                selectedImages={selectedImages}
                onSelectionChange={setSelectedImages}
              />
            )
          }
        />
      </main>

      {showRenameDialog && currentFile && (
        <RenameDialog
          images={selectedImages}
          threeMfName={currentFile.name}
          onSave={handleSave}
          onCancel={handleCancelDialog}
          isSaving={saveState === 'loading'}
        />
      )}
    </div>
  );
}
