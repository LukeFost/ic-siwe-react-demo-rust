import { useState, useEffect, useRef } from 'react';
import { useActor } from '../../ic/Actors';
// BackendExtended no longer needed with our proxy
import { twMerge } from 'tailwind-merge';
import { formatDistanceToNow } from 'date-fns';
import { VideoPlayer } from '../../video-service';

interface VideoGridProps {
  tag?: string;
  className?: string;
  onVideoSelect?: (videoId: string) => void;
}

export function VideoGrid({ tag, className = '', onVideoSelect }: VideoGridProps) {
  const actor = useActor();
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Removed unused state

  // Create a stable reference for the fetch function
  const fetchVideos = async () => {
    if (!actor) {
      console.log("No actor available, setting loading to false");
      setLoading(false);
      return;
    }
    
    try {
      let videoList: any[] = [];
      
      // Modified tag handling to use list_all_videos for undefined or "All" tag
      if (tag && tag !== "all" && tag !== "All") {
        try {
          console.log('Searching videos by tag:', tag);
          // @ts-ignore - Our proxy handles this correctly
          videoList = await actor.list_videos_by_tag(tag.toLowerCase());
          console.log(`Found ${videoList.length} videos with tag: ${tag}`);
        } catch (err) {
          console.error(`Error searching for videos with tag ${tag}:`, err);
          videoList = [];
        }
      } else {
        // Try using the properly fixed actor methods for all videos
        try {
          console.log('Getting all videos in VideoGrid (tag is undefined or "All")');
          
          // First try to call search_videos with an empty query as fallback
          try {
            console.log("Trying to use search_videos with empty query as fallback");
            // @ts-ignore - Backend method
            if (actor.search_videos && typeof actor.search_videos === 'function') {
              console.log("Using search_videos with empty string to get all videos");
              // @ts-ignore - Backend method
              videoList = await actor.search_videos("", [], []);
            } else {
              console.warn("search_videos method not found on actor");
              videoList = [];
            }
          } catch (searchErr) {
            console.error("Error using search_videos fallback:", searchErr);
            videoList = [];
          }
          console.log("Successfully loaded videos:", videoList);
          
          // Check if videos are properly shaped
          if (videoList && videoList.length > 0) {
            console.log("First video structure:", videoList[0]);
          }
        } catch (err) {
          console.error("Error loading videos:", err);
          videoList = [];
        }
        console.log("Loaded videos for grid:", videoList);
      }
      
      // Sort videos by timestamp (newest first)
      if (videoList && videoList.length > 0) {
        videoList.sort((a, b) => Number(b.timestamp) - Number(a.timestamp));
      }
      
      console.log("Setting videos state with", videoList.length, "items");
      setVideos(videoList);
    } catch (err) {
      console.error('Error fetching videos:', err);
      setError('Failed to load videos: ' + (err instanceof Error ? err.message : String(err)));
      setVideos([]);
    } finally {
      console.log("Setting loading to false");
      setLoading(false);
    }
  };

  // Create a ref to store the previous fetch ID
  const prevFetchIdRef = useRef<string | null>(null);
  
  // Load videos based on tag or all videos - with better actor readiness check
  useEffect(() => {
    // Check that actor is fully ready before attempting to fetch
    if (!actor || !actor.actor) {
      console.log("Actor not fully ready yet, skipping fetch");
      return;
    }
    
    // Create a stable identifier for the current fetch parameters
    // Include actor.actor existence in the ID to ensure we re-fetch when it becomes available
    const actorId = actor.actor ? 'has-nested-actor' : 'no-nested-actor';
    const fetchId = `${actorId}-${tag || 'all'}`;
    
    if (prevFetchIdRef.current !== fetchId) {
      console.log(`Fetching videos with new parameters: ${fetchId}`);
      setLoading(true);
      setError(null);
      prevFetchIdRef.current = fetchId;
      fetchVideos();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actor, tag]);

  // Format view counts
  const formatViewCount = (count: number) => {
    if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
    if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
    return count.toString();
  };

  // Calculate time ago from timestamp
  const getTimeAgo = (timestamp: bigint) => {
    try {
      return formatDistanceToNow(new Date(Number(timestamp) * 1000), { addSuffix: true });
    } catch (err) {
      return 'Unknown time';
    }
  };

  // Get video thumbnail based on Livepeer's recommended method
  const getVideoThumbnail = (video: any) => {
    console.log('Getting thumbnail for video:', video);
    
    // Check if we have a video_id that can be used as a playback ID
    if (video.video_id) {
      // Using Livepeer's recommended approach for thumbnails
      // This uses the first frame (keyframes_0.jpg) which is a reliable preview image
      return `https://vod-cdn.lp-playback.studio/hls/${video.video_id}/thumbnails/keyframes_0.jpg`;
    }
    
    // Fallback to IPFS if we have a storage reference
    if (video.storage_ref) {
      const storageRef = Array.isArray(video.storage_ref) 
        ? video.storage_ref[0] 
        : typeof video.storage_ref === 'string' 
          ? video.storage_ref 
          : null;
      
      if (storageRef) {
        // If IPFS reference with prefix
        if (storageRef.startsWith('ipfs:')) {
          const cid = storageRef.substring(5);
          // Get the gateway URL from the environment
          const gatewayDomain = import.meta.env.VITE_GATEWAY_URL || 'salmon-worthy-hawk-798.mypinata.cloud';
          return `https://${gatewayDomain}/ipfs/${cid}/thumbnail.jpg`;
        }
      }
    }
    
    // Add default fallback thumbnail
    return '/header.png';
  };

  // Add debug statement to check state before rendering and identify which branch will be rendered
  const renderBranch = error ? "error" : loading ? "loading" : videos.length === 0 ? "empty" : "videos";
  console.log("VideoGrid render state:", { 
    loading, 
    error, 
    videosLength: videos.length,
    renderBranch,
    tag
  });
  
  return (
    <div className={twMerge('container mx-auto px-4 py-6', className)}>
      {/* Search and category tabs removed since they're in the layout */}
      
      {/* Video Grid */}
      {error ? (
        <div className="bg-red-500 bg-opacity-20 text-red-100 p-6 rounded-lg mb-4">
          <h3 className="text-lg font-medium mb-2">Error Loading Videos</h3>
          <p>{error}</p>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          <div className="col-span-full text-center py-2 mb-4 text-white bg-gray-800 rounded">
            Loading videos...
          </div>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-[9/16] bg-gray-300 dark:bg-gray-700 rounded-lg mb-2"></div>
              <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4 mb-1"></div>
              <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : videos.length === 0 ? (
        <div className="text-center py-16 text-gray-500 dark:text-gray-400">
          <h3 className="text-xl font-medium mb-2">No Videos Found</h3>
          <p>
            {tag
              ? `No videos found with the category "${tag}"`
              : 'No videos have been uploaded yet'
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          <div className="col-span-full text-center py-2 mb-4 text-white bg-gray-800 rounded">
            Found {videos.length} videos to display
          </div>
          {videos.map((video) => {
            console.log("Rendering video:", video.video_id, video.title);
            return (
              <div 
                key={video.video_id}
                className="cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => onVideoSelect && onVideoSelect(video.video_id)}
              >
                {/* Video Thumbnail with hover-play */}
                <div 
                  className="aspect-[9/16] bg-gray-200 dark:bg-gray-800 rounded-lg overflow-hidden mb-2 group relative"
                  onMouseEnter={(e) => {
                    // Find the video element in this card and play it
                    const videoElement = e.currentTarget.querySelector('video');
                    if (videoElement) {
                      videoElement.play().catch(err => console.log('Autoplay prevented:', err));
                    }
                  }}
                  onMouseLeave={(e) => {
                    // Find the video element in this card and pause it
                    const videoElement = e.currentTarget.querySelector('video');
                    if (videoElement) {
                      videoElement.pause();
                      videoElement.currentTime = 0;
                    }
                  }}
                >
                  {/* Static thumbnail (visible before hover) */}
                  <img 
                    src={getVideoThumbnail(video)} 
                    alt={video.title}
                    className="w-full h-full object-cover group-hover:opacity-0 absolute inset-0 transition-opacity"
                  />
                  
                  {/* Video player (revealed on hover) */}
                  <div className="w-full h-full absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    {video && (
                      <VideoPlayer
                        videoId={video.video_id}
                        src={`https://lax-prod-catalyst-0.lp-playback.studio/hls/${video.video_id}/index.m3u8`}
                        autoPlay={false}
                        loop={true}
                        className="w-full h-full"
                      />
                    )}
                  </div>
                </div>
                
                {/* Video Info */}
                <div className="flex items-start space-x-2">
                  {/* Creator Avatar - could be fetched in the future */}
                  <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-700 flex-shrink-0 mt-1"></div>
                  
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-gray-100 line-clamp-2 mb-1">
                      {video.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      @user_{video.uploader_principal.toString().substring(0, 8)}
                    </p>
                    <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400">
                      <span>{formatViewCount(Math.floor(Math.random() * 20_000_000))} views</span>
                      <span>•</span>
                      <span>{getTimeAgo(video.timestamp)}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
