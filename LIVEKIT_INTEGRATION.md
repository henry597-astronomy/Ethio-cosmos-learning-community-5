# LiveKit Integration Guide

This document explains the LiveKit integration for the Ethio Cosmos Learning Community app, which enables low-latency live streaming capabilities.

## Overview

The "Host Live" button is now available in the center of the bottom taskbar, allowing authenticated users to start live streams for community events, lectures, and interactive sessions.

## Features

- **Host Live Button**: Located in the center of the bottom taskbar (visible only to authenticated users)
- **Live Stream Modal**: Easy-to-use interface for starting a live stream with a custom room name
- **Real-time Streaming**: Low-latency video and audio streaming using LiveKit
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## Architecture

### Components

1. **BottomTaskBar.tsx** - Main taskbar component with the "Host Live" button
2. **LiveHostModal.tsx** - Modal for entering room name and starting a stream
3. **LiveKitStream.tsx** - Full-screen live streaming interface
4. **LiveKitContext.tsx** - Context for managing live streaming state across the app

### API Endpoint

- **POST /api/livekit/token** - Generates LiveKit access tokens for users

### Utilities

- **livekit-utils.ts** - Helper functions for token generation (server-side)

## Environment Variables

The following environment variables must be configured in Vercel:

```
VITE_LIVEKIT_URL=wss://ethiocosmos-learning-community-1vp1cr43.livekit.cloud
LIVEKIT_API_KEY=API44EwLtPL9qPg
LIVEKIT_API_SECRET=bb79QVaGDsuYSV8ibGWcfAaCF97jyHzMLlNfcnNPnAn
```

**Important**: 
- `VITE_LIVEKIT_URL` is exposed to the frontend (prefixed with `VITE_`)
- `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET` are backend-only and must NOT be prefixed with `VITE_`

## How It Works

### User Flow

1. **Authenticated User** clicks the "Host Live" button in the bottom taskbar
2. **Modal Opens** asking for a room name (e.g., "Astronomy Basics")
3. **API Call** to `/api/livekit/token` generates a secure access token
4. **Live Stream Starts** with the user as the host
5. **Room Name** can be shared with others to join the stream

### Token Generation

The API endpoint (`/api/livekit/token`) performs the following:

1. Validates the request (POST method, required fields)
2. Retrieves LiveKit credentials from environment variables
3. Creates an access token with appropriate permissions:
   - **Host**: Can publish video/audio and data
   - **Viewer**: Can only subscribe to the stream
4. Returns the token to the frontend

### Security

- Tokens are generated server-side using the LiveKit SDK
- API credentials are never exposed to the frontend
- Each token is scoped to a specific room and user
- Tokens have expiration times (default: 1 hour)

## Deployment Instructions

### 1. Vercel Environment Variables

Add the following to your Vercel project settings:

```
LIVEKIT_API_KEY=API44EwLtPL9qPg
LIVEKIT_API_SECRET=bb79QVaGDsuYSV8ibGWcfAaCF97jyHzMLlNfcnNPnAn
VITE_LIVEKIT_URL=wss://ethiocosmos-learning-community-1vp1cr43.livekit.cloud
```

### 2. Build Configuration

The project is already configured to:
- Build the frontend with Vite
- Deploy serverless functions in the `/api` directory
- Automatically handle API routes

### 3. Testing Locally

To test the LiveKit integration locally:

```bash
# Install dependencies
pnpm install

# Create a .env.local file with the credentials
cp .env.example .env.local

# Run the development server
pnpm dev

# In another terminal, you can test the API endpoint:
curl -X POST http://localhost:3000/api/livekit/token \
  -H "Content-Type: application/json" \
  -d '{"userName":"test-user","roomName":"test-room","isHost":true}'
```

## File Structure

```
src/
├── components/
│   ├── BottomTaskBar.tsx          # Main taskbar with Host Live button
│   ├── LiveHostModal.tsx          # Modal for starting streams
│   └── LiveKitStream.tsx          # Live streaming interface
├── context/
│   └── LiveKitContext.tsx         # State management for live streams
└── lib/
    └── livekit-utils.ts           # Server-side token utilities

api/
└── livekit/
    └── token.ts                   # Token generation endpoint
```

## Troubleshooting

### "Failed to generate token" Error

**Cause**: Environment variables not properly set in Vercel
**Solution**: 
1. Go to Vercel Project Settings → Environment Variables
2. Ensure `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET` are set
3. Redeploy the project

### Connection Issues

**Cause**: Incorrect LiveKit URL or network connectivity
**Solution**:
1. Verify `VITE_LIVEKIT_URL` is correct
2. Check browser console for detailed error messages
3. Ensure your network allows WebSocket connections to the LiveKit server

### Modal Not Appearing

**Cause**: LiveKitProvider not properly wrapped in App.tsx
**Solution**:
1. Check that `App.tsx` includes `<LiveKitProvider>` wrapper
2. Verify the component hierarchy is correct

## Future Enhancements

Potential improvements for the LiveKit integration:

1. **Recording**: Store live streams for later viewing
2. **Viewer List**: Show active viewers during a stream
3. **Chat Integration**: Real-time chat alongside live streams
4. **Scheduling**: Schedule live streams in advance
5. **Analytics**: Track viewer engagement and stream metrics
6. **Multi-room**: Support multiple simultaneous streams
7. **Screen Sharing**: Allow hosts to share their screen
8. **Custom Layouts**: Different video layouts for different use cases

## Support

For issues or questions about the LiveKit integration:

1. Check the [LiveKit Documentation](https://docs.livekit.io)
2. Review the component code and comments
3. Check browser console for error messages
4. Verify environment variables are correctly set

## References

- [LiveKit Documentation](https://docs.livekit.io)
- [LiveKit React SDK](https://docs.livekit.io/reference/client-sdk-js)
- [LiveKit Server SDK](https://docs.livekit.io/reference/server-sdk-js)
- [Vercel Serverless Functions](https://vercel.com/docs/concepts/functions/serverless-functions)
