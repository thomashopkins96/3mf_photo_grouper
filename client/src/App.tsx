import { useState, useEffect, lazy, Suspense } from 'react';
import { FileInfo, SelectedImage, TabType } from './types';
import { useFiles } from './hooks/useFiles';
import { useGroups } from './hooks/useGroups';
import { useFileActions } from './hooks/useFileActions';
import Layout from './components/Layout';
import ThreeMFViewer from './components/ThreeMFViewer'
import ImageGallery from './components/ImageGallery';
import FileQueue from './components/FileQueue'
import RenameDialog from './components/RenameDialog';
import ConfirmDialog from './components/ConfirmDialog';
import ThreeMFFileList from './components/ThreeMFFileList';
import LoginForm from './components/LoginForm';

export default function App() {
  const ThreeMFViewer = lazy(() => import('./components/ThreeMFViewer'));

  const [currentFile, setCurrentFile] = useState<FileInfo | null>(null);
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('photo-grouper');
  const [viewerFile, setViewerFile] = useState<FileInfo | null>(null);
  const [fileToDelete, setFileToDelete] = useState<FileInfo | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);

  const { files: threeMfFiles, state: threeMfState, refetch: refetchThreeMf } = useFiles('3mf');
  const { files: images, state: imagesState, refetch: refetchImages } = useFiles('images');
  const { saveGroup, state: saveState } = useGroups();
  const { deleteFile, renameFile, state: fileActionState } = useFileActions();

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

  const viewerFileUrl = viewerFile
    ? `/api/files/3mf/${encodeURIComponent(viewerFile.name)}`
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

  const handleDeleteClick = (file: FileInfo) => {
    setFileToDelete(file);
  };

  const handleDeleteConfirm = async () => {
    if (!fileToDelete) return;

    const success = await deleteFile(fileToDelete.name);
    if (success) {
      if (viewerFile?.name === fileToDelete.name) {
        setViewerFile(null);
      }
      if (currentFile?.name === fileToDelete.name) {
        setCurrentFile(null);
        setSelectedImages([]);
      }
      setFileToDelete(null);
      refetchThreeMf();
    }
  };

  const handleDeleteCancel = () => {
    setFileToDelete(null);
  };

  const handleRename = async (file: FileInfo, newName: string) => {
    const success = await renameFile(file.name, newName);
    if (success) {
      if (viewerFile?.name === file.name) {
        setViewerFile({ ...file, name: newName });
      }
      if (currentFile?.name === file.name) {
        setCurrentFile({ ...file, name: newName });
      }
      refetchThreeMf();
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-left">
          <h1>3MF Photo Grouper</h1>
          <div className="app-tabs">
            <button
              className={`app-tab ${activeTab === 'photo-grouper' ? 'active' : ''}`}
              onClick={() => setActiveTab('photo-grouper')}
            >
              Photo Grouper
            </button>
            <button
              className={`app-tab ${activeTab === '3mf-viewer' ? 'active' : ''}`}
              onClick={() => setActiveTab('3mf-viewer')}
            >
              3MF Viewer
            </button>
          </div>
        </div>
        <div className="user-info">
          {threeMfState === 'loading' && <span>Loading files...</span>}
          <span className="user-email">{userEmail}</span>
          <button onClick={handleLogout} className="logout-button">
            Logout
          </button>
        </div>
      </header>
      {activeTab === 'photo-grouper' && (
        <>
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
                  <Suspense fallback={<div className="gallery-empty">Loading images...</div>}>
                    <ThreeMFViewer fileUrl={threeMfUrl} />
                  </Suspense>
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
        </>
      )}

      {activeTab === '3mf-viewer' && (
        <main className="app-main">
          <div className="viewer-layout">
            <div className="viewer-sidebar">
              <ThreeMFFileList
                files={threeMfFiles}
                currentFile={viewerFile}
                onFileSelect={setViewerFile}
                onDeleteClick={handleDeleteClick}
                onRename={handleRename}
              />
            </div>
            <div className="viewer-main">
              <ThreeMFViewer fileUrl={viewerFileUrl} />
            </div>
          </div>
        </main>
      )}

      {showRenameDialog && currentFile && (
        <RenameDialog
          images={selectedImages}
          threeMfName={currentFile.name}
          onSave={handleSave}
          onCancel={handleCancelDialog}
          isSaving={saveState === 'loading'}
        />
      )}

      {fileToDelete && (
        <ConfirmDialog
          title="Delete 3MF File"
          message={`Are you sure you want to delete "${fileToDelete.name}"? This will also delete any associated output folder.`}
          confirmLabel="Delete"
          isLoading={fileActionState === 'loading'}
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
        />
      )}
    </div>
  );
}
