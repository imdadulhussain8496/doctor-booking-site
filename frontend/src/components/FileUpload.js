// D:\Projects\DoctorBooking\frontend\src\components\FileUpload.js
import React, { useState } from 'react';
import axios from 'axios';
import './FileUpload.css';

function FileUpload({ patientEmail, patientName, patientPhone, doctorName, doctorId, doctorEmail, onUploadComplete }) {
    const [file, setFile] = useState(null);
    const [fileType, setFileType] = useState('xray');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [tags, setTags] = useState('');
    const [recordDate, setRecordDate] = useState('');
    const [isPrivate, setIsPrivate] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [preview, setPreview] = useState(null);
    const [error, setError] = useState('');
    const [fileSizeError, setFileSizeError] = useState('');

    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        setError('');
        setFileSizeError('');

        if (!selectedFile) {
            setFile(null);
            setPreview(null);
            return;
        }

        // Check file size
        if (selectedFile.size > MAX_FILE_SIZE) {
            const sizeInMB = (selectedFile.size / (1024 * 1024)).toFixed(2);
            setFileSizeError(`File too large! Maximum size is 10MB. Your file: ${sizeInMB}MB`);
            e.target.value = ''; // Clear input
            setFile(null);
            setPreview(null);
            return;
        }

        setFile(selectedFile);
        
        // Create preview for images
        if (selectedFile && selectedFile.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result);
            };
            reader.readAsDataURL(selectedFile);
        } else {
            setPreview(null);
        }
    };

    const validateForm = () => {
        if (!file) {
            setError('Please select a file');
            return false;
        }
        if (!title.trim()) {
            setError('Please enter a title');
            return false;
        }
        if (!patientEmail) {
            setError('Patient email is required');
            return false;
        }
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }

        setUploading(true);
        setProgress(0);
        setError('');

        const formData = new FormData();
        formData.append('file', file);
        formData.append('patientEmail', patientEmail);
        formData.append('patientName', patientName || 'Unknown');
        formData.append('patientPhone', patientPhone || '');
        formData.append('doctorName', doctorName);
        formData.append('doctorId', doctorId);
        formData.append('doctorEmail', doctorEmail || '');
        formData.append('fileType', fileType);
        formData.append('title', title);
        formData.append('description', description);
        formData.append('tags', tags);
        formData.append('recordDate', recordDate || new Date().toISOString().split('T')[0]);
        formData.append('isPrivate', isPrivate);

        try {
            const response = await axios.post('http://localhost:5000/api/upload/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                },
                onUploadProgress: (progressEvent) => {
                    if (progressEvent.total) {
                        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        setProgress(percent);
                    }
                }
            });

            if (response.data.success) {
                alert('✅ File uploaded successfully!');
                
                // Reset form
                setFile(null);
                setTitle('');
                setDescription('');
                setTags('');
                setPreview(null);
                document.getElementById('file-input').value = '';
                
                if (onUploadComplete) {
                    onUploadComplete(response.data.record);
                }
            }
            
        } catch (error) {
            console.error('Upload error:', error);
            setError(error.response?.data?.message || 'Upload failed. Please try again.');
        } finally {
            setUploading(false);
            setProgress(0);
        }
    };

    return (
        <div className="file-upload-container">
            <h3>📁 Upload Medical Record</h3>
            
            {error && <div className="upload-error">{error}</div>}
            
            <form onSubmit={handleSubmit} className="upload-form">
                <div className="form-row">
                    <div className="form-group">
                        <label>File Type *</label>
                        <select 
                            value={fileType} 
                            onChange={(e) => setFileType(e.target.value)}
                            required
                        >
                            <option value="xray">X-Ray Image</option>
                            <option value="mri">MRI Scan</option>
                            <option value="ct">CT Scan</option>
                            <option value="ultrasound">Ultrasound</option>
                            <option value="prescription">Prescription</option>
                            <option value="lab_report">Lab Report</option>
                            <option value="discharge_summary">Discharge Summary</option>
                            <option value="other">Other Document</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Record Date</label>
                        <input
                            type="date"
                            value={recordDate}
                            onChange={(e) => setRecordDate(e.target.value)}
                            max={new Date().toISOString().split('T')[0]}
                        />
                    </div>
                </div>

                <div className="form-group">
                    <label>Title *</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g., Chest X-Ray - March 2026"
                        required
                    />
                </div>

                <div className="form-group">
                    <label>Description</label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Brief description of the record"
                        rows="3"
                    />
                </div>

                <div className="form-group">
                    <label>Tags (comma separated)</label>
                    <input
                        type="text"
                        value={tags}
                        onChange={(e) => setTags(e.target.value)}
                        placeholder="e.g., chest, infection, follow-up"
                    />
                </div>

                <div className="file-input-section">
                    <div className="file-input-group">
                        <label className="file-input-label">
                            <span>📎 Choose File (Max 10MB)</span>
                            <input
                                id="file-input"
                                type="file"
                                onChange={handleFileChange}
                                accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.txt,image/*,application/pdf"
                            />
                        </label>
                        {file && (
                            <div className="file-info">
                                <span className="file-name">{file.name}</span>
                                <span className="file-size">
                                    ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                                </span>
                            </div>
                        )}
                    </div>
                    
                    {fileSizeError && (
                        <div className="file-size-error">
                            ⚠️ {fileSizeError}
                        </div>
                    )}

                    <div className="file-types-hint">
                        <small>Allowed: JPEG, PNG, GIF, WebP, PDF, DOC, DOCX, TXT (Max 10MB)</small>
                    </div>
                </div>

                {preview && (
                    <div className="image-preview">
                        <img src={preview} alt="Preview" />
                    </div>
                )}

                <div className="privacy-toggle">
                    <label className="checkbox-label">
                        <input
                            type="checkbox"
                            checked={isPrivate}
                            onChange={(e) => setIsPrivate(e.target.checked)}
                        />
                        <span>Private (only visible to you and patient)</span>
                    </label>
                </div>

                {uploading && (
                    <div className="upload-progress">
                        <div className="progress-bar">
                            <div 
                                className="progress-fill" 
                                style={{ width: `${progress}%` }}
                            >
                                {progress > 0 && `${progress}%`}
                            </div>
                        </div>
                        <p className="progress-text">Uploading... {progress}%</p>
                    </div>
                )}

                <button 
                    type="submit" 
                    className="upload-btn"
                    disabled={uploading || !file || fileSizeError}
                >
                    {uploading ? 'Uploading...' : '📤 Upload File'}
                </button>
            </form>

            <div className="upload-info">
                <p><strong>ℹ️ Note:</strong></p>
                <ul>
                    <li>Maximum file size: <strong>10MB</strong></li>
                    <li>Supported formats: Images (JPEG, PNG, GIF, WebP) and Documents (PDF, DOC, DOCX, TXT)</li>
                    <li>All uploads are securely stored and accessible only to authorized personnel</li>
                </ul>
            </div>
        </div>
    );
}

export default FileUpload;