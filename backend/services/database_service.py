import firebase_admin
from firebase_admin import db
import uuid
import json
import datetime
from typing import Dict, List, Any, Optional

class DatabaseService:
    """Service for interacting with Firebase Realtime Database"""
    
    def __init__(self):
        """Initialize the database service"""
        # Get the database reference
        self.db_ref = db.reference('/')
        
    def create_audio_metadata(self, user_id: str, filename: str, file_size: int, 
                             duration: float, sample_rate: int) -> str:
        """
        Store metadata about an uploaded audio file
        
        Args:
            user_id: The ID of the user who uploaded the audio
            filename: The name of the uploaded file
            file_size: Size of the file in bytes
            duration: Duration of the audio in seconds
            sample_rate: Sample rate of the audio
            
        Returns:
            str: ID of the created record
        """
        metadata_id = str(uuid.uuid4())
        
        metadata = {
            'id': metadata_id,
            'user_id': user_id,
            'filename': filename,
            'file_size': file_size,
            'duration': duration,
            'sample_rate': sample_rate,
            'upload_timestamp': datetime.datetime.now().isoformat(),
        }
        
        # Push data to Firebase
        self.db_ref.child('audio_metadata').child(metadata_id).set(metadata)
        
        return metadata_id
        
    def create_analysis_result(self, metadata_id: str, is_deepfake: bool, 
                              confidence_score: float, features_used: List[str]) -> str:
        """
        Store the results of deepfake analysis
        
        Args:
            metadata_id: ID of the related audio metadata
            is_deepfake: Boolean indicating if the audio is a deepfake
            confidence_score: Confidence score of the prediction (0-1)
            features_used: List of features used in the analysis
            
        Returns:
            str: ID of the created analysis record
        """
        analysis_id = str(uuid.uuid4())
        
        analysis = {
            'id': analysis_id,
            'metadata_id': metadata_id,
            'is_deepfake': is_deepfake,
            'confidence_score': confidence_score,
            'features_used': features_used,
            'analysis_timestamp': datetime.datetime.now().isoformat(),
        }
        
        # Push data to Firebase
        self.db_ref.child('analysis_results').child(analysis_id).set(analysis)
        
        return analysis_id
        
    def create_result_details(self, analysis_id: str, feature_scores: Dict[str, float], 
                             model_version: str, processing_time: float) -> str:
        """
        Store detailed information about the analysis
        
        Args:
            analysis_id: ID of the related analysis result
            feature_scores: Dictionary of individual feature scores
            model_version: Version of the ML model used
            processing_time: Time taken to process in milliseconds
            
        Returns:
            str: ID of the created details record
        """
        details_id = str(uuid.uuid4())
        
        details = {
            'id': details_id,
            'analysis_id': analysis_id,
            'feature_scores': feature_scores,
            'model_version': model_version,
            'processing_time': processing_time,
            'created_at': datetime.datetime.now().isoformat(),
        }
        
        # Push data to Firebase
        self.db_ref.child('result_details').child(details_id).set(details)
        
        return details_id
        
    def get_user_analyses(self, user_id: str) -> List[Dict[str, Any]]:
        """
        Get all analyses for a specific user
        
        Args:
            user_id: ID of the user
            
        Returns:
            List of analysis records
        """
        # First get metadata records for the user
        metadata_query = self.db_ref.child('audio_metadata').order_by_child('user_id').equal_to(user_id).get()
        
        if not metadata_query:
            return []
            
        analyses = []
        
        # For each metadata, get the associated analysis
        for metadata_id, metadata in metadata_query.items():
            # Query for analyses with this metadata_id
            analysis_query = self.db_ref.child('analysis_results').order_by_child('metadata_id').equal_to(metadata_id).get()
            
            if analysis_query:
                for analysis_id, analysis in analysis_query.items():
                    # Merge metadata and analysis into one record
                    analysis_with_metadata = {**metadata, **analysis}
                    
                    # Get details if available
                    details_query = self.db_ref.child('result_details').order_by_child('analysis_id').equal_to(analysis_id).get()
                    
                    if details_query:
                        # There should only be one details record per analysis
                        for _, details in details_query.items():
                            analysis_with_metadata['details'] = details
                    
                    analyses.append(analysis_with_metadata)
        
        return analyses
        
    def get_analysis(self, analysis_id: str) -> Optional[Dict[str, Any]]:
        """
        Get a specific analysis by ID with all related data
        
        Args:
            analysis_id: ID of the analysis to retrieve
            
        Returns:
            Analysis record with metadata and details
        """
        analysis = self.db_ref.child('analysis_results').child(analysis_id).get()
        
        if not analysis:
            return None
            
        # Get the related metadata
        metadata = self.db_ref.child('audio_metadata').child(analysis['metadata_id']).get()
        
        # Get the related details
        details_query = self.db_ref.child('result_details').order_by_child('analysis_id').equal_to(analysis_id).get()
        details = list(details_query.values())[0] if details_query else None
        
        # Combine all data
        return {
            **analysis,
            'metadata': metadata,
            'details': details
        }
        
    def create_dummy_data(self, user_id: str) -> List[str]:
        """
        Create dummy data for demonstration purposes
        
        Args:
            user_id: ID of the user to associate the dummy data with
            
        Returns:
            List of created analysis IDs
        """
        analysis_ids = []
        
        # Create dummy audio metadata
        dummy_files = [
            {"name": "speech_sample_1.wav", "size": 1245670, "duration": 12.5, "sample_rate": 44100},
            {"name": "interview_clip.mp3", "size": 3456700, "duration": 45.2, "sample_rate": 48000},
            {"name": "voice_message.m4a", "size": 567890, "duration": 8.7, "sample_rate": 22050},
            {"name": "podcast_segment.wav", "size": 7890123, "duration": 120.0, "sample_rate": 44100}
        ]
        
        for file in dummy_files:
            # Create metadata
            metadata_id = self.create_audio_metadata(
                user_id=user_id,
                filename=file["name"],
                file_size=file["size"],
                duration=file["duration"],
                sample_rate=file["sample_rate"]
            )
            
            # Create analysis result
            is_fake = file["name"] == "interview_clip.mp3" or file["name"] == "podcast_segment.wav"
            confidence = 0.95 if is_fake else 0.92
            features = ["mfcc", "spectral_centroid", "zero_crossing_rate", "spectral_rolloff"]
            
            analysis_id = self.create_analysis_result(
                metadata_id=metadata_id,
                is_deepfake=is_fake,
                confidence_score=confidence,
                features_used=features
            )
            
            # Create result details
            feature_scores = {
                "mfcc_score": 0.88 if is_fake else 0.12,
                "spectral_score": 0.92 if is_fake else 0.15,
                "temporal_score": 0.91 if is_fake else 0.08
            }
            
            self.create_result_details(
                analysis_id=analysis_id,
                feature_scores=feature_scores,
                model_version="v1.2.0",
                processing_time=1250.45
            )
            
            analysis_ids.append(analysis_id)
        
        return analysis_ids
