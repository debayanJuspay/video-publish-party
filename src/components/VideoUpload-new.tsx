import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Upload, FileVideo } from 'lucide-react';
import axios from 'axios';

interface VideoUploadProps {
  onUploadComplete: () => void;
}

export function VideoUpload({ onUploadComplete }: VideoUploadProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('');
  const [accounts, setAccounts] = useState<any[]>([]);
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
    formData.append('upload_preset', 'video_upload'); // You'll need to create this preset in Cloudinary
    
    const url = `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`;
    
    const response = await axios.post(url, formData, {
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Video Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter video title"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter video description"
              rows={4}
            />
          </div>

          <div>
            <Label htmlFor="account">Upload to Account *</Label>
            <Select value={selectedAccount} onValueChange={setSelectedAccount}>
              <SelectTrigger>
                <SelectValue placeholder="Select an account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account._id} value={account._id}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="video">Video File *</Label>
            <div className="mt-2">
              <input
                ref={fileInputRef}
                id="video"
                type="file"
                accept="video/*"
                onChange={handleVideoChange}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-20 border-dashed"
              >
                <div className="flex flex-col items-center gap-2">
                  <FileVideo className="h-6 w-6" />
                  <span>{videoFile ? videoFile.name : "Choose video file"}</span>
                </div>
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor="thumbnail">Thumbnail (Optional)</Label>
            <div className="mt-2">
              <input
                ref={thumbnailInputRef}
                id="thumbnail"
                type="file"
                accept="image/*"
                onChange={handleThumbnailChange}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => thumbnailInputRef.current?.click()}
                className="w-full h-20 border-dashed"
              >
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-6 w-6" />
                  <span>{thumbnailFile ? thumbnailFile.name : "Choose thumbnail"}</span>
                </div>
              </Button>
            </div>
          </div>

          {uploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Uploading...</span>
                <span>{Math.round(uploadProgress)}%</span>
              </div>
              <Progress value={uploadProgress} className="w-full" />
            </div>
          )}

          <Button
            type="submit"
            disabled={uploading || !videoFile || !selectedAccount || !title.trim()}
            className="w-full"
          >
            {uploading ? 'Uploading...' : 'Upload Video'}
          </Button>
        </div>
      </div>
    </form>
  );
}
