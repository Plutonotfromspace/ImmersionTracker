import { useState, useEffect } from 'react'
import YouTube from 'react-youtube'
import axios from 'axios'
import './App.css'
import { AuthProvider, useAuth } from './context/AuthContext'
import Header from './components/Header'
import { saveUserVideos, getUserVideos, addVideo as addFirebaseVideo, removeVideo as removeFirebaseVideo } from './services/UserService'

function AppContent() {
  // Generate a unique ID for videos
  const generateUUID = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  const [videos, setVideos] = useState(() => {
    const savedVideos = localStorage.getItem('videos')
    // If we have older videos without uniqueId, add them now
    if (savedVideos) {
      const parsedVideos = JSON.parse(savedVideos);
      const updatedVideos = parsedVideos.map(video => 
        video.uniqueId ? video : { ...video, uniqueId: generateUUID() }
      );
      return updatedVideos;
    }
    return [];
  })
  const [url, setUrl] = useState('')
  const [totalTime, setTotalTime] = useState(0)
  const [syncStatus, setSyncStatus] = useState(null) // 'syncing', 'success', 'error', null
  const { currentUser } = useAuth();
  
  // Define immersion levels with simplified labels for the chart
  const immersionLevels = [
    { name: "Beginner", start: 0, end: 50, color: "#FFC107" },
    { name: "Beginner 1", start: 50, end: 200, color: "#FF9800" },
    { name: "Beginner 2", start: 200, end: 400, color: "#FF5722" },
    { name: "Intermediate", start: 400, end: 800, color: "#2196F3" },
    { name: "Intermediate 2", start: 800, end: 1300, color: "#3F51B5" },
    { name: "Advanced", start: 1300, end: 1800, color: "#4CAF50" }
  ]

  // Convert seconds to hours
  const totalHours = Math.floor(totalTime / 3600)
  
  // Get user's current level
  const getCurrentLevel = (hours) => {
    return immersionLevels.find(level => 
      hours >= level.start && hours < level.end
    ) || immersionLevels[immersionLevels.length - 1]
  }
  
  // Load user videos from Firebase when logged in
  useEffect(() => {
    const fetchUserVideos = async () => {
      if (currentUser) {
        try {
          setSyncStatus('syncing');
          const cloudVideos = await getUserVideos(currentUser.uid);
          const localVideos = JSON.parse(localStorage.getItem('videos') || '[]');
          
          // If cloud has videos, merge them with local videos
          if (cloudVideos && Object.keys(cloudVideos).length > 0) {
            // Convert object to array
            const videosArray = Object.values(cloudVideos);
            
            // Identify videos by uniqueId
            const existingIds = new Set(videosArray.map(v => v.uniqueId));
            const newLocalVideos = localVideos.filter(v => !existingIds.has(v.uniqueId));
            
            // Combine cloud and unique local videos
            const mergedVideos = [...videosArray, ...newLocalVideos];
            
            // Sort videos by timestamp in descending order (newest first)
            // If some videos don't have timestamp (legacy data), put them at the end
            const sortedVideos = mergedVideos.sort((a, b) => {
              if (a.timestamp && b.timestamp) {
                return b.timestamp - a.timestamp; // Descending order
              } else if (a.timestamp) {
                return -1; // a comes first
              } else if (b.timestamp) {
                return 1; // b comes first
              }
              return 0; // Keep original order if neither has timestamp
            });
            
            // Update state with sorted videos
            setVideos(sortedVideos);
            
            // Save the merged list back to cloud if we have new local videos
            if (newLocalVideos.length > 0) {
              const videoMap = sortedVideos.reduce((acc, video) => {
                acc[video.uniqueId] = video;
                return acc;
              }, {});
              await saveUserVideos(currentUser.uid, videoMap);
            }
          } 
          // If cloud is empty but we have local videos, push them to cloud
          else if (localVideos.length > 0) {
            // First make sure all local videos have timestamps
            const updatedLocalVideos = localVideos.map(video => {
              if (!video.timestamp) {
                // If no timestamp, create one based on uniqueId or just use current time
                // This is a fallback for legacy data
                const timestamp = video.uniqueId ? 
                  parseInt(video.uniqueId.split('-')[0], 36) || Date.now() : 
                  Date.now();
                return { ...video, timestamp };
              }
              return video;
            });
            
            // Sort local videos by timestamp
            const sortedLocalVideos = updatedLocalVideos.sort((a, b) => 
              b.timestamp - a.timestamp
            );
            
            // Update state with sorted videos
            setVideos(sortedLocalVideos);
            
            // Convert array to object with uniqueIds as keys for Firestore
            const videoMap = sortedLocalVideos.reduce((acc, video) => {
              acc[video.uniqueId] = video;
              return acc;
            }, {});
            
            // Upload local videos to Firestore
            await saveUserVideos(currentUser.uid, videoMap);
            console.log("Uploaded local videos to empty cloud storage");
          }
          // Set success regardless of which path we took
          setSyncStatus('success');
          setTimeout(() => {
            setSyncStatus(null);
          }, 3000);
        } catch (error) {
          console.error('Error fetching/syncing videos:', error);
          setSyncStatus('error');
          setTimeout(() => {
            setSyncStatus(null);
          }, 3000);
        }
      }
    };

    fetchUserVideos();
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('videos', JSON.stringify(videos))
    // Calculate total time whenever videos change
    const total = videos.reduce((acc, video) => acc + video.duration, 0)
    setTotalTime(total)
  }, [videos])

  const getVideoId = (url) => {
    const regex = /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/
    const match = url.match(regex)
    return match ? match[1] : null
  }

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const remainingSeconds = seconds % 60

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const videoId = getVideoId(url)
    
    if (!videoId) {
      alert('Please enter a valid YouTube URL')
      return
    }

    try {
      const response = await axios.get(`https://www.googleapis.com/youtube/v3/videos`, {
        params: {
          part: 'snippet,contentDetails',
          id: videoId,
          key: 'AIzaSyAtD8K3fCJOgb50R71SPnxkx4Ydnrvhgag'
        }
      })

      if (response.data.items.length > 0) {
        const videoData = response.data.items[0]
        const duration = parseDuration(videoData.contentDetails.duration)
        
        const uniqueId = generateUUID();
        const timestamp = Date.now(); // Add timestamp for ordering
        
        const newVideo = {
          id: videoId,
          title: videoData.snippet.title,
          thumbnail: videoData.snippet.thumbnails.maxres?.url || 
                    videoData.snippet.thumbnails.high?.url ||
                    videoData.snippet.thumbnails.standard?.url ||
                    videoData.snippet.thumbnails.medium.url,
          duration: duration,
          url: url,
          uniqueId: uniqueId,
          addedAt: new Date().toISOString(),
          timestamp: timestamp // Store timestamp for consistent ordering
        }

        // Add to state (and local storage via useEffect)
        setVideos(prev => [newVideo, ...prev])
        
        // If user is logged in, also save to Firebase
        if (currentUser) {
          addFirebaseVideo(currentUser.uid, newVideo);
        }
        
        setUrl('')
      }
    } catch (error) {
      console.error('Error fetching video data:', error)
      alert('Error fetching video data. Please try again.')
    }
  }

  const handleDeleteVideo = async (uniqueId) => {
    // Remove from state and local storage
    setVideos(prev => prev.filter(video => video.uniqueId !== uniqueId));
    
    // If user is logged in, also remove from Firebase
    if (currentUser) {
      await removeFirebaseVideo(currentUser.uid, uniqueId);
    }
  }

  const parseDuration = (duration) => {
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/)
    const hours = (match[1] || '').replace('H', '')
    const minutes = (match[2] || '').replace('M', '')
    const seconds = (match[3] || '').replace('S', '')
    
    return (hours ? parseInt(hours) * 3600 : 0) +
           (minutes ? parseInt(minutes) * 60 : 0) +
           (seconds ? parseInt(seconds) : 0)
  }
  
  // Sync all local videos to Firebase
  const syncToCloud = async () => {
    if (!currentUser || videos.length === 0) return;
    
    try {
      setSyncStatus('syncing');
      
      // Make sure all videos have a timestamp for ordering
      const videosWithTimestamps = videos.map(video => {
        if (!video.timestamp) {
          // If no timestamp, create one based on uniqueId or just use current time with offset
          // This preserves the original video order for legacy videos
          const index = videos.findIndex(v => v.uniqueId === video.uniqueId);
          const timestamp = Date.now() - (index * 1000); // Offset by 1 second per video in the list
          return { ...video, timestamp };
        }
        return video;
      });
      
      // Sort by timestamp to ensure consistent ordering
      const sortedVideos = [...videosWithTimestamps].sort((a, b) => 
        b.timestamp - a.timestamp
      );
      
      // Update state with sorted videos if needed
      if (JSON.stringify(sortedVideos) !== JSON.stringify(videos)) {
        setVideos(sortedVideos);
      }
      
      // Convert array to object with uniqueIds as keys
      const videoMap = sortedVideos.reduce((acc, video) => {
        acc[video.uniqueId] = video;
        return acc;
      }, {});
      
      await saveUserVideos(currentUser.uid, videoMap);
      setSyncStatus('success');
      
      // Clear status after a delay
      setTimeout(() => {
        setSyncStatus(null);
      }, 3000);
    } catch (error) {
      console.error('Error syncing videos to cloud:', error);
      setSyncStatus('error');
      
      setTimeout(() => {
        setSyncStatus(null);
      }, 3000);
    }
  };

  const ImmersionProgressBar = ({ totalHours, immersionLevels }) => {
    const maxHours = immersionLevels[immersionLevels.length - 1].end;
    const currentLevelObj = getCurrentLevel(totalHours);
    const [zoomLevel, setZoomLevel] = useState(0); // 0 = full view, higher values = more zoom

    // Calculate progress percentage within the current level - using totalTime in seconds for precision
    const totalHoursExact = totalTime / 3600; // Convert seconds to hours with decimal precision
    const progressInCurrentLevel = totalHoursExact - currentLevelObj.start;
    const currentLevelRange = currentLevelObj.end - currentLevelObj.start;
    const percentInCurrentLevel = Math.min(
      100, 
      Math.max(0, Math.floor((progressInCurrentLevel / currentLevelRange) * 100))
    );
    
    // Calculate precise hours remaining to next level
    const hoursToNextLevel = currentLevelObj.end - totalHoursExact;
    const formattedHoursToNext = hoursToNextLevel.toFixed(1);

    // Calculate zoom window parameters
    const calculateZoomedView = () => {
      if (zoomLevel === 0) return { start: 0, end: maxHours }; // Full timeline view

      // As zoom increases, focus more narrowly around current level
      const focusAmount = Math.min(0.8, zoomLevel * 0.2); // 0 to 0.8
      const windowSize = maxHours * (1 - focusAmount);
      
      // Center the window on current level plus some progress
      const centerPoint = Math.min(
        maxHours - windowSize / 2, // Don't go past the maximum
        Math.max(
          windowSize / 2, // Don't go before the minimum
          currentLevelObj.start + (currentLevelRange * 0.5) // Center in the user's current level
        )
      );
      
      return {
        start: Math.max(0, centerPoint - windowSize / 2),
        end: Math.min(maxHours, centerPoint + windowSize / 2)
      };
    };

    const zoomWindow = calculateZoomedView();
    const visibleRange = zoomWindow.end - zoomWindow.start;

    return (
      <div className="immersion-dashboard">
        <h2>Immersion Progress Dashboard</h2>
        
        <div className="dashboard-stats">
          <div className="stat-card total-hours">
            <div className="stat-value">{formatDuration(totalTime)}</div>
            <div className="stat-label">TOTAL TIME</div>
          </div>
          
          <div className="stat-card current-level" 
               style={{ backgroundColor: currentLevelObj.color + "15", borderColor: currentLevelObj.color }}>
            <div className="stat-value" style={{ color: currentLevelObj.color }}>{currentLevelObj.name}</div>
            <div className="stat-label">Current Level</div>
          </div>
          
          <div className="stat-card progress-card">
            <div className="stat-value" style={{ color: currentLevelObj.color }}>{percentInCurrentLevel}%</div>
            <div className="stat-label">Level Progress</div>
            <div className="mini-progress">
              <div className="mini-bar" style={{ width: `${percentInCurrentLevel}%`, backgroundColor: currentLevelObj.color }}></div>
            </div>
          </div>
          
          <div className="stat-card next-level">
            <div className="stat-value" style={{ color: currentLevelObj.color }}>
              {currentLevelObj.end === maxHours ? "Max Level" : `${formattedHoursToNext}h left`}
            </div>
            <div className="stat-label">Next Milestone</div>
          </div>
        </div>
        
        <div className="progress-timeline">
          <div className="timeline-track">
            {immersionLevels.map((level, idx) => {
              // Skip segments completely outside the zoom window
              if (level.end <= zoomWindow.start || level.start >= zoomWindow.end) return null;
              
              // Adjust start/end for partially visible segments
              const visibleStart = Math.max(level.start, zoomWindow.start);
              const visibleEnd = Math.min(level.end, zoomWindow.end);
              
              // Calculate width based on visible portion
              const width = ((visibleEnd - visibleStart) / visibleRange) * 100;
              
              // Calculate offset from left edge of zoom window
              const leftOffset = ((visibleStart - zoomWindow.start) / visibleRange) * 100;
              
              return (
                <div 
                  key={idx}
                  className={`timeline-segment ${totalHours >= level.start ? 'achieved' : ''}`}
                  style={{
                    width: `${width}%`,
                    marginLeft: idx === 0 || level.start <= zoomWindow.start ? `${leftOffset}%` : 0,
                    backgroundColor: level.color,
                  }}
                >
                  <div className="segment-tooltip">
                    <strong>{level.name}</strong>
                    <span>{level.start} - {level.end} hours</span>
                  </div>
                </div>
              );
            })}
            
            {/* Progress marker */}
            {totalTime > 0 && totalHoursExact >= zoomWindow.start && totalHoursExact <= zoomWindow.end && (
              <div
                className="timeline-marker"
                style={{ 
                  left: `${((totalTime / 3600 - zoomWindow.start) / visibleRange) * 100}%` 
                }}
              ></div>
            )}
          </div>
          
          {/* Zoom slider */}
          <div className="zoom-control">
            <span>Zoom:</span>
            <input 
              type="range" 
              min="0" 
              max="4" 
              step="0.1" 
              value={zoomLevel} 
              onChange={(e) => setZoomLevel(Number(e.target.value))} 
              className="zoom-slider"
            />
            <button 
              className="reset-zoom" 
              onClick={() => setZoomLevel(0)}
              title="Reset to full view"
            >
              Reset
            </button>
          </div>
        </div>
        
        {/* Legend for color coding */}
        <div className="timeline-legend">
          {immersionLevels.map((level, idx) => (
            <div key={idx} className="legend-item">
              <div className="legend-color" style={{ backgroundColor: level.color }}></div>
              <div className="legend-text">{level.name} ({level.start}-{level.end}h)</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="container">
      <Header syncToCloud={syncToCloud} />
      
      <div className="fixed-content">
        <div className="floating-input-container">
          <div className="video-input-wrapper">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste YouTube URL to add a video"
              className="video-url-input"
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e)}
            />
            <button 
              className="add-video-button" 
              onClick={handleSubmit}
              disabled={!url.trim()}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
            {url.trim() && (
              <button 
                className="clear-input-button"
                onClick={() => setUrl('')}
                title="Clear input"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            )}
          </div>
        </div>

        <ImmersionProgressBar totalHours={totalHours} immersionLevels={immersionLevels} />
      </div>

      <div className="scrollable-content">
        <div className="video-container">
          <div className="video-list">
            {videos.map(video => (
              <div key={video.uniqueId} className="video-item">
                <div className="thumbnail-container">
                  <img src={video.thumbnail} alt={video.title} />
                  <div className="duration-overlay">{formatDuration(video.duration)}</div>
                  <button className="delete-button" onClick={() => handleDeleteVideo(video.uniqueId)} aria-label="Delete video"></button>
                </div>
                <div className="video-details">
                  <h3>{video.title}</h3>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Sync Notification */}
      {syncStatus && (
        <div className="sync-notification">
          {syncStatus === 'syncing' && (
            <>
              <span className="sync-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"></path>
                  <path d="M21 3v5h-5"></path>
                </svg>
              </span>
              Syncing your videos...
            </>
          )}
          {syncStatus === 'success' && (
            <>
              <span className="sync-icon success">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              </span>
              Videos synced successfully!
            </>
          )}
          {syncStatus === 'error' && (
            <>
              <span className="sync-icon error">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
              </span>
              Error syncing videos. Try again later.
            </>
          )}
        </div>
      )}
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App
