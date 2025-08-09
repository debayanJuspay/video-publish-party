# Cloudinary Setup Instructions

## Creating Upload Preset

1. Log in to your Cloudinary account
2. Go to Settings → Upload
3. Click "Add upload preset"
4. Set the following configuration:

### Basic Settings
- **Preset name**: `video_upload`
- **Signing Mode**: `Unsigned` (important for frontend uploads)
- **Use filename**: No
- **Unique filename**: Yes
- **Overwrite**: No

### Upload Manipulations
- **Auto backup**: Yes (recommended)
- **Format**: Auto
- **Quality**: Auto

### Folder Structure
- **Folder**: `videos/` (optional, helps organize uploads)

### Security
- **Resource type**: Video
- **Allowed formats**: mp4,avi,mov,wmv,flv,webm

### Advanced Options
- **Eager transformations**: You can add video thumbnails if needed
- **Notification URL**: Leave empty for now

## Important Notes

- The upload preset MUST be set to "Unsigned" for frontend uploads to work
- Make sure to note down the exact preset name as it's used in the code
- Video uploads may take time to process depending on file size

## Testing Upload

You can test your Cloudinary configuration by:
1. Making sure your credentials are in .env
2. Creating the upload preset as described above
3. Trying to upload a small video file through the app
