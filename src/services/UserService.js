import { db } from '../firebase';
import { doc, getDoc, setDoc, updateDoc, deleteField, collection } from 'firebase/firestore';

// Collection reference
const usersCollection = collection(db, 'users');

// Get all videos for a user
export const getUserVideos = async (userId) => {
  try {
    const userDocRef = doc(db, "users", userId);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      return userDoc.data().videos || {};
    }
    return {};
  } catch (error) {
    console.error("Error getting user videos:", error);
    throw error;
  }
};

// Save all videos for a user (overwrite entire videos object)
export const saveUserVideos = async (userId, videos) => {
  try {
    const userDocRef = doc(db, "users", userId);
    
    // Make sure timestamps exist for all videos for consistent ordering
    Object.keys(videos).forEach(key => {
      if (!videos[key].timestamp) {
        videos[key].timestamp = Date.now() - parseInt(key, 36) % 1000000;
      }
    });
    
    await setDoc(userDocRef, { videos }, { merge: true });
    return true;
  } catch (error) {
    console.error("Error saving user videos:", error);
    throw error;
  }
};

// Add a single video to Firebase
export const addVideo = async (userId, video) => {
  try {
    // Ensure video has timestamp for ordering
    if (!video.timestamp) {
      video.timestamp = Date.now();
    }
    
    const userDocRef = doc(db, "users", userId);
    await updateDoc(userDocRef, {
      [`videos.${video.uniqueId}`]: video
    });
    return true;
  } catch (error) {
    console.error("Error adding video:", error);
    throw error;
  }
};

// Remove a single video from Firebase
export const removeVideo = async (userId, videoUniqueId) => {
  try {
    const userDocRef = doc(db, "users", userId);
    await updateDoc(userDocRef, {
      [`videos.${videoUniqueId}`]: deleteField()
    });
    return true;
  } catch (error) {
    console.error("Error removing video:", error);
    throw error;
  }
};

// Update user profile information
export const updateUserProfile = async (userId, profileData) => {
  try {
    await updateDoc(doc(usersCollection, userId), {
      profile: profileData,
      lastUpdated: new Date()
    });
    return true;
  } catch (error) {
    console.error("Error updating profile:", error);
    return false;
  }
};