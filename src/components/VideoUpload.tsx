import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { UploadSkeleton } from '@/components/SkeletonLoaders';
import { Upload, X, FileVideo, CheckCircle, Video } from 'lucide-react';
import axios from 'axios';

interface VideoUploadProps {
  onUploadComplete: () => void;
}

export function VideoUpload({ onUploadComplete }: VideoUploadProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('');
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchUserAccounts();
  }, [user]);

  const fetchUserAccounts = async () => {
    try {
      const response = await axios.get('/accounts');
      const userAccounts = response.data;
      
      setAccounts(userAccounts || []);
      if (userAccounts && userAccounts.length > 0) {
        setSelectedAccount(userAccounts[0]._id);
      }
    } catch (error: any) {
      console.error('Error fetching accounts:', error);
      toast({
        title: "Error",
        description: "Failed to load accounts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file type
      if (!file.type.startsWith('video/')) {
        toast({
          title: "Invalid file type",
          description: "Please select a video file",
          variant: "destructive",
        });
        return;
      }
      
      // Check file size (500MB limit)
      if (file.size > 500 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Video files must be under 500MB",
          variant: "destructive",
        });
        return;
      }
      
      setVideoFile(file);
    }
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file for thumbnail",
          variant: "destructive",
        });
        return;
      }
      setThumbnailFile(file);
    }
  };

  const uploadToCloudinary = async (file: File, resourceType: 'video' | 'image') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('resourceType', resourceType);
    
    // Upload through our backend to avoid CORS issues
    const response = await axios.post('/upload/cloudinary', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total) {
          const progress = (progressEvent.loaded / progressEvent.total) * 100;
          setUploadProgress(progress);
        }
      }
    });
    
    return response.data;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!videoFile || !selectedAccount || !title.trim()) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields and select a video file",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Upload video to Cloudinary
      toast({
        title: "Uploading...",
        description: "Uploading video to Cloudinary",
      });
      
      const videoUploadResult = await uploadToCloudinary(videoFile, 'video');
      
      let thumbnailUploadResult = null;
      if (thumbnailFile) {
        thumbnailUploadResult = await uploadToCloudinary(thumbnailFile, 'image');
      }

      // Save video metadata to MongoDB via API
      const videoData = {
        title: title.trim(),
        description: description.trim(),
        accountId: selectedAccount,
        videoUrl: videoUploadResult.secure_url,
        thumbnailUrl: thumbnailUploadResult?.secure_url || videoUploadResult.thumbnail_url,
        cloudinaryPublicId: videoUploadResult.public_id,
        duration: videoUploadResult.duration,
        format: videoUploadResult.format,
        fileSize: videoFile.size,
        status: 'pending'
      };

      await axios.post('/videos', videoData);

      toast({
        title: "Success",
        description: "Video uploaded successfully and is pending review",
      });

      // Reset form
      setTitle('');
      setDescription('');
      setVideoFile(null);
      setThumbnailFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (thumbnailInputRef.current) thumbnailInputRef.current.value = '';
      
      onUploadComplete();

    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error.response?.data?.error || "Failed to upload video",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  if (loading) {
    return <UploadSkeleton />;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Video Details */}
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-6 border border-purple-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Video className="h-5 w-5 text-purple-600" />
                Video Details
              </h3>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title" className="text-sm font-medium text-gray-700">
                    Video Title *
                  </Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter an engaging video title"
                    required
                    className="mt-2 bg-white/80 border-purple-200 focus:border-purple-400 focus:ring-purple-400"
                  />
                </div>

                <div>
                  <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your video content..."
                    rows={4}
                    className="mt-2 bg-white/80 border-purple-200 focus:border-purple-400 focus:ring-purple-400"
                  />
                </div>

                <div>
                  <Label htmlFor="account" className="text-sm font-medium text-gray-700">
                    Upload to Account *
                  </Label>
                  <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                    <SelectTrigger className="mt-2 bg-white/80 border-purple-200 focus:border-purple-400">
                      <SelectValue placeholder="Select a YouTube account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((account) => (
                        <SelectItem key={account._id} value={account._id}>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                            {account.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - File Uploads */}
          <div className="space-y-6">
            {/* Video Upload */}
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileVideo className="h-5 w-5 text-blue-600" />
                Video File
              </h3>
              
              <div>
                <input
                  ref={fileInputRef}
                  id="video"
                  type="file"
                  accept="video/*"
                  onChange={handleVideoChange}
                  className="hidden"
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`
                    relative cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-all duration-300
                    ${videoFile 
                      ? 'border-green-300 bg-green-50 hover:bg-green-100' 
                      : 'border-blue-300 bg-blue-50 hover:bg-blue-100 hover:border-blue-400'
                    }
                  `}
                >
                  <div className="flex flex-col items-center gap-3">
                    {videoFile ? (
                      <>
                        <CheckCircle className="h-8 w-8 text-green-600" />
                        <div className="text-sm font-medium text-green-700">{videoFile.name}</div>
                        <div className="text-xs text-green-600">
                          {(videoFile.size / (1024 * 1024)).toFixed(2)} MB
                        </div>
                      </>
                    ) : (
                      <>
                        <FileVideo className="h-8 w-8 text-blue-600" />
                        <div className="text-sm font-medium text-blue-700">Choose video file</div>
                        <div className="text-xs text-blue-600">MP4, MOV, AVI up to 2GB</div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Thumbnail Upload */}
            <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-xl p-6 border border-green-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileVideo className="h-5 w-5 text-green-600" />
                Thumbnail (Optional)
              </h3>
              
              <div>
                <input
                  ref={thumbnailInputRef}
                  id="thumbnail"
                  type="file"
                  accept="image/*"
                  onChange={handleThumbnailChange}
                  className="hidden"
                />
                <div
                  onClick={() => thumbnailInputRef.current?.click()}
                  className={`
                    relative cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-all duration-300
                    ${thumbnailFile 
                      ? 'border-green-300 bg-green-50 hover:bg-green-100' 
                      : 'border-green-300 bg-green-50 hover:bg-green-100 hover:border-green-400'
                    }
                  `}
                >
                  <div className="flex flex-col items-center gap-3">
                    {thumbnailFile ? (
                      <>
                        <CheckCircle className="h-8 w-8 text-green-600" />
                        <div className="text-sm font-medium text-green-700">{thumbnailFile.name}</div>
                        <div className="text-xs text-green-600">
                          {(thumbnailFile.size / (1024)).toFixed(2)} KB
                        </div>
                      </>
                    ) : (
                      <>
                        <FileVideo className="h-8 w-8 text-green-600" />
                        <div className="text-sm font-medium text-green-700">Choose thumbnail</div>
                        <div className="text-xs text-green-600">JPG, PNG up to 5MB</div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Upload Progress */}
            {uploading && (
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 border border-purple-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
                  <span className="text-sm font-medium text-purple-700">Uploading your video...</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-purple-600">
                    <span>Progress</span>
                    <span>{Math.round(uploadProgress)}%</span>
                  </div>
                  <Progress 
                    value={uploadProgress} 
                    className="w-full h-2 bg-purple-100"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-center pt-6">
          <Button
            type="submit"
            disabled={uploading || !videoFile || !selectedAccount || !title.trim()}
            className={`
              px-8 py-3 text-base font-semibold rounded-xl shadow-lg transition-all duration-300 transform
              ${uploading || !videoFile || !selectedAccount || !title.trim()
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 hover:scale-105 hover:shadow-xl text-white'
              }
            `}
          >
            {uploading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Uploading...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Upload Video
              </div>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
