@echo off
echo ===================================
echo VocalGuard Advanced Features Test
echo ===================================
echo This script will test the advanced features of VocalGuard including:
echo  - Wav2Vec2 feature extraction
echo  - Embedding caching
echo  - Adaptive feature weighting

echo.
echo Testing Wav2Vec2 feature extraction...
python scripts/test_wav2vec2.py

echo.
echo Testing adaptive feature weighting...
python scripts/test_adaptive_weighting.py

echo.
echo ===================================
echo Tests complete!
echo ===================================
echo You can find the results in the "results" directory.
echo.
