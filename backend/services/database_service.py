import firebase_admin
from firebase_admin import firestore
from google.cloud.firestore_v1.base_query import FieldFilter
import uuid
import json
import datetime
from typing import Dict, List, Any, Optional

class DatabaseService:
    """Service for interacting with Firebase Firestore Database"""
    
    def __init__(self):
        """Initialize the database service"""
        # Get the Firestore client
        self.db = firestore.client()
        
    def create_audio_metadata(self, user_id: str, filename: str, file_size: int, 
                            duration: float, sample_rate: int, channels: int = 2, 
                            bit_depth: str = "16 bits", upload_timestamp: str = None) -> str:
        """
        Store metadata about an uploaded audio file
        
        Args:
            user_id: The ID of the user who uploaded the audio
            filename: The name of the uploaded file
            file_size: Size of the file in bytes
            duration: Duration of the audio in seconds
            sample_rate: Sample rate of the audio
            channels: Number of audio channels (default: 2)
            bit_depth: Bit depth of the audio (default: "16 bits")
            upload_timestamp: Custom timestamp (default: current time)
            
        Returns:
            str: ID of the created record
        """
        metadata_id = str(uuid.uuid4())
        
        # Use custom timestamp if provided, otherwise use current time
        timestamp = upload_timestamp if upload_timestamp else datetime.datetime.now().isoformat()
        
        metadata = {
            'id': metadata_id,
            'user_id': user_id,
            'filename': filename,
            'file_size': file_size,
            'duration': duration,
            'sample_rate': sample_rate,
            'channels': channels,
            'bit_depth': bit_depth,
            'upload_timestamp': timestamp,
        }
        # Push data to Firestore
        self.db.collection('audio_metadata').document(metadata_id).set(metadata)
        return metadata_id
    
    def create_analysis_result(self, metadata_id: str, is_deepfake: bool, 
                              confidence_score: float, features_used: List[str], 
                              analysis_timestamp: str = None) -> str:
        """
        Store the results of deepfake analysis
        
        Args:
            metadata_id: ID of the related audio metadata
            is_deepfake: Boolean indicating if the audio is a deepfake
            confidence_score: Confidence score of the prediction (0-1)
            features_used: List of features used in the analysis
            analysis_timestamp: Custom timestamp for analysis (default: current time)
            
        Returns:
            str: ID of the created analysis record
        """
        analysis_id = str(uuid.uuid4())
        
        # Use custom timestamp if provided, otherwise use current time
        timestamp = analysis_timestamp if analysis_timestamp else datetime.datetime.now().isoformat()
        
        analysis = {
            'id': analysis_id,
            'metadata_id': metadata_id,
            'is_deepfake': is_deepfake,
            'confidence_score': confidence_score,
            'features_used': features_used,
            'analysis_timestamp': timestamp,
        }
        
        # Push data to Firestore
        self.db.collection('analysis_results').document(analysis_id).set(analysis)
        
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
        
        # Push data to Firestore
        self.db.collection('result_details').document(details_id).set(details)
        
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
        metadata_query = self.db.collection('audio_metadata').where(filter=FieldFilter('user_id', '==', user_id)).stream()
        
        if not metadata_query:
            return []
            
        analyses = []
        
        # For each metadata, get the associated analysis
        for metadata_doc in metadata_query:
            metadata = metadata_doc.to_dict()
            metadata_id = metadata_doc.id
            
            # Query for analyses with this metadata_id
            analysis_query = self.db.collection('analysis_results').where(filter=FieldFilter('metadata_id', '==', metadata_id)).stream()
            
            for analysis_doc in analysis_query:
                analysis = analysis_doc.to_dict()
                analysis_id = analysis_doc.id
                
                # Merge metadata and analysis into one record
                analysis_with_metadata = {**metadata, **analysis}
                
                # Get details if available
                details_query = self.db.collection('result_details').where(filter=FieldFilter('analysis_id', '==', analysis_id)).limit(1).stream()
                for details_doc in details_query:
                    analysis_with_metadata['details'] = details_doc.to_dict()
                
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
        analysis_doc = self.db.collection('analysis_results').document(analysis_id).get()
        
        if not analysis_doc.exists:
            return None
            
        analysis = analysis_doc.to_dict()
        
        # Get the related metadata
        metadata_doc = self.db.collection('audio_metadata').document(analysis['metadata_id']).get()
        metadata = metadata_doc.to_dict() if metadata_doc.exists else None
        
        # Get the related details
        details_query = self.db.collection('result_details').where(filter=FieldFilter('analysis_id', '==', analysis_id)).limit(1).stream()
        details = None
        for details_doc in details_query:
            details = details_doc.to_dict()
        
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
            {"name": "audio_clip_10.wav", "size": 1245670, "duration": 15.3, "sample_rate": 44100, "date": "2025-02-07", "is_fake": False, "confidence": 0.97},
            {"name": "audio_clip_09.mp3", "size": 3456700, "duration": 32.4, "sample_rate": 48000, "date": "2025-02-01", "is_fake": True, "confidence": 0.75},
            {"name": "audio_clip_08.wav", "size": 567890, "duration": 24.8, "sample_rate": 44100, "date": "2025-01-30", "is_fake": False, "confidence": 1.0}
        ]
        
        for file in dummy_files:
            # Create metadata with specific upload date
            metadata_id = self.create_audio_metadata(
                user_id=user_id,
                filename=file["name"],
                file_size=file["size"],
                duration=file["duration"],
                sample_rate=file["sample_rate"],
                upload_timestamp=file["date"]            )
            
            # Create analysis result
            is_fake = file["is_fake"]
            confidence = file["confidence"]
            features = ["mfcc", "spectral_centroid", "zero_crossing_rate", "spectral_rolloff"]
            
            analysis_id = self.create_analysis_result(
                metadata_id=metadata_id,
                is_deepfake=is_fake,
                confidence_score=confidence,
                features_used=features,
                analysis_timestamp=file["date"]  # Use the same date for both metadata and analysis
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
    
    def delete_analysis(self, analysis_id: str) -> bool:
        """
        Delete an analysis and all related data (metadata and details)
        
        Args:
            analysis_id: ID of the analysis to delete
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            # First, get the analysis to determine the metadata ID
            analysis_doc = self.db.collection('analysis_results').document(analysis_id).get()
            
            if not analysis_doc.exists:
                return False
                
            analysis = analysis_doc.to_dict()
            metadata_id = analysis.get('metadata_id')
            
            # Delete related details
            details_query = self.db.collection('result_details').where(filter=FieldFilter('analysis_id', '==', analysis_id)).stream()
            for details_doc in details_query:
                details_doc.reference.delete()
            
            # Delete the analysis result
            self.db.collection('analysis_results').document(analysis_id).delete()
            
            # Check if there are any other analyses using this metadata
            other_analyses = list(self.db.collection('analysis_results').where(filter=FieldFilter('metadata_id', '==', metadata_id)).limit(1).stream())
              # If no other analyses reference this metadata, delete the metadata too
            if not other_analyses and metadata_id:
                self.db.collection('audio_metadata').document(metadata_id).delete()
            return True
            
        except Exception as e:
            print(f"Error deleting analysis: {str(e)}")
            return False
    
    def delete_multiple_analyses(self, analysis_ids: List[str]) -> Dict[str, bool]:
        """
        Delete multiple analyses and their related data
        
        Args:
            analysis_ids: List of analysis IDs to delete
            
        Returns:
            dict: Map of analysis ID to success/failure
        """
        results = {}
        
        for analysis_id in analysis_ids:
            results[analysis_id] = self.delete_analysis(analysis_id)
            
        return results
